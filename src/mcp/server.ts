import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve, join, dirname } from "node:path";
import { homedir } from "node:os";
import { writeFileSync, mkdirSync } from "node:fs";
import {
  BRIDGE_DEFAULT_PORT,
  BRIDGE_HOST,
  ModeSchema,
  AspectRatioSchema,
  ImageModelSchema,
  MODE_LIMITS,
  maxReferences,
  type Job,
} from "../bridge/types.js";
import { startBridgeServer } from "../bridge/server.js";
import { getExt, listJobs, getJob, waitForJob, updateJob } from "../bridge/state.js";
import { logger } from "../utils/logger.js";
import { extractFrame, stitchVideos, getVideoDuration } from "../utils/video.js";

const CALL_BUDGET_MS = 45000;

async function ensureBridgeAlive(port = BRIDGE_DEFAULT_PORT): Promise<boolean> {
  try {
    const res = await fetch(`http://${BRIDGE_HOST}:${port}/health`, {
      signal: AbortSignal.timeout(1000),
    });
    if (res.ok) return true;
  } catch {}

  // If not alive, start in-process bridge server
  try {
    await startBridgeServer(port);
    return true;
  } catch (err) {
    logger.error("mcp", "Failed to start bridge server", err);
    return false;
  }
}

function formatJobReport(job: Job): { content: Array<{ type: "text"; text: string }> } {
  if (job.status === "done") {
    const warning = job.error ? `\nWarning: ${job.error}` : "";
    const filesList = job.files.length > 0
      ? job.files.map((f) => `• [${f.kind.toUpperCase()}] ${f.path}`).join("\n")
      : "No local files recorded (check browser downloads folder)";
    const retryNote = (job.attempts ?? 0) > 0 ? `\n(Completed after ${job.attempts} retry attempt(s))` : "";
    return {
      content: [
        {
          type: "text",
          text: `🎉 Generation complete!${retryNote}\n\nDownloaded Files:\n${filesList}${warning}`,
        },
      ],
    };
  }

  if (job.status === "failed" || job.status === "cancelled") {
    const attemptsInfo = `\nAttempts made: ${job.attempts ?? 0}/${job.maxRetries ?? 3}`;
    const retryTip = job.status === "failed" ? `\n\nTip: You can retry this job anytime using 'flow_retry_job' with job_id: "${job.id}".` : "";
    return {
      content: [
        {
          type: "text",
          text: `❌ Generation ${job.status}: ${job.error ?? "No error details available"}${
            job.stage ? ` (Stage reached: ${job.stage})` : ""
          }${attemptsInfo}${retryTip}`,
        },
      ],
    };
  }

  if (job.status === "queued" && (job.attempts ?? 0) > 0) {
    return {
      content: [
        {
          type: "text",
          text: `🔄 Generation re-queued for retry (Attempt ${job.attempts}/${job.maxRetries ?? 3}).\nPrevious message: ${job.error ?? "Transient failure"}\nJob ID: ${job.id}\n\nCall 'flow_get_job' with this job_id to check status or continue waiting.`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `⏳ Generation in progress (Stage: ${job.stage ?? "queued"}).\nJob ID: ${job.id}\n\nCall 'flow_get_job' with this job_id to check status or continue waiting.`,
      },
    ],
  };
}

export async function createMcpServer(): Promise<McpServer> {
  const server = new McpServer({
    name: "flow-mcp",
    version: "1.0.0",
  });

  // Ensure bridge is running
  await ensureBridgeAlive();

  // Tool 1: flow_generate
  server.tool(
    "flow_generate",
    "Generate bulk images or videos on Google Flow (flow.google.com) using your logged-in Google session without API costs. Supports Nano Banana Pro/2/Lite for images and Omni Flash / Veo 3.1 Lite/Fast/Quality for video.",
    {
      prompt: z.string().min(1).describe("The generation prompt (e.g. 'Cinematic drone shot of misty mountain peak at sunrise')"),
      mode: ModeSchema.default("flow-text-to-image").describe("Generation mode: flow-text-to-image, flow-image-to-image, flow-text-to-video, flow-frame-to-video, flow-ingredients-to-video, flow-video-to-video, flow-extend-video, flow-create-character"),
      image_paths: z.array(z.string()).default([]).describe("Direct image links (URLs) or local file paths of independent reference images (for image-to-image, frame-to-video, or ingredients)"),
      chain_from_video: z.string().optional().describe("Local file path to the preceding video clip. Automatically extracts its exact final frame and anchors it as the starting frame to preserve strict spatial, character action, and environmental continuity across clip boundaries."),
      aspect_ratio: AspectRatioSchema.default("16:9").describe("Aspect ratio: 16:9, 9:16, 1:1, 4:3, 3:4"),
      duration: z.enum(["4", "6", "8", "10"]).optional().describe("Video duration in seconds (4, 6, 8, 10). Default 6 for video."),
      image_model: ImageModelSchema.optional().describe("Model: nano-banana-pro, nano-banana-2, nano-banana-2-lite (image); omni-flash, veo-3.1-lite, veo-3.1-fast, veo-3.1-quality (video)"),
      outputs: z.number().int().min(1).max(12).default(1).describe("Number of variations (1-4 for Flow)"),
      folder: z.string().default("flow").describe("Subfolder under your Downloads directory where media is saved"),
      new_project: z.boolean().optional().describe("Start this generation in a brand-new Flow project"),
      character_name: z.string().optional().describe("Name of the character to create or reference"),
      character_refs: z.array(z.string()).optional().describe("Names of existing project characters to cast in this scene"),
      asset_refs: z.array(z.string()).optional().describe("Names of existing project media assets to use as ingredients"),
      max_retries: z.number().int().min(0).max(10).default(3).describe("Number of automatic retries if generation encounters a transient error (default: 3, set to 0 to disable)"),
      wait: z.boolean().default(true).describe("Whether to wait for completion (up to 45s) before returning"),
    },
    async (args) => {
      await ensureBridgeAlive();

      if (args.chain_from_video) {
        try {
          const finalFrame = await extractFrame(args.chain_from_video, { position: "last" });
          args.image_paths = [finalFrame, ...args.image_paths];
          if (args.mode === "flow-text-to-video") {
            args.mode = "flow-frame-to-video";
          }
          logger.info("mcp", `Chained continuity from ${args.chain_from_video} -> Anchor frame: ${finalFrame}`);
        } catch (chainErr: any) {
          return {
            content: [{ type: "text", text: `❌ Continuity chaining error: Could not extract anchor frame from "${args.chain_from_video}": ${chainErr.message}` }],
          };
        }
      }

      let isConnected = false;
      try {
        const statusRes = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/status?site=flow`, {
          signal: AbortSignal.timeout(3000),
        });
        if (statusRes.ok) {
          const status = (await statusRes.json()) as any;
          isConnected = status.extensionConnected === true;
        }
      } catch {}

      if (!isConnected) {
        const state = getExt("flow");
        isConnected = !!(state.ws && state.ws.readyState === 1);
      }

      if (!isConnected) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ Flow Connector extension is not connected.\n\nPlease ensure:\n1. Your browser has the Flow extension enabled.\n2. A tab with https://flow.google.com is OPEN and SIGNED IN.\n3. The Flow tab is VISIBLE on screen (not minimized or completely hidden behind other windows).\n\nOnce the Flow tab is visible, retry this command.`,
            },
          ],
        };
      }

      const limits = MODE_LIMITS[args.mode];
      const maxAllowed = maxReferences(args.mode, args.image_model);
      const totalRefs = args.image_paths.length + (args.asset_refs?.length ?? 0);

      if (totalRefs > maxAllowed) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${args.mode} allows at most ${maxAllowed} reference(s), but ${totalRefs} were supplied.`,
            },
          ],
        };
      }

      if (args.outputs > limits.maxOutputs) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${args.mode} allows at most ${limits.maxOutputs} output(s) per prompt.`,
            },
          ],
        };
      }

      // Submit via HTTP bridge
      try {
        const payload = {
          job: {
            prompt: args.prompt,
            mode: args.mode,
            params: {
              aspectRatio: args.aspect_ratio,
              videoOption: args.duration ? `${args.duration}s` : undefined,
              imageModel: args.image_model,
              outputsPerPrompt: args.outputs,
              downloadSubfolder: args.folder,
              autoRenameFiles: true,
              newProject: args.new_project,
              characterName: args.character_name,
              maxRetries: args.max_retries,
            },
            inputImages: [],
            assetRefs: args.asset_refs,
            characterRefs: args.character_refs,
          },
          imagePaths: args.image_paths.map((p) => (p.startsWith("http://") || p.startsWith("https://") ? p : resolve(p))),
          client: "flow-mcp",
          maxRetries: args.max_retries,
        };

        const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as { error?: string };
          return {
            content: [{ type: "text", text: `Failed to submit job: ${errData.error ?? "Unknown error"}` }],
          };
        }

        const { jobId } = (await res.json()) as { jobId: string };

        if (!args.wait) {
          return {
            content: [
              {
                type: "text",
                text: `Job submitted successfully with ID: ${jobId}. Call 'flow_get_job' with this ID to check results.`,
              },
            ],
          };
        }

        // Wait for job
        let job: Job | null = null;
        try {
          const waitRes = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs/${jobId}/wait?timeoutMs=${CALL_BUDGET_MS}`);
          if (waitRes.ok) {
            job = (await waitRes.json()) as Job;
          }
        } catch {}

        if (!job) {
          job = await waitForJob(jobId, CALL_BUDGET_MS);
        }

        if (!job) {
          return {
            content: [
              {
                type: "text",
                text: `Job ${jobId} was submitted but could not be retrieved.`,
              },
            ],
          };
        }

        return formatJobReport(job);
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Generation error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // Tool 2: flow_status
  server.tool(
    "flow_status",
    "Check connection and health status of Google Flow automation, including browser extension connection, logged in state, tab visibility, and active jobs.",
    {},
    async () => {
      await ensureBridgeAlive();
      try {
        const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/status?site=flow`);
        const data = await res.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error querying status: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // Tool 3: flow_get_job
  server.tool(
    "flow_get_job",
    "Wait for or check the current status of a generation job by its job_id. Returns downloaded file paths upon completion.",
    {
      job_id: z.string().describe("The job ID returned from flow_generate"),
      timeout_ms: z.number().int().min(1000).max(120000).default(40000).describe("Maximum time in ms to wait for completion before returning"),
    },
    async (args) => {
      await ensureBridgeAlive();
      let job: Job | null = null;
      try {
        const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs/${args.job_id}/wait?timeoutMs=${args.timeout_ms}`);
        if (res.ok) {
          job = (await res.json()) as Job;
        }
      } catch {}

      if (!job) {
        job = await waitForJob(args.job_id, args.timeout_ms);
      }

      if (!job) {
        return {
          content: [{ type: "text", text: `Job not found: ${args.job_id}` }],
        };
      }
      return formatJobReport(job);
    }
  );

  // Tool 4: flow_list_jobs
  server.tool(
    "flow_list_jobs",
    "List recent Google Flow generation jobs with their statuses and output file paths.",
    {
      limit: z.number().int().min(1).max(100).default(20).describe("Number of recent jobs to return"),
    },
    async (args) => {
      await ensureBridgeAlive();
      let allJobs: Job[] = [];
      try {
        const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs`);
        if (res.ok) {
          const data = (await res.json()) as { jobs: Job[] };
          allJobs = data.jobs || [];
        }
      } catch {}

      if (allJobs.length === 0) {
        allJobs = listJobs();
      }

      allJobs = allJobs.slice(0, args.limit);
      if (allJobs.length === 0) {
        return {
          content: [{ type: "text", text: "No generation jobs found in history." }],
        };
      }

      const formatted = allJobs.map((j) => {
        const time = new Date(j.createdAt).toLocaleTimeString();
        const files = j.files.map((f) => f.path).join(", ") || "none";
        const retryInfo = (j.attempts ?? 0) > 0 ? ` [Attempt ${j.attempts}/${j.maxRetries ?? 3}]` : "";
        return `[${time}] ID: ${j.id} | Status: ${j.status.toUpperCase()}${retryInfo} | Mode: ${j.mode} | Prompt: "${j.prompt.slice(0, 50)}..." | Files: ${files}`;
      });

      return {
        content: [{ type: "text", text: formatted.join("\n") }],
      };
    }
  );

  // Tool 5: flow_retry_job
  server.tool(
    "flow_retry_job",
    "Retry a failed or cancelled Google Flow generation job, or retry all failed jobs in the queue.",
    {
      job_id: z.string().optional().describe("The ID of the specific failed or cancelled job to retry. If omitted and retry_all is true, retries all failed jobs."),
      retry_all: z.boolean().default(false).describe("If true, retries all failed or cancelled jobs in the queue"),
      wait: z.boolean().default(true).describe("Whether to wait for completion (up to 45s) when retrying a single job before returning"),
    },
    async (args) => {
      await ensureBridgeAlive();

      if (!args.job_id && !args.retry_all) {
        return {
          content: [
            {
              type: "text",
              text: "Please provide either a 'job_id' to retry a specific job, or set 'retry_all: true' to retry all failed jobs.",
            },
          ],
        };
      }

      if (args.retry_all) {
        try {
          const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/queue/retry-failed?site=flow`, {
            method: "POST",
          });
          const data = (await res.json()) as {
            ok?: boolean;
            retriedCount?: number;
            dispatchedCount?: number;
            jobs?: Job[];
            error?: string;
          };

          if (!res.ok) {
            return {
              content: [{ type: "text", text: `Failed to retry jobs: ${data.error ?? res.statusText}` }],
            };
          }

          if ((data.retriedCount ?? 0) === 0) {
            return {
              content: [{ type: "text", text: "No failed or cancelled jobs found in queue to retry." }],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: `🔄 Successfully re-queued ${data.retriedCount} failed job(s) for retry (${data.dispatchedCount} dispatched to extension).`,
              },
            ],
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: `Error retrying failed jobs: ${err instanceof Error ? err.message : String(err)}` }],
          };
        }
      }

      // Single job retry
      const jobId = args.job_id!;
      try {
        const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs/${jobId}/retry`, {
          method: "POST",
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as { error?: string };
          return {
            content: [{ type: "text", text: `Failed to retry job ${jobId}: ${err.error ?? "Unknown error"}` }],
          };
        }

        if (!args.wait) {
          return {
            content: [
              {
                type: "text",
                text: `Job ${jobId} successfully re-queued for retry. Call 'flow_get_job' with this ID to check status.`,
              },
            ],
          };
        }

        // Wait for job
        let job: Job | null = null;
        try {
          const waitRes = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs/${jobId}/wait?timeoutMs=${CALL_BUDGET_MS}`);
          if (waitRes.ok) {
            job = (await waitRes.json()) as Job;
          }
        } catch {}

        if (!job) {
          job = await waitForJob(jobId, CALL_BUDGET_MS);
        }

        if (!job) {
          return {
            content: [{ type: "text", text: `Job ${jobId} was re-queued for retry, but could not retrieve final status.` }],
          };
        }

        return formatJobReport(job);
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error retrying job: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    }
  );

  // Tool 6: flow_cancel_job
  server.tool(
    "flow_cancel_job",
    "Cancel a pending or running generation job.",
    {
      job_id: z.string().describe("The job ID to cancel"),
    },
    async (args) => {
      await ensureBridgeAlive();
      try {
        const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs/${args.job_id}/cancel`, {
          method: "POST",
        });
        const data = await res.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error cancelling job: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    }
  );

  // Tool 6: flow_stop
  server.tool(
    "flow_stop",
    "Emergency stop: cancel all pending and running generations in Google Flow.",
    {},
    async () => {
      await ensureBridgeAlive();
      try {
        const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/stop?site=flow`, {
          method: "POST",
        });
        const data = await res.json();
        return {
          content: [{ type: "text", text: `Queue stopped successfully: ${JSON.stringify(data)}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error stopping queue: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    }
  );

  // Tool 7: flow_doctor
  server.tool(
    "flow_doctor",
    "Run diagnostics on the Flow MCP pipeline (bridge server, browser extension connection, Google Flow tab visibility).",
    {},
    async () => {
      const bridgeUp = await ensureBridgeAlive();
      let isConnected = false;
      let extVersion: string | null = null;
      let loggedIn: boolean | null = null;
      let grokVisible: boolean | null = null;
      let activeJobs = 0;

      try {
        const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/status?site=flow`);
        if (res.ok) {
          const status = (await res.json()) as any;
          isConnected = status.extensionConnected === true;
          extVersion = status.extensionVersion ?? null;
          loggedIn = status.loggedIn ?? null;
          grokVisible = status.grokVisible ?? null;
          activeJobs = status.activeJobs ?? 0;
        }
      } catch {}

      if (!isConnected) {
        const state = getExt("flow");
        isConnected = !!(state.ws && state.ws.readyState === 1);
        extVersion = state.extVersion;
        loggedIn = state.loggedIn;
        grokVisible = state.grokVisible;
        activeJobs = state.activeJobs;
      }

      const lines = [
        `Flow MCP Diagnostic Report`,
        `=========================`,
        `• Bridge Server: ${bridgeUp ? "✅ RUNNING (127.0.0.1:8791)" : "❌ DOWN"}`,
        `• Browser Extension: ${isConnected ? `✅ CONNECTED (v${extVersion ?? "unknown"})` : "❌ NOT CONNECTED"}`,
        `• Google Sign-in: ${loggedIn ? "✅ Logged In" : isConnected ? "❌ Not Logged In" : "❓ Unknown"}`,
        `• Tab Visibility: ${grokVisible ? "✅ Visible on screen" : isConnected ? "⚠️ HIDDEN or Minimized (bring Flow window to front!)" : "❓ Unknown"}`,
        `• Active Jobs: ${activeJobs}`,
        `• License/Plan: 🚀 100% Free Forever (No pricing, no paywalls, unlimited generations)`,
      ];

      if (!isConnected) {
        lines.push(
          "",
          "Fix for NOT CONNECTED:",
          "1. Open Chrome or Edge with the Flow extension installed.",
          "2. Navigate to https://flow.google.com and log in with your Google account.",
          "3. Keep the tab visible (side-by-side with your editor)."
        );
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
  );

  // Tool 9: flow_extract_frame
  server.tool(
    "flow_extract_frame",
    "Extract a high-resolution PNG frame from a generated video clip to anchor physical, character, and environmental continuity in subsequent clips.",
    {
      video_path: z.string().describe("Path to the video file (.mp4)"),
      position: z.enum(["last", "first", "timestamp"]).default("last").describe("Frame position: 'last' (default, perfect for chaining to next clip), 'first', or 'timestamp'"),
      timestamp_sec: z.number().min(0).optional().describe("Timestamp in seconds if position is 'timestamp'"),
      output_path: z.string().optional().describe("Custom output path for the PNG frame"),
    },
    async (args) => {
      try {
        const framePath = await extractFrame(args.video_path, {
          position: args.position,
          timestampSec: args.timestamp_sec,
          outputPath: args.output_path,
        });
        return {
          content: [
            {
              type: "text",
              text: `✅ Extracted ${args.position} frame successfully:\n• Frame Path: ${framePath}\n\nTip: Pass this frame into 'flow_generate' (image_paths: ["${framePath}"]) with mode 'flow-frame-to-video' to guarantee seamless continuity into your next scene.`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `❌ Frame extraction error: ${err.message}` }],
        };
      }
    }
  );

  // Tool 10: flow_stitch_video
  server.tool(
    "flow_stitch_video",
    "Stitch multiple sequential video clips into a single continuous film with seamless cut or smooth cinematic crossfade transitions.",
    {
      clip_paths: z.array(z.string()).min(1).describe("List of video file paths (.mp4) in chronological story order"),
      output_path: z.string().optional().describe("Destination path for the continuous master video (default: inside Downloads/flow/master_continuous.mp4)"),
      transition: z.enum(["cut", "crossfade"]).default("cut").describe("Transition type: 'cut' (instant seamless frame-matched cut) or 'crossfade' (smooth cinematic fade blend)"),
      crossfade_sec: z.number().min(0.1).max(2.0).default(0.5).describe("Duration of crossfade blend in seconds (if transition is 'crossfade')"),
    },
    async (args) => {
      try {
        const defaultOut = join(homedir(), "Downloads", "flow", `master_continuous_${Date.now()}.mp4`);
        const out = args.output_path ? resolve(args.output_path) : defaultOut;
        const resultPath = await stitchVideos(args.clip_paths, out, {
          transition: args.transition,
          crossfadeSec: args.crossfade_sec,
        });
        const duration = await getVideoDuration(resultPath);
        return {
          content: [
            {
              type: "text",
              text: `🎬 Continuous video assembled successfully!\n\n• Output File: ${resultPath}\n• Total Runtime: ${duration.toFixed(1)}s\n• Clips Stitched: ${args.clip_paths.length}\n• Transition: ${args.transition.toUpperCase()}\n\nClips:\n${args.clip_paths.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `❌ Video stitching error: ${err.message}` }],
        };
      }
    }
  );

  // Tool 11: flow_storyboard_plan
  server.tool(
    "flow_storyboard_plan",
    "Establish and validate a complete multi-clip story, scene continuity, character roster, and transition plan before generation to prevent character disappearance, scene teleportation, and action breaks.",
    {
      title: z.string().describe("Title of the video story or sequence"),
      logline: z.string().describe("1-2 sentence core narrative summary"),
      world_bible: z.object({
        setting: z.string().describe("Environment, architectural style, room layout, or landscape"),
        time_period: z.string().describe("Era or time of day (e.g. 'Late afternoon twilight, 2040 cyberpunk metropolis')"),
        visual_tone: z.string().describe("Cinematic aesthetic, color palette, camera lens feel"),
        lighting_rules: z.string().describe("Strict lighting direction and quality that must remain identical across connected clips"),
        invariants: z.array(z.string()).describe("Rules that must never be broken (e.g. 'Character B never leaves Screen-Right', 'Rain is constant', 'Character A holds the datapad with left hand')"),
      }),
      characters: z.array(
        z.object({
          name: z.string(),
          role: z.string().describe("Narrative role, e.g. 'Lead Protagonist', 'Skeptical Engineer', 'Helpful Guide'"),
          appearance: z.string().describe("Detailed visual locks: hair, face, body type, attire, distinctive props"),
          spatial_anchor: z.string().optional().describe("Default screen position: Screen-left, Screen-right, Center"),
          clothing_lock: z.string().optional().describe("Strict clothing description that must not drift between clips"),
        })
      ).min(1).describe("Main and supporting characters participating in the story"),
      scenes: z.array(
        z.object({
          clip_number: z.number().int().min(1),
          scene_title: z.string(),
          duration: z.enum(["4", "6", "8", "10"]).default("6"),
          environment: z.object({
            location: z.string(),
            lighting: z.string(),
            weather_or_atmosphere: z.string().optional(),
            key_objects: z.array(z.string()).default([]),
          }),
          characters_present: z.array(
            z.object({
              name: z.string(),
              position: z.string().describe("Screen position: Screen-left, Screen-right, Center, Background"),
              action: z.string().describe("Concrete ongoing action during this clip"),
              gaze_or_expression: z.string().describe("Facial expression and direction of gaze"),
            })
          ).min(1),
          ongoing_events: z.string().describe("Core story beats occurring in this clip"),
          camera_movement: z.string().describe("Concrete camera path and speed"),
          continuity_handoff: z.object({
            from_previous_clip: z.string().optional().describe("Action inertia and character pose carried over from the end of the previous clip"),
            to_next_clip: z.string().optional().describe("Final frame vector: exact character poses, hand positions, and camera direction passed to the next clip"),
          }),
        })
      ).min(1).describe("Chronological clip-by-clip scene beats"),
      output_file: z.string().optional().describe("Optional path to save the storyboard JSON/Markdown plan"),
    },
    async (args) => {
      const warnings: string[] = [];
      const characterNames = new Set(args.characters.map((c) => c.name.toLowerCase()));

      args.scenes.forEach((scene) => {
        scene.characters_present.forEach((cp) => {
          if (!characterNames.has(cp.name.toLowerCase())) {
            warnings.push(`Clip ${scene.clip_number} references character "${cp.name}" who is not defined in the character roster.`);
          }
        });
      });

      for (let i = 0; i < args.scenes.length - 1; i++) {
        const currentScene = args.scenes[i];
        const nextScene = args.scenes[i + 1];
        const currentChars = new Set(currentScene.characters_present.map((c) => c.name.toLowerCase()));
        const nextChars = new Set(nextScene.characters_present.map((c) => c.name.toLowerCase()));

        currentChars.forEach((cName) => {
          if (!nextChars.has(cName)) {
            const text = `${currentScene.ongoing_events} ${currentScene.continuity_handoff.to_next_clip ?? ""}`.toLowerCase();
            if (!text.includes("exit") && !text.includes("leave") && !text.includes("walks away") && !text.includes("departs")) {
              warnings.push(`⚠️ Continuity Warning: Character "${cName}" was in Clip ${currentScene.clip_number} but is absent in Clip ${nextScene.clip_number} without an explicit narrative exit.`);
            }
          }
        });

        if (!currentScene.continuity_handoff.to_next_clip && !nextScene.continuity_handoff.from_previous_clip) {
          warnings.push(`⚠️ Transition Gap: Clip ${currentScene.clip_number} -> Clip ${nextScene.clip_number} has no explicit boundary frame/action handoff defined.`);
        }
      }

      const generatedClipPlans = args.scenes.map((scene, idx) => {
        const isFirst = idx === 0;
        const prevClip = isFirst ? null : args.scenes[idx - 1];
        const charsInScene = scene.characters_present.map((cp) => {
          const charInfo = args.characters.find((c) => c.name.toLowerCase() === cp.name.toLowerCase());
          return `• ${cp.name} (${charInfo?.role ?? "character"}): positioned at ${cp.position}. Appearance: ${charInfo?.appearance ?? "standard"}. Action: ${cp.action}. Expression/Gaze: ${cp.gaze_or_expression}.`;
        }).join("\n  ");

        const prompt = [
          `[SCENE ${scene.clip_number}: ${scene.scene_title.toUpperCase()}]`,
          `[ENVIRONMENT]: ${scene.environment.location}. Lighting: ${scene.environment.lighting}.${scene.environment.weather_or_atmosphere ? ` Atmosphere: ${scene.environment.weather_or_atmosphere}.` : ""}`,
          `[CHARACTERS & SPATIAL POSITIONS]:\n  ${charsInScene}`,
          scene.continuity_handoff.from_previous_clip
            ? `[ACTION CONTINUATION FROM PREVIOUS FRAME]: Starting exactly from the boundary pose: ${scene.continuity_handoff.from_previous_clip}. Maintain momentum and physical inertia without resetting character positions.`
            : "",
          `[ONGOING BEATS & ACTION]: ${scene.ongoing_events}`,
          `[CAMERA]: ${scene.camera_movement}`,
          scene.continuity_handoff.to_next_clip
            ? `[ENDING FRAME VECTOR]: Final second ends on: ${scene.continuity_handoff.to_next_clip}.`
            : "",
          `[NEGATIVE GUARDS]: Strictly NO character morphing, NO character disappearing, NO teleporting limbs, NO random gradient background, NO dialogue text overlays, NO speech bubbles.`,
        ].filter(Boolean).join("\n");

        return {
          clipNumber: scene.clip_number,
          title: scene.scene_title,
          duration: scene.duration,
          recommendedMode: isFirst ? "flow-text-to-video" : "flow-frame-to-video",
          chainFromPrevious: isFirst ? null : `clip_${prevClip?.clip_number}.mp4`,
          prompt,
        };
      });

      const reportLines = [
        `📋 STORYBOARD & CONTINUITY MASTER PLAN: ${args.title.toUpperCase()}`,
        `============================================================`,
        `Logline: ${args.logline}`,
        `Setting: ${args.world_bible.setting} (${args.world_bible.time_period})`,
        `Visual Tone: ${args.world_bible.visual_tone}`,
        `Lighting Lock: ${args.world_bible.lighting_rules}`,
        "",
        `🎭 Character Roster (${args.characters.length}):`,
        ...args.characters.map((c) => `• ${c.name} [${c.role}]: ${c.appearance} (Anchor: ${c.spatial_anchor ?? "Flexible"})`),
        "",
        `🔒 Static Invariants:`,
        ...args.world_bible.invariants.map((inv) => `• ${inv}`),
        "",
        warnings.length > 0 ? `⚠️ Continuity Quality Audits (${warnings.length}):\n${warnings.map((w) => `  ${w}`).join("\n")}\n` : `✅ Continuity Quality Audit: Zero narrative gaps detected across clip boundaries.`,
        `🎬 Generation Sequence (${generatedClipPlans.length} Clips):`,
        ...generatedClipPlans.map((cp) => `
------------------------------------------------------------
🎞️ CLIP ${cp.clipNumber}: ${cp.title} (${cp.duration}s)
Recommended Mode: ${cp.recommendedMode}
${cp.chainFromPrevious ? `Continuity Chaining: Pass previous clip (${cp.chainFromPrevious}) into 'chain_from_video' parameter.` : "Starting Shot: Master scene establishing frame."}

PROMPT FOR FLOW GENERATE:
${cp.prompt}
------------------------------------------------------------`),
        "",
        `💡 Next Step Execution Workflow:`,
        `1. Generate Clip 1 with 'flow_generate'.`,
        `2. For Clip 2, pass 'chain_from_video: "<clip1_path>"' to automatically extract the final frame and lock physical positions.`,
        `3. For Clip 3, pass 'chain_from_video: "<clip2_path>"'.`,
        `4. Finally, call 'flow_stitch_video' with all clip paths to produce the continuous master film!`,
      ];

      const fullReport = reportLines.join("\n");

      if (args.output_file) {
        try {
          const absOut = resolve(args.output_file);
          mkdirSync(dirname(absOut), { recursive: true });
          writeFileSync(absOut, fullReport, "utf8");
          logger.info("mcp", `Saved storyboard plan to ${absOut}`);
        } catch {}
      }

      return {
        content: [{ type: "text", text: fullReport }],
      };
    }
  );

  return server;
}

export async function runStdioServer(): Promise<void> {
  process.env.MCP_STDIO = "1";
  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("mcp", "flow-mcp stdio server connected and listening for MCP client requests");
}
