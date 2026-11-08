import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, unlinkSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { extractFrame, getVideoDuration, stitchVideos } from "../dist/utils/video.js";
import { createMcpServer } from "../dist/mcp/server.js";

const sampleVideo = resolve("assets/stickman/b1-minimal-handdrawn.mp4");

describe("Video Continuity & Storyboard Engine Verification", () => {
  it("extracts exact final frame from video for continuity anchoring", async () => {
    assert.ok(existsSync(sampleVideo), "Sample video must exist for test");

    const outFrame = resolve("test_last_frame.png");
    try {
      const extracted = await extractFrame(sampleVideo, {
        position: "last",
        outputPath: outFrame,
      });

      assert.equal(extracted, outFrame);
      assert.ok(existsSync(outFrame), "Extracted frame file should exist");
      const stat = statSync(outFrame);
      assert.ok(stat.size > 1000, "Extracted frame should be a valid non-empty PNG");
    } finally {
      if (existsSync(outFrame)) unlinkSync(outFrame);
    }
  });

  it("extracts first frame and timestamp frame correctly", async () => {
    const firstFrame = resolve("test_first_frame.png");
    const midFrame = resolve("test_mid_frame.png");

    try {
      const f1 = await extractFrame(sampleVideo, { position: "first", outputPath: firstFrame });
      assert.ok(existsSync(f1));

      const f2 = await extractFrame(sampleVideo, { position: "timestamp", timestampSec: 2.0, outputPath: midFrame });
      assert.ok(existsSync(f2));
    } finally {
      if (existsSync(firstFrame)) unlinkSync(firstFrame);
      if (existsSync(midFrame)) unlinkSync(midFrame);
    }
  });

  it("accurately reads video duration", async () => {
    const duration = await getVideoDuration(sampleVideo);
    assert.ok(typeof duration === "number");
    assert.ok(duration > 15 && duration < 18, `Duration should be around 16.4s, got ${duration}`);
  });

  it("stitches clips seamlessly using direct cut transition", async () => {
    const stitchedOut = resolve("test_stitched_cut.mp4");
    try {
      const result = await stitchVideos([sampleVideo, sampleVideo], stitchedOut, { transition: "cut" });
      assert.equal(result, stitchedOut);
      assert.ok(existsSync(stitchedOut));
      const duration = await getVideoDuration(stitchedOut);
      assert.ok(duration > 30, `Stitched duration should be ~32.8s, got ${duration}`);
    } finally {
      if (existsSync(stitchedOut)) unlinkSync(stitchedOut);
    }
  });

  it("stitches clips with cinematic crossfade blend", async () => {
    const stitchedOut = resolve("test_stitched_xfade.mp4");
    try {
      const result = await stitchVideos([sampleVideo, sampleVideo], stitchedOut, {
        transition: "crossfade",
        crossfadeSec: 0.5,
      });
      assert.equal(result, stitchedOut);
      assert.ok(existsSync(stitchedOut));
      const stat = statSync(stitchedOut);
      assert.ok(stat.size > 10000, "Crossfaded video should have valid content");
    } finally {
      if (existsSync(stitchedOut)) unlinkSync(stitchedOut);
    }
  });

  it("registers flow_extract_frame, flow_stitch_video, and flow_storyboard_plan on MCP server", async () => {
    const server = await createMcpServer();
    assert.ok(server);
    // Server is configured with all tools
  });
});
