import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { BRIDGE_DEFAULT_PORT, BRIDGE_HOST } from "../bridge/types.js";
import { startBridgeServer } from "../bridge/server.js";
import { runStdioServer } from "../mcp/server.js";
import { logger } from "../utils/logger.js";
import { extractFrame, stitchVideos, getVideoDuration } from "../utils/video.js";
export function createCli() {
    const program = new Command("flow-mcp");
    program
        .version("1.0.0")
        .description("Flow MCP — Model Context Protocol server and CLI for Google Flow bulk image and video generation");
    // Default action: run MCP stdio server if no subcommand given or if invoked by an AI coding agent
    program
        .command("mcp", { isDefault: true })
        .description("Start the Flow MCP server over stdio (default mode for AI coding agents)")
        .action(async () => {
        await runStdioServer();
    });
    // Bridge server command
    program
        .command("bridge")
        .description("Start the local HTTP & WebSocket bridge daemon for the browser extension")
        .option("-p, --port <number>", "Port to listen on", String(BRIDGE_DEFAULT_PORT))
        .action(async (options) => {
        const port = Number(options.port) || BRIDGE_DEFAULT_PORT;
        logger.info("cli", `Starting flow-mcp bridge on port ${port}...`);
        await startBridgeServer(port);
    });
    // Status command
    program
        .command("status")
        .description("Check the connection status of the bridge daemon and browser extension")
        .action(async () => {
        try {
            const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/status?site=flow`);
            if (!res.ok) {
                console.error(`Bridge server responded with HTTP ${res.status}`);
                process.exit(1);
            }
            const data = (await res.json());
            console.log("\n=== Flow MCP Bridge Status ===");
            console.log(`Bridge Server:       ${data.bridge === "up" ? "🟢 RUNNING (v" + (data.bridgeVersion ?? "1.0.0") + ")" : "🔴 DOWN"}`);
            console.log(`Browser Extension:   ${data.extensionConnected ? "🟢 CONNECTED" : "🔴 NOT CONNECTED"}`);
            console.log(`Extension Version:   ${data.extensionVersion || "unknown"}`);
            console.log(`Google Account:      ${data.loggedIn ? "🟢 Logged In" : "🔴 Not Logged In"}`);
            console.log(`Flow Window Tab:     ${data.grokVisible ? "🟢 Visible on screen" : "⚠️ HIDDEN / Minimized"}`);
            console.log(`Active Jobs:         ${data.activeJobs ?? 0}`);
            console.log(`License / Plan:     🟢 Free & Unlimited (No pricing, no paywalls)\n`);
        }
        catch {
            console.log("\n❌ Bridge server is not running on port " + BRIDGE_DEFAULT_PORT);
            console.log("Run 'flow-mcp bridge' to start it, or use the MCP server directly.\n");
        }
    });
    // Doctor command
    program
        .command("doctor")
        .description("Run end-to-end diagnostic checks on the Flow MCP automation stack")
        .action(async () => {
        console.log("\nRunning Flow MCP Doctor...\n");
        let bridgeRunning = false;
        let extConnected = false;
        let loggedIn = false;
        let tabVisible = false;
        try {
            const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/status?site=flow`, {
                signal: AbortSignal.timeout(1500),
            });
            if (res.ok) {
                bridgeRunning = true;
                const data = (await res.json());
                extConnected = !!data.extensionConnected;
                loggedIn = !!data.loggedIn;
                tabVisible = !!data.grokVisible;
            }
        }
        catch { }
        console.log(`1. Bridge Daemon:       ${bridgeRunning ? "✅ OK (Listening on 127.0.0.1:8791)" : "❌ FAILED (Not running)"}`);
        console.log(`2. Extension Bridge:    ${extConnected ? "✅ OK (Browser extension connected)" : "❌ FAILED (Extension not connected)"}`);
        console.log(`3. Google Flow Session: ${loggedIn ? "✅ OK (Google account logged in)" : "⚠️ Unknown or not logged in"}`);
        console.log(`4. Tab Visibility:      ${tabVisible ? "✅ OK (Flow tab is visible)" : "⚠️ Flow tab is hidden or minimized"}`);
        if (!bridgeRunning || !extConnected) {
            console.log("\nTroubleshooting:");
            if (!bridgeRunning) {
                console.log("• Run 'flow-mcp bridge' in a terminal to launch the bridge daemon.");
            }
            if (!extConnected) {
                console.log("• Open Chrome/Edge and ensure the Flow Connector extension is installed and enabled.");
                console.log("• Open https://flow.google.com and log in with your Google account.");
                console.log("• Keep the browser window visible on screen.");
            }
        }
        else {
            console.log("\n🎉 All systems operational! Ready to generate images and videos via Flow MCP.");
        }
        console.log("");
    });
    // Generate command
    program
        .command("generate <prompt>")
        .description("Submit a prompt to Google Flow for image or video generation")
        .option("-m, --mode <mode>", "Generation mode", "flow-text-to-image")
        .option("-i, --image <paths...>", "Paths to input images")
        .option("-c, --chain <videoPath>", "Chain from previous video clip (automatically extracts last frame as starting frame)")
        .option("-a, --aspect-ratio <ratio>", "Aspect ratio (16:9, 9:16, 1:1, 4:3, 3:4)", "16:9")
        .option("-d, --duration <seconds>", "Video duration (4, 6, 8, 10)", "6")
        .option("-o, --outputs <count>", "Outputs per prompt (1-4)", "1")
        .option("-f, --folder <name>", "Downloads subfolder", "flow")
        .option("-r, --max-retries <count>", "Automatic retries on failure (default: 3)", "3")
        .option("--new-project", "Create a fresh Flow project")
        .action(async (prompt, opts) => {
        try {
            let imageList = (opts.image ?? []).map((p) => p.startsWith("http://") || p.startsWith("https://") ? p : path.resolve(p));
            let mode = opts.mode;
            if (opts.chain) {
                console.log(`Extracting anchor frame from previous clip: ${opts.chain}...`);
                const finalFrame = await extractFrame(opts.chain, { position: "last" });
                imageList = [finalFrame, ...imageList];
                if (mode === "flow-text-to-video") {
                    mode = "flow-frame-to-video";
                }
                console.log(`Anchor frame extracted: ${finalFrame}`);
            }
            const payload = {
                job: {
                    prompt,
                    mode,
                    params: {
                        aspectRatio: opts.aspectRatio,
                        videoOption: `${opts.duration}s`,
                        outputsPerPrompt: Number(opts.outputs) || 1,
                        downloadSubfolder: opts.folder,
                        newProject: !!opts.newProject,
                        maxRetries: Number(opts.maxRetries) || 3,
                    },
                    inputImages: [],
                },
                imagePaths: imageList,
                client: "cli",
                maxRetries: Number(opts.maxRetries) || 3,
            };
            const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = (await res.json());
                console.error(`Submission failed: ${err.error ?? "Unknown error"}`);
                process.exit(1);
            }
            const { jobId } = (await res.json());
            console.log(`Job submitted! ID: ${jobId}`);
            console.log("Waiting for generation to finish...");
            const waitRes = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs/${jobId}/wait?timeoutMs=180000`);
            const job = (await waitRes.json());
            if (job.status === "done") {
                console.log(`\n🎉 Success! Generation complete.`);
                console.log(`Downloaded files:`);
                for (const f of job.files) {
                    console.log(`• ${f.path}`);
                }
            }
            else {
                console.log(`\nJob ended with status: ${job.status}`);
                if (job.error)
                    console.log(`Error: ${job.error}`);
            }
        }
        catch (err) {
            console.error("Error submitting job:", err);
        }
    });
    // Extract frame command
    program
        .command("extract-frame <video>")
        .description("Extract a keyframe (last frame by default) from a video to maintain scene continuity")
        .option("-p, --position <pos>", "Frame position: 'last', 'first', or 'timestamp'", "last")
        .option("-t, --timestamp <sec>", "Timestamp in seconds if position is 'timestamp'")
        .option("-o, --output <path>", "Destination PNG path")
        .action(async (video, opts) => {
        try {
            const framePath = await extractFrame(video, {
                position: opts.position,
                timestampSec: opts.timestamp ? Number(opts.timestamp) : undefined,
                outputPath: opts.output,
            });
            console.log(`✅ Extracted ${opts.position} frame: ${framePath}`);
        }
        catch (err) {
            console.error("Frame extraction failed:", err.message);
            process.exit(1);
        }
    });
    // Stitch command
    program
        .command("stitch <clips...>")
        .description("Stitch sequential video clips into a single continuous master video")
        .option("-o, --output <path>", "Destination MP4 path (default: Downloads/flow/master_continuous.mp4)")
        .option("-t, --transition <type>", "Transition type: 'cut' or 'crossfade'", "cut")
        .option("--crossfade-sec <sec>", "Crossfade duration in seconds (default: 0.5)", "0.5")
        .action(async (clips, opts) => {
        try {
            const defaultOut = path.join(os.homedir(), "Downloads", "flow", `master_continuous_${Date.now()}.mp4`);
            const out = opts.output ? path.resolve(opts.output) : defaultOut;
            console.log(`Stitching ${clips.length} clip(s) with ${opts.transition} transition...`);
            const resultPath = await stitchVideos(clips, out, {
                transition: opts.transition,
                crossfadeSec: Number(opts.crossfadeSec) || 0.5,
            });
            const duration = await getVideoDuration(resultPath);
            console.log(`\n🎬 Success! Continuous master video saved to:`);
            console.log(`• ${resultPath} (${duration.toFixed(1)}s total runtime)\n`);
        }
        catch (err) {
            console.error("Stitching failed:", err.message);
            process.exit(1);
        }
    });
    // Stop command
    program
        .command("stop")
        .description("Stop all pending and running generations")
        .action(async () => {
        try {
            const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/stop?site=flow`, {
                method: "POST",
            });
            const data = await res.json();
            console.log("Stopped queue:", data);
        }
        catch (err) {
            console.error("Failed to stop queue:", err);
        }
    });
    // List command
    program
        .command("list")
        .description("List recent generation jobs")
        .action(async () => {
        try {
            const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs`);
            const { jobs } = (await res.json());
            if (!jobs || jobs.length === 0) {
                console.log("No jobs found.");
                return;
            }
            for (const j of jobs.slice(0, 20)) {
                const retryNote = (j.attempts ?? 0) > 0 ? ` [Attempt ${j.attempts}/${j.maxRetries ?? 3}]` : "";
                console.log(`[${j.status.toUpperCase()}] ${j.id} (${j.mode})${retryNote} — "${j.prompt.slice(0, 50)}"`);
            }
        }
        catch (err) {
            console.error("Failed to list jobs:", err);
        }
    });
    // Retry command
    program
        .command("retry [jobId]")
        .description("Retry a failed or cancelled generation job, or retry all failed jobs")
        .option("-a, --all", "Retry all failed or cancelled jobs in the queue")
        .action(async (jobId, opts) => {
        try {
            if (opts.all || !jobId) {
                const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/queue/retry-failed?site=flow`, {
                    method: "POST",
                });
                const data = (await res.json());
                if (!res.ok) {
                    console.error(`Failed to retry jobs: ${data.error ?? res.statusText}`);
                    process.exit(1);
                }
                console.log(`\n🔄 Re-queued ${data.retriedCount ?? 0} failed job(s) for retry (${data.dispatchedCount ?? 0} dispatched).\n`);
                return;
            }
            const res = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs/${jobId}/retry`, {
                method: "POST",
            });
            const data = (await res.json());
            if (!res.ok) {
                console.error(`Failed to retry job ${jobId}: ${data.error ?? res.statusText}`);
                process.exit(1);
            }
            console.log(`\n🔄 Job ${jobId} re-queued for retry!`);
            console.log("Waiting for generation to finish...");
            const waitRes = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_DEFAULT_PORT}/jobs/${jobId}/wait?timeoutMs=180000`);
            const job = (await waitRes.json());
            if (job.status === "done") {
                console.log(`\n🎉 Success! Generation complete.`);
                console.log(`Downloaded files:`);
                for (const f of job.files) {
                    console.log(`• ${f.path}`);
                }
            }
            else {
                console.log(`\nJob ended with status: ${job.status}`);
                if (job.error)
                    console.log(`Error: ${job.error}`);
            }
        }
        catch (err) {
            console.error("Error retrying job:", err);
        }
    });
    // Skill command (for Claude Code / agent skill support)
    const skillCmd = program.command("skill").description("Manage coding agent skills");
    skillCmd
        .command("install [name]")
        .description("Install the flow-generate skill into Claude Code and agent directories")
        .action(async (name = "flow-generate") => {
        try {
            const home = os.homedir();
            const claudeSkillsDir = path.join(home, ".claude", "skills", name);
            fs.mkdirSync(claudeSkillsDir, { recursive: true });
            const skillPath = path.join(claudeSkillsDir, "SKILL.md");
            const content = `---
name: ${name}
description: Generate bulk images and videos on Google Flow (flow.google.com) using your logged-in Google session without API costs. Supports Nano Banana Pro/2/Lite for images and Omni Flash / Veo 3.1 Lite/Fast/Quality for video.
---

# Flow Generate

Generate high-quality images and videos using Google Flow with zero API costs through the local Flow MCP bridge.

## Prerequisites
1. Ensure the Flow MCP Bridge is active or the companion browser extension is connected to 127.0.0.1:8791.
2. Ensure https://flow.google.com is open, logged in with your Google account, and visible on screen (do not minimize).

## Available Modes
- flow-text-to-image: Generate images from text prompts (Nano Banana Pro / Nano Banana 2).
- flow-image-to-image: Generate image variations using reference images.
- flow-text-to-video: Generate cinematic videos from text (Omni Flash / Veo 3.1).
- flow-frame-to-video: Animate a starting reference image into a video.
- flow-ingredients-to-video: Combine multiple reference images into a video.
- flow-video-to-video: Restyle or transform an existing video.
- flow-extend-video: Extend an existing generated video clip.
- flow-create-character: Generate consistent character references.

## Usage with MCP
Call the flow_generate tool:
\`\`\`json
{
  "prompt": "Cinematic aerial view of futuristic cyberpunk city in neon rain",
  "mode": "flow-text-to-video",
  "aspect_ratio": "16:9",
  "duration": "6"
}
\`\`\`
`;
            fs.writeFileSync(skillPath, content, "utf8");
            console.log(`\n✅ Skill '${name}' installed successfully to:\n   ${skillPath}\n`);
        }
        catch (err) {
            console.error("Failed to install skill:", err);
        }
    });
    return program;
}
//# sourceMappingURL=commands.js.map