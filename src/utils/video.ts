import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname, basename, extname, join } from "node:path";
import { promisify } from "node:util";
import { logger } from "./logger.js";

const execFileAsync = promisify(execFile);

export interface FrameExtractOptions {
  position?: "first" | "last" | "timestamp";
  timestampSec?: number;
  outputPath?: string;
}

export interface StitchOptions {
  transition?: "cut" | "crossfade";
  crossfadeSec?: number;
}

/**
 * Extract a high-resolution PNG frame from a video clip.
 * Defaults to extracting the exact final frame ("last") to anchor sequential video continuity.
 */
export async function extractFrame(
  videoPath: string,
  options: FrameExtractOptions = {}
): Promise<string> {
  const absVideo = resolve(videoPath);
  if (!existsSync(absVideo)) {
    throw new Error(`Video file not found: ${absVideo}`);
  }

  const position = options.position ?? "last";
  const videoDir = dirname(absVideo);
  const baseName = basename(absVideo, extname(absVideo));

  let defaultOutName = `${baseName}_last_frame.png`;
  if (position === "first") defaultOutName = `${baseName}_first_frame.png`;
  if (position === "timestamp") defaultOutName = `${baseName}_frame_${options.timestampSec ?? 0}s.png`;

  const absOutput = options.outputPath ? resolve(options.outputPath) : join(videoDir, defaultOutName);
  mkdirSync(dirname(absOutput), { recursive: true });

  const args: string[] = ["-y"];

  if (position === "last") {
    // Fast seek near end of file, grab 1 frame
    args.push("-sseof", "-0.1", "-i", absVideo, "-frames:v", "1", "-update", "1", absOutput);
  } else if (position === "first") {
    args.push("-ss", "0.0", "-i", absVideo, "-frames:v", "1", "-update", "1", absOutput);
  } else {
    const sec = options.timestampSec ?? 0;
    args.push("-ss", String(sec), "-i", absVideo, "-frames:v", "1", "-update", "1", absOutput);
  }

  logger.debug("video", `Extracting ${position} frame: ffmpeg ${args.join(" ")}`);

  try {
    await execFileAsync("ffmpeg", args);
    if (!existsSync(absOutput)) {
      throw new Error(`FFmpeg ran but output frame was not generated at: ${absOutput}`);
    }
    logger.info("video", `Extracted ${position} frame -> ${absOutput}`);
    return absOutput;
  } catch (err: any) {
    logger.error("video", `Failed to extract frame from ${absVideo}`, err);
    throw new Error(`Frame extraction failed: ${err.message}`);
  }
}

/**
 * Get video duration in seconds via ffmpeg / ffprobe.
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  const absVideo = resolve(videoPath);
  if (!existsSync(absVideo)) {
    throw new Error(`Video file not found: ${absVideo}`);
  }

  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      absVideo,
    ]);
    const duration = parseFloat(stdout.trim());
    if (!isNaN(duration) && duration > 0) return duration;
  } catch {}

  // Fallback to ffmpeg -i stderr inspection
  try {
    const { stderr } = await execFileAsync("ffmpeg", ["-i", absVideo], { maxBuffer: 10 * 1024 * 1024 });
    const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (match) {
      const hours = parseFloat(match[1]);
      const minutes = parseFloat(match[2]);
      const seconds = parseFloat(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }
  } catch (err: any) {
    if (err.stderr) {
      const match = err.stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
      if (match) {
        const hours = parseFloat(match[1]);
        const minutes = parseFloat(match[2]);
        const seconds = parseFloat(match[3]);
        return hours * 3600 + minutes * 60 + seconds;
      }
    }
  }

  return 6.0; // Sane fallback default
}

/**
 * Stitches multiple sequential video clips into a single continuous video file.
 * Supports direct seamless hard-cuts or smooth cinematic crossfades.
 */
export async function stitchVideos(
  clipPaths: string[],
  outputPath: string,
  options: StitchOptions = {}
): Promise<string> {
  if (clipPaths.length === 0) {
    throw new Error("No video clips provided to stitch.");
  }

  const resolvedClips = clipPaths.map((p) => resolve(p));
  for (const clip of resolvedClips) {
    if (!existsSync(clip)) {
      throw new Error(`Cannot stitch: Clip does not exist at ${clip}`);
    }
  }

  const absOutput = resolve(outputPath);
  mkdirSync(dirname(absOutput), { recursive: true });

  if (resolvedClips.length === 1) {
    // Single clip - copy or re-mux directly
    await execFileAsync("ffmpeg", ["-y", "-i", resolvedClips[0], "-c", "copy", absOutput]);
    return absOutput;
  }

  const transition = options.transition ?? "cut";

  if (transition === "cut") {
    // Fast concat demuxer
    const listFile = join(dirname(absOutput), `concat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`);
    const listContent = resolvedClips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    writeFileSync(listFile, listContent, "utf8");

    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listFile,
        "-c",
        "copy",
        absOutput,
      ]);
    } catch {
      // If copy fails due to differing codecs, re-encode with standardized settings
      logger.warn("video", "Direct stream copy failed, re-encoding concat with x264...");
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listFile,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        absOutput,
      ]);
    } finally {
      try {
        unlinkSync(listFile);
      } catch {}
    }

    logger.info("video", `Seamlessly stitched ${resolvedClips.length} clips (cut) -> ${absOutput}`);
    return absOutput;
  }

  // Crossfade transition using filter_complex xfade
  const xfadeDuration = options.crossfadeSec ?? 0.5;
  const durations: number[] = [];
  for (const c of resolvedClips) {
    durations.push(await getVideoDuration(c));
  }

  // Build filter_complex string
  const inputs: string[] = [];
  resolvedClips.forEach((c) => {
    inputs.push("-i", c);
  });

  let filter = "";
  let lastOut = "[0:v]";
  let currentOffset = durations[0] - xfadeDuration;

  for (let i = 1; i < resolvedClips.length; i++) {
    const nextIn = `[${i}:v]`;
    const nextOut = i === resolvedClips.length - 1 ? "[v]" : `[v${i}]`;
    filter += `${lastOut}${nextIn}xfade=transition=fade:duration=${xfadeDuration}:offset=${currentOffset.toFixed(2)}${nextOut};`;
    lastOut = nextOut;
    if (i < resolvedClips.length - 1) {
      currentOffset += durations[i] - xfadeDuration;
    }
  }

  // Strip trailing semicolon
  filter = filter.replace(/;$/, "");

  const args: string[] = [
    "-y",
    ...inputs,
    "-filter_complex",
    filter,
    "-map",
    "[v]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    absOutput,
  ];

  logger.debug("video", `Crossfade stitch: ffmpeg ${args.join(" ")}`);
  try {
    await execFileAsync("ffmpeg", args);
    logger.info("video", `Crossfade stitched ${resolvedClips.length} clips -> ${absOutput}`);
    return absOutput;
  } catch (err: any) {
    logger.error("video", "Crossfade stitching failed, falling back to cut concat", err);
    // Fallback to cut concat
    return stitchVideos(clipPaths, outputPath, { transition: "cut" });
  }
}
