import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve } from "node:path";
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

  return server;
}

export async function runStdioServer(): Promise<void> {
  process.env.MCP_STDIO = "1";
  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("mcp", "flow-mcp stdio server connected and listening for MCP client requests");
}
