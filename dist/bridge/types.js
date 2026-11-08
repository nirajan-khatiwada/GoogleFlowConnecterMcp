import { z } from "zod";
export const BRIDGE_DEFAULT_PORT = 8791;
export const BRIDGE_HOST = "127.0.0.1";
export const ModeSchema = z.enum([
    "flow-text-to-image",
    "flow-image-to-image",
    "flow-text-to-video",
    "flow-frame-to-video",
    "flow-ingredients-to-video",
    "flow-video-to-video",
    "flow-create-character",
    "flow-set-voice",
    "flow-extend-video",
    "flow-rename-asset",
    "flow-upload-assets",
    // Also support grok modes if ever routed
    "text-to-image",
    "image-to-image",
    "text-to-video",
    "frame-to-video",
    "ingredients-to-video",
]);
export function siteForMode(mode) {
    return mode.startsWith("flow-") ? "flow" : "grok";
}
export const MODE_LIMITS = {
    "flow-text-to-image": { maxInputImages: 0, maxOutputs: 4 },
    "flow-image-to-image": { maxInputImages: 10, maxOutputs: 4 },
    "flow-text-to-video": { maxInputImages: 0, maxOutputs: 4 },
    "flow-frame-to-video": { maxInputImages: 2, maxOutputs: 4 },
    "flow-ingredients-to-video": { maxInputImages: 7, maxOutputs: 4 },
    "flow-video-to-video": { maxInputImages: 1, maxOutputs: 4 },
    "flow-create-character": { maxInputImages: 0, maxOutputs: 1 },
    "flow-set-voice": { maxInputImages: 0, maxOutputs: 1 },
    "flow-extend-video": { maxInputImages: 0, maxOutputs: 1 },
    "flow-rename-asset": { maxInputImages: 1, maxOutputs: 1 },
    "flow-upload-assets": { maxInputImages: 500, maxOutputs: 1 },
    // grok fallbacks
    "text-to-image": { maxInputImages: 0, maxOutputs: 12 },
    "image-to-image": { maxInputImages: 5, maxOutputs: 12 },
    "frame-to-video": { maxInputImages: 1, maxOutputs: 1 },
    "ingredients-to-video": { maxInputImages: 7, maxOutputs: 1 },
    "text-to-video": { maxInputImages: 0, maxOutputs: 1 },
};
export const VEO_INGREDIENTS_MAX = 3;
export const INGREDIENTS_MAX = {
    "omni-flash": 7,
    "veo-3.1-quality": 0,
};
export function maxReferences(mode, model) {
    if (mode !== "flow-ingredients-to-video") {
        return MODE_LIMITS[mode]?.maxInputImages ?? 0;
    }
    return INGREDIENTS_MAX[model ?? ""] ?? VEO_INGREDIENTS_MAX;
}
export const AspectRatioSchema = z.enum(["16:9", "9:16", "1:1", "2:3", "3:2", "4:3", "3:4"]);
export const VideoOptionSchema = z.enum([
    "4s",
    "6s",
    "8s",
    "10s",
    "15s",
    "6s-concat",
    "10s-concat",
    "15s-concat",
]);
export const ImageModelSchema = z.enum([
    "quality",
    "speed",
    "nano-banana-pro",
    "nano-banana-2",
    "nano-banana-2-lite",
    "omni-flash",
    "veo-3.1-lite",
    "veo-3.1-fast",
    "veo-3.1-quality",
]);
export const VideoResolutionSchema = z.enum(["480p", "720p"]);
export const ImageModeOptionSchema = z.enum(["new-image", "image-to-image"]);
export const VideoQualitySchema = z.enum(["480p", "720p", "1080p"]);
export const ImageQualitySchema = z.enum(["1k", "2k", "4k"]);
export const InputImageRefSchema = z.object({
    id: z.string(),
    name: z.string(),
    mime: z.string(),
    source: z.enum(["library", "bridge-token"]),
});
export const JobParamsSchema = z.object({
    aspectRatio: AspectRatioSchema.default("16:9"),
    videoOption: VideoOptionSchema.optional(),
    videoResolution: VideoResolutionSchema.optional(),
    autoExtendCount: z.number().int().min(0).max(50).default(0),
    extendPrompt: z.string().optional(),
    extendSteps: z.array(z.string()).optional(),
    autoSwitchOnQuota: z.boolean().optional(),
    imageModel: ImageModelSchema.optional(),
    imageModeOption: ImageModeOptionSchema.optional(),
    outputsPerPrompt: z.number().int().min(1).max(12).default(1),
    newProject: z.boolean().optional(),
    batchOutputs: z.number().int().min(1).max(12).optional(),
    speed: z.number().int().min(1).max(6).optional(),
    delayMinSec: z.number().min(0).max(600).optional(),
    delayMaxSec: z.number().min(0).max(600).optional(),
    imageDelayMinSec: z.number().min(0).max(600).optional(),
    imageDelayMaxSec: z.number().min(0).max(600).optional(),
    downloadVideoQuality: VideoQualitySchema.default("720p"),
    downloadImageQuality: ImageQualitySchema.default("1k"),
    downloadSubfolder: z.string().default("flow"),
    autoRenameFiles: z.boolean().default(true),
    characterName: z.string().optional(),
    characterInfo: z.string().optional(),
    voiceName: z.string().optional(),
    voiceStyle: z.string().optional(),
    voiceSaveAs: z.string().optional(),
    bodyPrompt: z.string().optional(),
    maxRetries: z.number().int().min(0).max(20).optional(),
});
export const JobStatusSchema = z.enum([
    "queued",
    "waiting_for_extension",
    "running",
    "downloading",
    "done",
    "failed",
    "cancelled",
]);
export const JobStageSchema = z.enum([
    "acquiring-tab",
    "preparing-page",
    "applying-mode",
    "applying-settings",
    "attaching-images",
    "entering-prompt",
    "submitting",
    "generating",
    "collecting-results",
    "downloading",
]);
export const JobResultFileSchema = z.object({
    path: z.string(),
    kind: z.enum(["image", "video"]),
});
export const JobSpecSchema = z.object({
    prompt: z.string().min(1),
    mode: ModeSchema,
    params: JobParamsSchema,
    inputImages: z.array(InputImageRefSchema).default([]),
    assetRefs: z.array(z.string()).optional(),
    characterRefs: z.array(z.string()).optional(),
    batchIndex: z.number().int().optional(),
});
export const JobSchema = JobSpecSchema.extend({
    id: z.string(),
    status: JobStatusSchema,
    source: z.enum(["ui", "bridge"]),
    client: z.string().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    attempts: z.number().int().default(0),
    maxRetries: z.number().int().min(0).max(20).default(3),
    retryHistory: z.array(z.object({
        attempt: z.number(),
        reason: z.string(),
        timestamp: z.number(),
    })).default([]),
    lastFailedAt: z.number().optional(),
    stage: JobStageSchema.optional(),
    error: z.string().optional(),
    retryable: z.boolean().optional(),
    files: z.array(JobResultFileSchema).default([]),
    tabId: z.number().optional(),
});
export const BridgeFileMetaSchema = z.object({
    token: z.string(),
    name: z.string(),
    mime: z.string(),
    size: z.number(),
});
export const SiteSchema = z.enum(["grok", "flow"]);
export const BrowserSchema = z.enum(["chrome", "edge", "other"]);
// Incoming messages from Extension to Bridge
export const ExtToBridgeSchema = z.discriminatedUnion("t", [
    z.object({
        t: z.literal("ext.hello"),
        extVersion: z.string(),
        loggedIn: z.boolean(),
        plan: z.string(),
        site: SiteSchema.default("flow"),
        browser: BrowserSchema.optional(),
        runningJobIds: z.array(z.string()).optional(),
        flowTab: z.boolean().optional(),
        flowVisible: z.boolean().optional(),
    }),
    z.object({
        t: z.literal("ext.heartbeat"),
    }),
    z.object({
        t: z.literal("ext.status"),
        loggedIn: z.boolean(),
        plan: z.string(),
        usedToday: z.number(),
        dailyLimit: z.number(),
        usage: z.object({ video: z.number(), image: z.number() }).optional().nullable(),
        limits: z.object({ video: z.number(), image: z.number() }).optional().nullable(),
        pausedReason: z.string().nullable().optional(),
        activeJobs: z.number(),
        grokVisible: z.boolean().nullable().optional(),
        flowLayout: z.enum(["wide", "narrow"]).nullable().optional(),
        flowAccess: z.enum(["ok", "blocked"]).nullable().optional(),
        cooldownUntil: z.number().nullable().optional(),
        lastWarning: z.string().nullable().optional(),
        browser: BrowserSchema.optional(),
    }),
    z.object({
        t: z.literal("job.accepted"),
        jobId: z.string(),
    }),
    z.object({
        t: z.literal("job.progress"),
        jobId: z.string(),
        stage: JobStageSchema,
        pct: z.number().optional(),
        message: z.string().optional(),
    }),
    z.object({
        t: z.literal("job.result"),
        jobId: z.string(),
        files: z.array(JobResultFileSchema),
        warning: z.string().optional(),
    }),
    z.object({
        t: z.literal("job.failed"),
        jobId: z.string(),
        reason: z.string(),
        retryable: z.boolean(),
    }),
    z.object({
        t: z.literal("healthcheck.result"),
        entries: z.array(z.object({
            key: z.string(),
            matched: z.boolean(),
            strategy: z.string().optional(),
            snippet: z.string().optional(),
        })),
        diagnostics: z.record(z.unknown()).optional(),
    }),
    z.object({
        t: z.literal("dom.result"),
        url: z.string().optional(),
        roots: z.number().optional(),
        items: z.array(z.record(z.unknown())),
    }),
    z.object({
        t: z.literal("logs.result"),
        entries: z.array(z.object({
            ts: z.number(),
            level: z.string(),
            scope: z.string(),
            message: z.string(),
        })),
    }),
]);
// Outgoing messages from Bridge to Extension
export const BridgeToExtSchema = z.discriminatedUnion("t", [
    z.object({
        t: z.literal("bridge.hello"),
        bridgeVersion: z.string(),
    }),
    z.object({
        t: z.literal("job.submit"),
        jobId: z.string(),
        job: JobSpecSchema,
        inputFiles: z.array(BridgeFileMetaSchema),
    }),
    z.object({
        t: z.literal("job.cancel"),
        jobId: z.string(),
    }),
    z.object({
        t: z.literal("queue.stop"),
    }),
    z.object({
        t: z.literal("queue.clear"),
    }),
    z.object({
        t: z.literal("ext.reload"),
    }),
    z.object({
        t: z.literal("status.query"),
    }),
    z.object({
        t: z.literal("healthcheck.run"),
    }),
    z.object({
        t: z.literal("logs.query"),
    }),
    z.object({
        t: z.literal("dom.query"),
        selector: z.string().optional(),
        clickFirst: z.string().optional(),
    }),
]);
export const SubmitJobRequestSchema = z.object({
    job: JobSpecSchema,
    imagePaths: z.array(z.string()).default([]),
    client: z.string().max(64).optional(),
    maxRetries: z.number().int().min(0).max(20).optional(),
});
export const CharacterDefSchema = z.object({
    name: z.string().min(1).describe("Name of the character"),
    role: z.string().describe("Role in the story, e.g. 'Lead Protagonist', 'Skeptical Engineer'"),
    appearance: z.string().describe("Visual anchor: hair, clothing, physique, facial features, accessories"),
    spatialAnchor: z.string().optional().describe("Default spatial position, e.g. 'Screen-left', 'Screen-right', 'Center'"),
    clothingLock: z.string().optional().describe("Strict clothing description that must not drift"),
});
export const SceneBeatSchema = z.object({
    clipNumber: z.number().int().min(1),
    sceneTitle: z.string(),
    duration: z.enum(["4", "6", "8", "10"]).default("6"),
    environment: z.object({
        location: z.string().describe("Setting, architecture, room or landscape"),
        lighting: z.string().describe("Lighting conditions, e.g. 'Golden hour sunset from screen-left', 'Dim neon ambient'"),
        weatherOrAtmosphere: z.string().optional(),
        keyObjects: z.array(z.string()).default([]),
    }),
    charactersPresent: z.array(z.object({
        name: z.string(),
        position: z.string().describe("Screen position: Screen-left, Screen-right, Center, Background"),
        action: z.string().describe("What the character is doing during this clip"),
        gazeOrExpression: z.string().describe("Facial expression and direction of gaze"),
    })).min(1),
    ongoingEvents: z.string().describe("What is happening in the narrative"),
    cameraMovement: z.string().describe("Camera path, e.g. 'Slow tracking shot left-to-right', 'Medium push-in'"),
    continuityHandoff: z.object({
        fromPreviousClip: z.string().optional().describe("Action inertia and character pose carried over from the end of the previous clip"),
        toNextClip: z.string().optional().describe("Final frame vector: exact character poses, hand positions, and camera direction passed to the next clip"),
    }),
});
export const StoryboardPlanSchema = z.object({
    title: z.string().min(1),
    logline: z.string(),
    worldBible: z.object({
        setting: z.string(),
        timePeriod: z.string(),
        visualTone: z.string(),
        lightingRules: z.string(),
        invariants: z.array(z.string()).describe("Rules that must never be broken across clips"),
    }),
    characters: z.array(CharacterDefSchema).min(1),
    scenes: z.array(SceneBeatSchema).min(1),
});
//# sourceMappingURL=types.js.map