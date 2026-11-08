# Flow MCP (`flow-mcp`)

> **Model Context Protocol (MCP) Server & Automation Bridge for Google Flow**  
> Generate bulk images (Nano Banana Pro / 2 / Lite) and videos (Veo 3.1 Lite / Fast / Quality, Omni Flash) directly through your logged-in Google session.  
> **100% Free Forever — No Pricing, No Subscriptions, No Paywalls, No Daily Limits.**

---

## 🌟 Overview

`flow-mcp` is an open-source, production-ready Model Context Protocol (MCP) server, local bridge daemon, and CLI tool designed to connect AI coding agents (Claude Desktop, Cursor, Gemini, Codex, Windsurf, Antigravity) with **Google Flow** (`flow.google.com`).

By driving your logged-in browser session through trusted automation and network stream interception, `flow-mcp` allows agents to generate high-resolution images, video clips, extended scenes, and reusable characters with zero per-generation API costs.

---

## 🏗️ Architecture & System Design

`flow-mcp` is architected as a decoupled, four-tier automation bridge that connects AI coding assistants with Google Flow through your authenticated browser session.

### Architectural Diagram

```mermaid
flowchart TD
    subgraph Tier1["1. AI Agent (MCP Client)"]
        Agent["AI Assistant<br/>(Antigravity / Claude / Cursor / Windsurf)"]
    end

    subgraph Tier2["2. Local flow-mcp Daemon (127.0.0.1:8791)"]
        MCPServer["MCP Server<br/>(stdio JSON-RPC)"]
        Bridge["HTTP & WebSocket Bridge Daemon<br/>(127.0.0.1:8791)"]
        StateManager["Job Queue & State Store<br/>(~/.flow-mcp/jobs.json)"]
        FileServer["HTTP File Server<br/>(Input Image Tokens)"]
    end

    subgraph Tier3["3. Flow Connector Extension (Manifest V3)"]
        SW["Background Service Worker<br/>(ws://127.0.0.1:8791/ws)"]
        CDP["CDP Input Dispatcher<br/>(chrome.debugger trusted events)"]
        CS["Content Script<br/>(Resilient Multi-Strategy Selectors)"]
        Sniffer["Network Sniffer<br/>(MAIN World Fetch/XHR/WS Hooks)"]
        Downloader["Download Manager<br/>(chrome.downloads API)"]
    end

    subgraph Tier4["4. Google Flow Web Platform"]
        FlowWeb["Google Flow UI<br/>(flow.google.com)"]
        GoogleCloud["Google Generative AI Infrastructure<br/>(Nano Banana / Veo 3.1 / Omni Flash)"]
    end

    Agent <-->|stdio / JSON-RPC| MCPServer
    MCPServer <--> StateManager
    MCPServer <--> Bridge
    Bridge <-->|ws://127.0.0.1:8791/ws| SW
    FileServer -.->|Local HTTP Token URLs| FlowWeb

    SW <--> CDP
    SW <--> CS
    CS <-->|DOM Manipulation & Input| FlowWeb
    CDP -->|Trusted Pointer & Key Events| FlowWeb
    Sniffer -.->|Media Stream Interception| FlowWeb
    FlowWeb <--> GoogleCloud
    Sniffer -->|media-ready event| SW
    SW --> Downloader
    Downloader -->|Save to disk| Tier2
```

---

### Layer-by-Layer Breakdown

#### 1. AI Agent Layer (MCP Client)
- **Protocol**: Standard Model Context Protocol (MCP) over `stdio` using JSON-RPC 2.0.
- **Client Support**: Fully compatible with Antigravity, Claude Desktop / Claude Code, Cursor, Windsurf, Codex, Gemini, and any other MCP-compliant host.
- **Tools Provided**: `flow_generate`, `flow_status`, `flow_get_job`, `flow_list_jobs`, `flow_retry_job`, `flow_cancel_job`, `flow_stop`, and `flow_doctor`.

#### 2. Local Bridge Daemon & State Machine (`src/bridge/` & `src/mcp/`)
- **MCP Server (`src/mcp/server.ts`)**: Exposes structured schemas (via Zod) for prompts, models, aspect ratios, durations, reference files, and project assets. Enforces model reference caps (e.g. up to 10 reference images for image-to-image; up to 7 for Omni Flash ingredients).
- **HTTP/WS Daemon (`src/bridge/server.ts`)**: Runs a persistent HTTP and WebSocket server on `127.0.0.1:8791`. Automatically started in-process by the MCP server or run standalone via `flow-mcp bridge`.
- **State Store (`src/bridge/state.ts`)**: Persists job history and execution states to `~/.flow-mcp/jobs.json`. Reclaims orphaned jobs across server restarts and manages timeouts (45s per MCP call budget).
- **Local File Server (`src/utils/files.ts`)**: When input reference images are supplied, registers them as ephemeral local tokens (`http://127.0.0.1:8791/files/:token/:filename`) with a 2-hour TTL, allowing the extension to upload local files directly into Google Flow without disk copying or cloud uploading.

#### 3. Browser Extension (`extension/` - Manifest V3)
- **Background Service Worker (`service-worker-loader.js` / `assets/index.ts-DUSFifLU.js`)**: Connects bidirectionally to `ws://127.0.0.1:8791/ws`, handles incoming `job.submit` commands, verifies tab visibility, tracks queue state, and manages extension lifecycle. Unlocked for unlimited generation and upscaling.
- **CDP Input Dispatcher (`chrome.debugger`)**: Attaches Chrome DevTools Protocol to the Flow tab to dispatch trusted, natural mouse (`Input.dispatchMouseEvent`) and keyboard interactions. This prevents the browser or web apps from blocking synthetic JavaScript events.
- **Resilient Content Script (`assets/index.ts--a0w5aTj.js`)**: Injected into `flow.google.com`. Features a multi-tiered fallback selector engine (CSS, ARIA labels, text content, and TestIDs) that dynamically finds prompt inputs, aspect ratio toggles, duration selectors, and generation buttons even if Google changes class names.
- **MAIN-World Network Sniffer (`assets/result-capture-flow.ts-Cu6ONkqg.js`)**: Injected at `document_start` into the page's `MAIN` execution context (`world: "MAIN"`). It wraps `window.fetch`, `XMLHttpRequest.prototype`, and `WebSocket` to intercept internal Google Flow responses (`flow-content.google`, `/media.getMediaUrlRedirect`) and file picker events without relying on fragile DOM scraping.
- **Download Automation (`chrome.downloads`)**: Automatically downloads finalized images (`.png`) and videos (`.mp4`) into the specified destination folder (defaulting to `Downloads/flow/`), supporting 2K image and 1080p video upscales.

#### 4. Google Flow (`flow.google.com`)
- The active web session where you are authenticated with your Google account.
- Directly invokes Google's frontier multimodal generation models:
  - **Images**: Nano Banana Pro, Nano Banana 2, Nano Banana 2 Lite.
  - **Videos**: Veo 3.1 Lite, Veo 3.1 Fast, Veo 3.1 Quality, and Omni Flash.

---

### Step-by-Step Execution Lifecycle

1. **Agent Invocation**: The AI agent calls `flow_generate` with a prompt, desired mode (e.g., `flow-text-to-video`), model (`veo-3.1-quality`), aspect ratio (`16:9`), and duration (`6s`).
2. **Registration & Queuing**: The MCP bridge assigns a unique UUID, maps any local reference images to token URLs, adds the job to `~/.flow-mcp/jobs.json`, and sends a `job.submit` WebSocket message to the browser extension.
3. **Tab Focus & DOM Setup**: The extension verifies the [flow.google.com](https://flow.google.com) tab is active, focuses the prompt box, types the prompt, selects the model, duration, and aspect ratio.
4. **Trusted Trigger**: The background service worker attaches `chrome.debugger` to fire authentic pointer down/up/click events on the Generate button.
5. **Stream Capture**: While Google processes the request, the injected `MAIN`-world network sniffer intercepts outgoing RPC requests and incoming media redirects (`flow-content.google`).
6. **Local Download**: As soon as media streams are ready, the extension downloads the media files to the user's local disk via `chrome.downloads`.
7. **Callback & Completion**: The extension sends a `job.result` message containing the local file paths back over the WebSocket bridge. The bridge updates the job record to `done` and the MCP tool returns the absolute file paths to the agent.

---

### Key Architectural Advantages

- **100% Free Forever**: Operates directly through your personal logged-in browser session; no paid API keys, credits, or third-party subscriptions required.
- **No Daily Generation Caps**: Unlocks bulk and continuous generation without artificial daily caps.
- **Zero-Trust Privacy**: Bridge communication is strictly confined to `127.0.0.1` loopback. No prompt data, tokens, or media ever touch third-party servers.
- **Anti-Detection & High Reliability**: Employs real Chrome DevTools Protocol (CDP) trusted input dispatching and network-level stream sniffing instead of brittle DOM scraping.

---

## 🚀 Step-by-Step Manual Installation

### 1. Build and Link CLI
```bash
# Clone the repository (if not already local)
git clone https://github.com/nirajan-khatiwada/GoogleFlowConnecterMcp.git
cd GoogleFlowConnecterMcp/flow-mcp

# Install dependencies and compile TypeScript
npm install
npm run build

# Link globally so 'flow-mcp' is available anywhere on your machine
npm link
```

### 2. Browser Extension Setup
1. Open your browser (`chrome://extensions` or `edge://extensions`).
2. Toggle on **Developer mode** in the top right.
3. Click **Load unpacked** and select the folder:
   `flow-mcp/extension` (or full path `c:\Users\Nirajan\Downloads\video\flow-mcp\extension`).
4. Open [https://flow.google.com](https://flow.google.com) and log in with your Google account.
5. Keep the Flow tab visible on your screen (side-by-side with your editor, not minimized).

### 3. Agent Configuration (MCP)
Add to your user-level MCP configuration (`~/.cursor/mcp.json`, `~/.claude.json`, `~/.gemini/config/mcp_config.json`, `~/.codeium/windsurf/mcp_config.json`, etc.):

```json
{
  "mcpServers": {
    "flow-connector": {
      "command": "flow-mcp"
    }
  }
}
```

*(Note: If `flow-mcp` is not in your system PATH, you can point directly to the built file):*
```json
{
  "mcpServers": {
    "flow-connector": {
      "command": "node",
      "args": ["c:/Users/Nirajan/Downloads/video/flow-mcp/dist/index.js"]
    }
  }
}
```

### 4. Installing the Agent Skill Manually (Recommended)

To make your AI agent significantly more effective at choosing the right model (`veo-3.1-quality` vs `nano-banana-pro`), camera movement prompts, aspect ratios, and reference image workflows, manually install the included `flow-generate` skill:

#### For Claude Code:
Create the destination folder and copy the skill file:
```bash
# Windows (PowerShell)
mkdir -Force "$env:USERPROFILE\.claude\skills\flow-generate"
cp skills/flow-generate/SKILL.md "$env:USERPROFILE\.claude\skills\flow-generate\SKILL.md"

# macOS / Linux (Bash)
mkdir -p ~/.claude/skills/flow-generate
cp skills/flow-generate/SKILL.md ~/.claude/skills/flow-generate/SKILL.md
```

#### For Antigravity / Gemini:
```bash
# Windows (PowerShell)
mkdir -Force "$env:USERPROFILE\.gemini\config\skills\flow-generate"
cp skills/flow-generate/SKILL.md "$env:USERPROFILE\.gemini\config\skills\flow-generate\SKILL.md"

# macOS / Linux (Bash)
mkdir -p ~/.gemini/config/skills/flow-generate
cp skills/flow-generate/SKILL.md ~/.gemini/config/skills/flow-generate/SKILL.md
```

#### For Cursor:
Copy `skills/flow-generate/SKILL.md` into your project's `.cursor/rules/flow-generate.mdc` or add to your global user rules.

#### For Windsurf / Cascade:
Copy or link `skills/flow-generate/SKILL.md` into your `.windsurfrules` or global memories.

---

## 🤖 One-Time Setup Prompt for AI Agents

This setup needs to be done once per machine. If using an AI agent (Claude Code, Cursor, Antigravity, Windsurf, Codex), you can simply paste this exact prompt:

```text
Set up Flow Connector on my machine so you can generate images and videos through my own logged-in Google Flow session (no API cost).

This is safe to run even if it's already set up — check each step first and skip anything already done. Never force or reinstall something that's already working.

1. Is the CLI already installed? Run:
     flow-mcp --version
   - If it prints a version, it's installed — SKIP to step 5.
   - If the command is not found, carry on with step 2.

2. Work out which machine this is, once, and use only that section from here on.
     WINDOWS   PowerShell / cmd, paths like C:\Users\...
     macOS     uname -s prints Darwin
     LINUX     uname -s prints Linux

3. Node.js 20 or newer. Run:
     node --version

4. Install/Link the Flow MCP CLI globally:
     npm install
     npm run build
     npm link
   This makes `flow-mcp` globally executable across all terminals.

5. Connect Flow MCP to Antigravity in your user-level MCP configuration (`~/.gemini/config/mcp_config.json`):
```json
{
  "mcpServers": {
    "flow-connector": {
      "command": "flow-mcp"
    }
  }
}
```

6. Install companion skills into your Antigravity skills directory (`~/.gemini/config/skills/`):
   - **`flow-generate`** (Bulk Image & Video Generation):  
     `~/.gemini/config/skills/flow-generate/SKILL.md`

7. Check the connection:
```bash
flow-mcp status
```
   - If extension is connected and flow tab is visible:
     "Connected! I can generate images and videos on Google Flow now — just ask."
   - If flow tab is HIDDEN: bring the Flow window to the front.

---

## 🧩 Available Plugins & Skills

- **Flow Generator (`flow-generate`)**
  - **Overview**: The core bulk media generation skill for Google Flow. Generates bulk images (Nano Banana Pro / 2 / Lite) and videos (Veo 3.1 Quality / Fast / Lite, Omni Flash) directly through your logged-in Google session.
  - 📖 **Details & Usage**: [skills/flow-generate/SKILL.md](skills/flow-generate/SKILL.md)

---

## 🎯 Curated Zero-Mess Prompts (Veo 3.1 · Nano Banana Pro · Omni Flash)

Diffusion video and image models can generate messy artifacts (morphing limbs, blurry textures, hallucinated text, and unwanted speech bubbles) if prompts lack strict negative constraints and concrete physical anchors.

Use these curated, battle-tested prompt designs for **Veo 3.1**, **Nano Banana Pro**, and **Omni Flash** to guarantee clean, professional, broadcast-grade output every single time.

### 1. 🎬 Veo 3.1 Quality (`veo-3.1-quality`) — Text-to-Video
> **Best For**: 1080p cinematic video clips (4s, 6s, 8s, 10s), fluid physics, natural lighting, and sweeping camera tracking with zero input images.

#### The Anti-Mess Prompt Architecture:
```text
[SPEC]: 6-second video, 16:9 widescreen, 1080p, 24fps, fluid cinematic motion physics.
[ENVIRONMENT]: High-key modern white studio with subtle light-gray perspective floor grid. Clean negative space, zero background clutter, zero random gradients.
[CHARACTER ANCHOR]: A confident tech innovator in a minimalist navy jacket and dark denim. Proportions and features remain strictly consistent throughout the scene.
[TIMED BEATS]:
- [0-2s]: The character walks briskly from screen-left into center frame, looking forward with confident posture.
- [2-4s]: The character halts, turns slightly towards the camera, and taps a floating cyan holographic interface card that expands smoothly.
- [4-6s]: The character gives an enthusiastic presentation gesture, smiling confidently as the camera pushes in slightly.
[CAMERA]: Smooth lateral tracking shot moving left-to-right at constant medium velocity, keeping the character centered.
[AUDIO & DIALOGUE LOCK]: Audio voiceover only, strictly no speech bubbles, no dialogue text boxes. Narration: "Stop building features nobody asked for."
[NEGATIVE CONSTRAINTS]: Strictly NO on-screen text, no speech bubbles, no dialogue boxes, no morphing limbs, no melting hands, no extra fingers, no pixelated artifacts, no watermark.
```

#### Example Flow MCP Tool Call:
```typescript
call_mcp_tool({
  ServerName: "flow-connector",
  ToolName: "flow_generate",
  Arguments: {
    mode: "flow-text-to-video",
    prompt: "Cinematic 2D/3D character in navy jacket walking across clean pure-white modern studio with faint floor perspective grid. [0-2s] Walks from left to center. [2-4s] Taps floating glowing cyan holographic card. [4-6s] Gives an energetic presentation gesture to camera. Smooth lateral tracking camera. Audio voiceover only, strictly no speech bubbles: 'Stop building features nobody asked for.' Upbeat modern synthesizer. STRICTLY NO ON-SCREEN TEXT, NO SPEECH BUBBLES, NO MORPHING LIMBS.",
    image_model: "veo-3.1-quality",
    aspect_ratio: "16:9",
    duration: "6",
    outputs: 1
  }
});
```

---

### 2. ⚡ Veo 3.1 Fast (`veo-3.1-fast`) — Dynamic Image/Frame-to-Video
> **Best For**: High-speed action, rapid motion iteration, camera zooms, and frame-locked clips using up to 3 starting reference images.

#### The Anti-Mess Prompt Architecture:
```text
[SPEC]: 6-second video, 16:9 widescreen, fast dynamic pacing, 24fps.
[FRAME LOCK]: Start exactly from the character pose in Reference 1. Maintain identical line weight, proportions, and clothing colors.
[KINETIC ACTION]:
- [0-2s]: From the locked starting pose, the character sprints rapidly towards screen-right across a dark cinematic studio floor.
- [2-4s]: The character leaps cleanly over a glowing neon red obstacle line, landing in a heroic three-point stance.
- [4-6s]: The character stands up, dusts off hands, and glances back with an expressive confident smile.
[CAMERA]: High-speed dynamic tracking camera matching the character's sprint velocity with cinematic motion blur on the background only.
[NEGATIVE CONSTRAINTS]: Strictly no character morphing, no extra legs, no distorted torso, no speech bubbles, no text captions in video frame, no watermark.
```

---

### 3. 🍌 Nano Banana Pro (`nano-banana-pro`) — Text/Image-to-Image
> **Best For**: High-resolution character model turnaround sheets (front/side/back), vector-clean scene illustrations, and standalone asset generation.

#### The Anti-Mess Character Turnaround Sheet Formula:
```text
Model character turnaround sheet of an animated character. Three full-body poses side-by-side on a single horizontal row: front view, three-quarter view, and side profile view. 
Design: Clean expressive character with distinct silhouette, wearing a modern navy jacket and white sneakers. Uniform proportions across all views.
Canvas: Digitally pure solid white background (#FFFFFF), zero gradients, zero shadows, zero paper texture, zero noise. Clean vector line art, crisp silhouette, suitable for sprite extraction.
Negative constraints: No realistic photo skin, no gradients, no shadows, no color bleed, no text, no labels, no watermark.
```

#### The Anti-Mess Scene Prop Formula:
```text
Minimalist black ink line drawing on pure solid white background (#FFFFFF). Hand-drawn sketch of an antique brass balance scale with two weighing pans. Organic pen line art with selective warm golden accent marker. Flat 2D vector graphic, crisp clean edges, zero drop shadows, zero gradients, zero background elements, zero text.
```

---

### 4. 🔮 Omni Flash (`omni-flash`) — Multi-Ingredient Video
> **Best For**: Locking character face, outfit, and prop likeness across multiple scenes by attaching up to 7 reference images.

#### The Anti-Mess Prompt Architecture:
```text
[SPEC]: 6-second video, 16:9 widescreen, 1080p, 24fps.
[INGREDIENT MAPPING]:
- Character: Use the exact character from Reference 1 (navy jacket, proportions). Do NOT alter facial style or clothing.
- Prop: Feature the antique balance scale from Reference 2 on the wooden table.
[ACTION BEATS]:
- [0-3s]: The character from Reference 1 leans over the table, carefully placing objects into the balance scale from Reference 2.
- [3-6s]: The scale balances evenly; the character smiles with satisfaction and looks up towards the viewer.
[ENVIRONMENT]: Warm minimalist studio with soft daylight illumination.
[AUDIO & DIALOGUE LOCK]: Audio voiceover only, strictly no speech bubbles: "A fair trade built on trust."
[NEGATIVE CONSTRAINTS]: Strictly lock likeness to Reference 1, no costume changes, no facial distortion, no extra limbs, strictly no on-screen text, no speech bubbles, no watermark.
```

#### Example Flow MCP Tool Call:
```typescript
call_mcp_tool({
  ServerName: "flow-connector",
  ToolName: "flow_generate",
  Arguments: {
    mode: "flow-ingredients-to-video",
    prompt: "The character from Reference 1 interacts with the balance scale from Reference 2. [0-3s] Places items into scale. [3-6s] Scale balances evenly, character smiles. Exact likeness to Reference 1, no costume changes. Audio voiceover only, strictly no speech bubbles: 'A fair trade built on trust.' STRICTLY NO ON-SCREEN TEXT.",
    image_paths: [
      "c:/projects/my-video/assets/character_sheet.png",
      "c:/projects/my-video/assets/balance_scale.png"
    ],
    image_model: "omni-flash",
    aspect_ratio: "16:9",
    duration: "6"
  }
});
```

---

## 🛠️ MCP Tools Reference

`flow-mcp` registers the following standard tools:

### `flow_generate`
Generates images or videos with Google Flow.

| Argument | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `prompt` | `string` | *(Required)* | Prompt describing the desired generation |
| `mode` | `enum` | `flow-text-to-image` | `flow-text-to-image`, `flow-image-to-image`, `flow-text-to-video`, `flow-frame-to-video`, `flow-ingredients-to-video`, `flow-video-to-video`, `flow-extend-video`, `flow-create-character`, `flow-set-voice` |
| `image_paths` | `string[]` | `[]` | Absolute file paths to reference images on disk |
| `aspect_ratio` | `enum` | `16:9` | `16:9`, `9:16`, `1:1`, `2:3`, `3:2`, `4:3`, `3:4` |
| `duration` | `enum` | `6` | Video length: `4`, `6`, `8`, `10` seconds |
| `image_model` | `enum` | auto | Images: `nano-banana-pro`, `nano-banana-2`, `nano-banana-2-lite`<br>Videos: `omni-flash`, `veo-3.1-lite`, `veo-3.1-fast`, `veo-3.1-quality` |
| `outputs` | `number` | `1` | Variations per prompt (1 to 4) |
| `folder` | `string` | `flow` | Subfolder under your Downloads directory |
| `new_project` | `boolean` | `false` | Start generation in a brand new Flow project |
| `character_name` | `string` | optional | Name of character to create or reference |
| `character_refs`| `string[]` | optional | Cast reusable project characters in this scene |
| `asset_refs` | `string[]` | optional | Reuse existing project assets as ingredients |
| `wait` | `boolean` | `true` | Wait for completion (up to 45s) before returning |

### `flow_status`
Reports live status of the bridge daemon, browser extension, Google sign-in state, tab visibility, and active jobs.

### `flow_get_job`
Polls or waits for a running job by its `job_id`. Returns local paths of downloaded media upon completion.

### `flow_list_jobs`
Lists recent generation jobs, prompts, statuses, retry attempts, and file locations.

### `flow_retry_job`
Retries a failed or cancelled generation job (via `job_id`), or batch-retries all failed jobs (`retry_all: true`). Preserves all uploaded input images and tokens, re-queues them into the active bridge dispatcher, and optionally waits for completion.

### `flow_cancel_job`
Cancels a specific pending or running job.

### `flow_stop`
Emergency stop: immediately halts queue and cancels all pending/running jobs.

### `flow_doctor`
Performs end-to-end diagnostic checks on Node, port 8791, extension connection, and Google tab readiness.

---

## 💻 CLI Commands

You can also use `flow-mcp` directly from your command line:

```bash
# Check status of extension connection
flow-mcp status

# Run system diagnostics
flow-mcp doctor

# Generate an image from prompt
flow-mcp generate "Cyberpunk samurai standing in rain at dusk, neon reflections" --aspect-ratio 16:9

# Generate a video with Veo
flow-mcp generate "Hyperlapse of clouds passing over snowcapped mountains" --mode flow-text-to-video --duration 6

# List recent jobs (with attempt counts)
flow-mcp list

# Retry a specific failed job
flow-mcp retry <job-id>

# Retry all failed jobs in queue
flow-mcp retry --all

# Stop all active generation
flow-mcp stop
```

---

## 📋 Generation Modes

- **`flow-text-to-image`**: Fast text-to-image with Nano Banana Pro/2/Lite.
- **`flow-image-to-image`**: Image-guided generation taking up to 10 input reference images.
- **`flow-text-to-video`**: Text-to-video with Veo 3.1 and Omni Flash.
- **`flow-frame-to-video`**: First and last frame video interpolation (2 reference frames).
- **`flow-ingredients-to-video`**: Multi-asset video composition (up to 7 references).
- **`flow-video-to-video`**: Video stylization and transformation.
- **`flow-extend-video`**: Lengthen an existing Veo clip (+6s per extension).
- **`flow-create-character`**: Generates and registers a consistent character into the project.

---

## 🔒 Security & Privacy

- All bridge traffic is bound exclusively to `127.0.0.1:8791`.
- Input image tokens expire after 2 hours and are served only to local loopback.
- No personal data, session tokens, or API keys are ever transmitted externally.
