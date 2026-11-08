---
name: flow-generate
description: Generate bulk images (Nano Banana Pro / 2 / Lite) and videos (Veo 3.1 Quality / Fast / Lite, Omni Flash) directly on Google Flow (flow.google.com) with zero API costs using your logged-in Google session.
---

# Flow Generate Skill

This skill guides AI coding agents to produce high-resolution imagery and cinematic video generations through **Google Flow** using the local `flow-mcp` automation bridge.

---

## 🎯 When to Use This Skill

Activate this skill when the user asks to:
- Generate pictures, concept art, backgrounds, textures, or marketing banners.
- Generate cinematic video clips, camera motion shots, animated scenes, or b-roll footage.
- Animate a static image into a video (frame-to-video).
- Create consistent character designs and reuse them across multiple scenes.
- Extend existing video clips to build longer story sequences.
- Transform, restyle, or blend multiple image ingredients into a coherent video.

---

## ⚙️ Prerequisites & Operational Rules

1. **Active Bridge**: The `flow-mcp` bridge daemon must be running (listens on `127.0.0.1:8791`).
2. **Open & Logged-In Flow Tab**: The user must have [https://flow.google.com](https://flow.google.com) open and logged into their Google account in Chrome or Edge with the Flow Connector extension enabled.
3. **Tab Visibility**: The Flow tab must be **visible on screen** (side-by-side or on a secondary display). Chromium throttles background tabs, which stalls generation if minimized.
4. **Verify First**: If uncertain about connectivity, call `flow_status` or `flow_doctor` before firing large batch generations.

---

## 🚀 Model Selection Guide

### 🖼️ Image Models (`image_model`)
| Model | Strengths | Best Used For |
| :--- | :--- | :--- |
| `nano-banana-pro` | Maximum realism, fine textures, lighting accuracy, complex prompt adherence | Cinematic stills, character portraits, landscape art |
| `nano-banana-2` | Balanced detail with faster inference | General concept art, UI assets, rapid iteration |
| `nano-banana-2-lite` | Ultra-fast generation, lightweight rendering | Thumbnails, draft mockups, bulk exploration |

### 🎥 Video Models (`image_model`)
| Model | Max References | Best Used For |
| :--- | :--- | :--- |
| `veo-3.1-quality` | 0 input images | Highest fidelity 1080p, natural physics, fluid cinematic lighting |
| `veo-3.1-fast` | Up to 3 references | High-speed video rendering with strong camera movement |
| `veo-3.1-lite` | Up to 3 references | Rapid video drafting and motion checks |
| `omni-flash` | Up to 7 references | Multi-ingredient video composition and complex asset blending |

---

## 📐 Aspect Ratios & Durations

- **Aspect Ratios**:
  - `16:9` — Standard widescreen (YouTube, desktop presentations, film frames)
  - `9:16` — Vertical mobile format (Shorts, Reels, TikTok)
  - `1:1` — Square format (social posts, avatars, icon designs)
  - `4:3` & `3:4` — Classic editorial photography and retro film aspect ratios
  - `2:3` & `3:2` — Standard 35mm photography proportions
- **Video Durations**: `4`, `6`, `8`, or `10` seconds (`6` is recommended as the golden standard for coherence).

---

## 🛠️ Modes & Parameter Formulas

### 1. Text-to-Image (`flow-text-to-image`)
Generate static visual assets directly from descriptive prompts.
```json
{
  "mode": "flow-text-to-image",
  "prompt": "Cinematic 35mm film still of an artisan ceramicist molding clay in a sunlit Kyoto workshop, dust motes floating in morning light, depth of field",
  "aspect_ratio": "16:9",
  "image_model": "nano-banana-pro",
  "outputs": 1
}
```

### 2. Image-to-Image (`flow-image-to-image`)
Provide 1 to 10 direct image links (URLs) or local file paths of independent reference images to guide composition, style, or subject matter.
```json
{
  "mode": "flow-image-to-image",
  "prompt": "Restyle this character into a neo-noir comic book aesthetic with ink hatching and neon rim light",
  "image_paths": ["C:/assets/character.png"],
  "aspect_ratio": "16:9",
  "image_model": "nano-banana-pro"
}
```

### 3. Text-to-Video (`flow-text-to-video`)
Generate motion footage from detailed camera and scene descriptions.
```json
{
  "mode": "flow-text-to-video",
  "prompt": "Slow cinematic forward tracking shot across a foggy pine forest at dawn, shafts of sunlight piercing misty canopy, photorealistic, 4k",
  "aspect_ratio": "16:9",
  "duration": "6",
  "image_model": "veo-3.1-quality"
}
```

### 4. Frame-to-Video (`flow-frame-to-video`)
Animate an existing keyframe into a dynamic scene (accepts 1 or 2 reference frames).
```json
{
  "mode": "flow-frame-to-video",
  "prompt": "Camera pans slowly upward as wind rustles the samurai's cape, embers drifting across the screen",
  "image_paths": ["C:/renders/opening_frame.png"],
  "duration": "6",
  "aspect_ratio": "16:9"
}
```

### 5. Multi-Ingredient Composition (`flow-ingredients-to-video`)
Combine multiple visual elements (character, background, lighting reference) into one video.
```json
{
  "mode": "flow-ingredients-to-video",
  "prompt": "The robot from reference 1 explores the bioluminescent cave from reference 2, scanning glowing flora",
  "image_paths": ["C:/renders/robot.png", "C:/renders/cave_environment.png"],
  "image_model": "omni-flash",
  "duration": "6"
}
```

### 6. Extend Video (`flow-extend-video`)
Add continuity to an existing Flow project clip (+6s per extension).
```json
{
  "mode": "flow-extend-video",
  "prompt": "Continue the camera motion as the vehicle accelerates onto the desert highway into the setting sun"
}
```

### 7. Character Consistency (`flow-create-character`)
Create and name a persistent character within a Flow project, then cast them in subsequent videos using `character_refs`.
```json
{
  "mode": "flow-create-character",
  "prompt": "Elderly eccentric inventor with round brass goggles, wild silver hair, wearing a patched tweed vest",
  "character_name": "Professor Sterling"
}
```

---

## 🔄 Automatic & Manual Retry Capabilities

Flow MCP provides built-in resilience against transient network lags, element loading timeouts, and session disruptions:

1. **Automatic Retries (`max_retries`)**:
   - `flow_generate` includes automatic exponential backoff retries (default: `max_retries: 3`).
   - If a generation fails due to a transient browser error, it is automatically re-queued (`status: "queued"`) and retried up to `max_retries` times without discarding uploaded input images or tokens.
   - To disable automatic retry, pass `"max_retries": 0`.

2. **Manual Retry Tool (`flow_retry_job`)**:
   - Retry a specific failed or cancelled job:
     ```json
     {
       "job_id": "YOUR_JOB_ID",
       "wait": true
     }
     ```
   - Batch retry all failed jobs in the queue:
     ```json
     {
       "retry_all": true
     }
     ```

3. **CLI Commands**:
   - `flow-mcp retry <jobId>` — Retry a specific failed job.
   - `flow-mcp retry --all` — Re-queue and retry all failed jobs.
   - `flow-mcp generate "prompt..." --max-retries 3` — Submit with custom retry limit.

---

## 🎨 Prompt Engineering Best Practices for Flow

1. **Be Specific About Camera Movement**: Instead of *"a car driving"*, write *"low-angle tracking shot alongside a vintage red sports car speeding along coastal highway, asphalt reflection"*.
2. **Define Lighting & Atmosphere**: Specify the time of day, atmosphere, and light sources (e.g. *"overcast diffuse lighting"*, *"harsh midday sun"*, *"golden hour backlighting"*, *"neon cyan and magenta reflections"*).
3. **Avoid Fluff Words**: Avoid meaningless buzzwords like *"ultra realistic 8k photorealistic photorealism"*. Describe concrete materials, lens characteristics (*"35mm anamorphic lens"*, *"shallow depth of field"*), and tactile details (*"weathered leather"*, *"oxidized bronze"*).
4. **Inspect Output Files**: Always report the local file paths returned by `flow_generate` directly to the user so they can view the generated `.mp4` or `.png` files immediately.
