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
export declare function extractFrame(videoPath: string, options?: FrameExtractOptions): Promise<string>;
/**
 * Get video duration in seconds via ffmpeg / ffprobe.
 */
export declare function getVideoDuration(videoPath: string): Promise<number>;
/**
 * Stitches multiple sequential video clips into a single continuous video file.
 * Supports direct seamless hard-cuts or smooth cinematic crossfades.
 */
export declare function stitchVideos(clipPaths: string[], outputPath: string, options?: StitchOptions): Promise<string>;
//# sourceMappingURL=video.d.ts.map