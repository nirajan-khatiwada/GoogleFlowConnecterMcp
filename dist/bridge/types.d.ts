import { z } from "zod";
export declare const BRIDGE_DEFAULT_PORT = 8791;
export declare const BRIDGE_HOST = "127.0.0.1";
export declare const ModeSchema: z.ZodEnum<["flow-text-to-image", "flow-image-to-image", "flow-text-to-video", "flow-frame-to-video", "flow-ingredients-to-video", "flow-video-to-video", "flow-create-character", "flow-set-voice", "flow-extend-video", "flow-rename-asset", "flow-upload-assets", "text-to-image", "image-to-image", "text-to-video", "frame-to-video", "ingredients-to-video"]>;
export type Mode = z.infer<typeof ModeSchema>;
export declare function siteForMode(mode: string): "flow" | "grok";
export declare const MODE_LIMITS: Record<string, {
    maxInputImages: number;
    maxOutputs: number;
}>;
export declare const VEO_INGREDIENTS_MAX = 3;
export declare const INGREDIENTS_MAX: Record<string, number>;
export declare function maxReferences(mode: string, model?: string): number;
export declare const AspectRatioSchema: z.ZodEnum<["16:9", "9:16", "1:1", "2:3", "3:2", "4:3", "3:4"]>;
export type AspectRatio = z.infer<typeof AspectRatioSchema>;
export declare const VideoOptionSchema: z.ZodEnum<["4s", "6s", "8s", "10s", "15s", "6s-concat", "10s-concat", "15s-concat"]>;
export type VideoOption = z.infer<typeof VideoOptionSchema>;
export declare const ImageModelSchema: z.ZodEnum<["quality", "speed", "nano-banana-pro", "nano-banana-2", "nano-banana-2-lite", "omni-flash", "veo-3.1-lite", "veo-3.1-fast", "veo-3.1-quality"]>;
export type ImageModel = z.infer<typeof ImageModelSchema>;
export declare const VideoResolutionSchema: z.ZodEnum<["480p", "720p"]>;
export declare const ImageModeOptionSchema: z.ZodEnum<["new-image", "image-to-image"]>;
export declare const VideoQualitySchema: z.ZodEnum<["480p", "720p", "1080p"]>;
export declare const ImageQualitySchema: z.ZodEnum<["1k", "2k", "4k"]>;
export declare const InputImageRefSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    mime: z.ZodString;
    source: z.ZodEnum<["library", "bridge-token"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    mime: string;
    source: "library" | "bridge-token";
}, {
    id: string;
    name: string;
    mime: string;
    source: "library" | "bridge-token";
}>;
export type InputImageRef = z.infer<typeof InputImageRefSchema>;
export declare const JobParamsSchema: z.ZodObject<{
    aspectRatio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1", "2:3", "3:2", "4:3", "3:4"]>>;
    videoOption: z.ZodOptional<z.ZodEnum<["4s", "6s", "8s", "10s", "15s", "6s-concat", "10s-concat", "15s-concat"]>>;
    videoResolution: z.ZodOptional<z.ZodEnum<["480p", "720p"]>>;
    autoExtendCount: z.ZodDefault<z.ZodNumber>;
    extendPrompt: z.ZodOptional<z.ZodString>;
    extendSteps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    autoSwitchOnQuota: z.ZodOptional<z.ZodBoolean>;
    imageModel: z.ZodOptional<z.ZodEnum<["quality", "speed", "nano-banana-pro", "nano-banana-2", "nano-banana-2-lite", "omni-flash", "veo-3.1-lite", "veo-3.1-fast", "veo-3.1-quality"]>>;
    imageModeOption: z.ZodOptional<z.ZodEnum<["new-image", "image-to-image"]>>;
    outputsPerPrompt: z.ZodDefault<z.ZodNumber>;
    newProject: z.ZodOptional<z.ZodBoolean>;
    batchOutputs: z.ZodOptional<z.ZodNumber>;
    speed: z.ZodOptional<z.ZodNumber>;
    delayMinSec: z.ZodOptional<z.ZodNumber>;
    delayMaxSec: z.ZodOptional<z.ZodNumber>;
    imageDelayMinSec: z.ZodOptional<z.ZodNumber>;
    imageDelayMaxSec: z.ZodOptional<z.ZodNumber>;
    downloadVideoQuality: z.ZodDefault<z.ZodEnum<["480p", "720p", "1080p"]>>;
    downloadImageQuality: z.ZodDefault<z.ZodEnum<["1k", "2k", "4k"]>>;
    downloadSubfolder: z.ZodDefault<z.ZodString>;
    autoRenameFiles: z.ZodDefault<z.ZodBoolean>;
    characterName: z.ZodOptional<z.ZodString>;
    characterInfo: z.ZodOptional<z.ZodString>;
    voiceName: z.ZodOptional<z.ZodString>;
    voiceStyle: z.ZodOptional<z.ZodString>;
    voiceSaveAs: z.ZodOptional<z.ZodString>;
    bodyPrompt: z.ZodOptional<z.ZodString>;
    maxRetries: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
    autoExtendCount: number;
    outputsPerPrompt: number;
    downloadVideoQuality: "480p" | "720p" | "1080p";
    downloadImageQuality: "1k" | "2k" | "4k";
    downloadSubfolder: string;
    autoRenameFiles: boolean;
    speed?: number | undefined;
    videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
    videoResolution?: "480p" | "720p" | undefined;
    extendPrompt?: string | undefined;
    extendSteps?: string[] | undefined;
    autoSwitchOnQuota?: boolean | undefined;
    imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
    imageModeOption?: "image-to-image" | "new-image" | undefined;
    newProject?: boolean | undefined;
    batchOutputs?: number | undefined;
    delayMinSec?: number | undefined;
    delayMaxSec?: number | undefined;
    imageDelayMinSec?: number | undefined;
    imageDelayMaxSec?: number | undefined;
    characterName?: string | undefined;
    characterInfo?: string | undefined;
    voiceName?: string | undefined;
    voiceStyle?: string | undefined;
    voiceSaveAs?: string | undefined;
    bodyPrompt?: string | undefined;
    maxRetries?: number | undefined;
}, {
    speed?: number | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
    videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
    videoResolution?: "480p" | "720p" | undefined;
    autoExtendCount?: number | undefined;
    extendPrompt?: string | undefined;
    extendSteps?: string[] | undefined;
    autoSwitchOnQuota?: boolean | undefined;
    imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
    imageModeOption?: "image-to-image" | "new-image" | undefined;
    outputsPerPrompt?: number | undefined;
    newProject?: boolean | undefined;
    batchOutputs?: number | undefined;
    delayMinSec?: number | undefined;
    delayMaxSec?: number | undefined;
    imageDelayMinSec?: number | undefined;
    imageDelayMaxSec?: number | undefined;
    downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
    downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
    downloadSubfolder?: string | undefined;
    autoRenameFiles?: boolean | undefined;
    characterName?: string | undefined;
    characterInfo?: string | undefined;
    voiceName?: string | undefined;
    voiceStyle?: string | undefined;
    voiceSaveAs?: string | undefined;
    bodyPrompt?: string | undefined;
    maxRetries?: number | undefined;
}>;
export type JobParams = z.infer<typeof JobParamsSchema>;
export declare const JobStatusSchema: z.ZodEnum<["queued", "waiting_for_extension", "running", "downloading", "done", "failed", "cancelled"]>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export declare const JobStageSchema: z.ZodEnum<["acquiring-tab", "preparing-page", "applying-mode", "applying-settings", "attaching-images", "entering-prompt", "submitting", "generating", "collecting-results", "downloading"]>;
export type JobStage = z.infer<typeof JobStageSchema>;
export declare const JobResultFileSchema: z.ZodObject<{
    path: z.ZodString;
    kind: z.ZodEnum<["image", "video"]>;
}, "strip", z.ZodTypeAny, {
    path: string;
    kind: "image" | "video";
}, {
    path: string;
    kind: "image" | "video";
}>;
export type JobResultFile = z.infer<typeof JobResultFileSchema>;
export declare const JobSpecSchema: z.ZodObject<{
    prompt: z.ZodString;
    mode: z.ZodEnum<["flow-text-to-image", "flow-image-to-image", "flow-text-to-video", "flow-frame-to-video", "flow-ingredients-to-video", "flow-video-to-video", "flow-create-character", "flow-set-voice", "flow-extend-video", "flow-rename-asset", "flow-upload-assets", "text-to-image", "image-to-image", "text-to-video", "frame-to-video", "ingredients-to-video"]>;
    params: z.ZodObject<{
        aspectRatio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1", "2:3", "3:2", "4:3", "3:4"]>>;
        videoOption: z.ZodOptional<z.ZodEnum<["4s", "6s", "8s", "10s", "15s", "6s-concat", "10s-concat", "15s-concat"]>>;
        videoResolution: z.ZodOptional<z.ZodEnum<["480p", "720p"]>>;
        autoExtendCount: z.ZodDefault<z.ZodNumber>;
        extendPrompt: z.ZodOptional<z.ZodString>;
        extendSteps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        autoSwitchOnQuota: z.ZodOptional<z.ZodBoolean>;
        imageModel: z.ZodOptional<z.ZodEnum<["quality", "speed", "nano-banana-pro", "nano-banana-2", "nano-banana-2-lite", "omni-flash", "veo-3.1-lite", "veo-3.1-fast", "veo-3.1-quality"]>>;
        imageModeOption: z.ZodOptional<z.ZodEnum<["new-image", "image-to-image"]>>;
        outputsPerPrompt: z.ZodDefault<z.ZodNumber>;
        newProject: z.ZodOptional<z.ZodBoolean>;
        batchOutputs: z.ZodOptional<z.ZodNumber>;
        speed: z.ZodOptional<z.ZodNumber>;
        delayMinSec: z.ZodOptional<z.ZodNumber>;
        delayMaxSec: z.ZodOptional<z.ZodNumber>;
        imageDelayMinSec: z.ZodOptional<z.ZodNumber>;
        imageDelayMaxSec: z.ZodOptional<z.ZodNumber>;
        downloadVideoQuality: z.ZodDefault<z.ZodEnum<["480p", "720p", "1080p"]>>;
        downloadImageQuality: z.ZodDefault<z.ZodEnum<["1k", "2k", "4k"]>>;
        downloadSubfolder: z.ZodDefault<z.ZodString>;
        autoRenameFiles: z.ZodDefault<z.ZodBoolean>;
        characterName: z.ZodOptional<z.ZodString>;
        characterInfo: z.ZodOptional<z.ZodString>;
        voiceName: z.ZodOptional<z.ZodString>;
        voiceStyle: z.ZodOptional<z.ZodString>;
        voiceSaveAs: z.ZodOptional<z.ZodString>;
        bodyPrompt: z.ZodOptional<z.ZodString>;
        maxRetries: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
        autoExtendCount: number;
        outputsPerPrompt: number;
        downloadVideoQuality: "480p" | "720p" | "1080p";
        downloadImageQuality: "1k" | "2k" | "4k";
        downloadSubfolder: string;
        autoRenameFiles: boolean;
        speed?: number | undefined;
        videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
        videoResolution?: "480p" | "720p" | undefined;
        extendPrompt?: string | undefined;
        extendSteps?: string[] | undefined;
        autoSwitchOnQuota?: boolean | undefined;
        imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
        imageModeOption?: "image-to-image" | "new-image" | undefined;
        newProject?: boolean | undefined;
        batchOutputs?: number | undefined;
        delayMinSec?: number | undefined;
        delayMaxSec?: number | undefined;
        imageDelayMinSec?: number | undefined;
        imageDelayMaxSec?: number | undefined;
        characterName?: string | undefined;
        characterInfo?: string | undefined;
        voiceName?: string | undefined;
        voiceStyle?: string | undefined;
        voiceSaveAs?: string | undefined;
        bodyPrompt?: string | undefined;
        maxRetries?: number | undefined;
    }, {
        speed?: number | undefined;
        aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
        videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
        videoResolution?: "480p" | "720p" | undefined;
        autoExtendCount?: number | undefined;
        extendPrompt?: string | undefined;
        extendSteps?: string[] | undefined;
        autoSwitchOnQuota?: boolean | undefined;
        imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
        imageModeOption?: "image-to-image" | "new-image" | undefined;
        outputsPerPrompt?: number | undefined;
        newProject?: boolean | undefined;
        batchOutputs?: number | undefined;
        delayMinSec?: number | undefined;
        delayMaxSec?: number | undefined;
        imageDelayMinSec?: number | undefined;
        imageDelayMaxSec?: number | undefined;
        downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
        downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
        downloadSubfolder?: string | undefined;
        autoRenameFiles?: boolean | undefined;
        characterName?: string | undefined;
        characterInfo?: string | undefined;
        voiceName?: string | undefined;
        voiceStyle?: string | undefined;
        voiceSaveAs?: string | undefined;
        bodyPrompt?: string | undefined;
        maxRetries?: number | undefined;
    }>;
    inputImages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        mime: z.ZodString;
        source: z.ZodEnum<["library", "bridge-token"]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        mime: string;
        source: "library" | "bridge-token";
    }, {
        id: string;
        name: string;
        mime: string;
        source: "library" | "bridge-token";
    }>, "many">>;
    assetRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    characterRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    batchIndex: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    params: {
        aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
        autoExtendCount: number;
        outputsPerPrompt: number;
        downloadVideoQuality: "480p" | "720p" | "1080p";
        downloadImageQuality: "1k" | "2k" | "4k";
        downloadSubfolder: string;
        autoRenameFiles: boolean;
        speed?: number | undefined;
        videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
        videoResolution?: "480p" | "720p" | undefined;
        extendPrompt?: string | undefined;
        extendSteps?: string[] | undefined;
        autoSwitchOnQuota?: boolean | undefined;
        imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
        imageModeOption?: "image-to-image" | "new-image" | undefined;
        newProject?: boolean | undefined;
        batchOutputs?: number | undefined;
        delayMinSec?: number | undefined;
        delayMaxSec?: number | undefined;
        imageDelayMinSec?: number | undefined;
        imageDelayMaxSec?: number | undefined;
        characterName?: string | undefined;
        characterInfo?: string | undefined;
        voiceName?: string | undefined;
        voiceStyle?: string | undefined;
        voiceSaveAs?: string | undefined;
        bodyPrompt?: string | undefined;
        maxRetries?: number | undefined;
    };
    prompt: string;
    mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
    inputImages: {
        id: string;
        name: string;
        mime: string;
        source: "library" | "bridge-token";
    }[];
    assetRefs?: string[] | undefined;
    characterRefs?: string[] | undefined;
    batchIndex?: number | undefined;
}, {
    params: {
        speed?: number | undefined;
        aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
        videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
        videoResolution?: "480p" | "720p" | undefined;
        autoExtendCount?: number | undefined;
        extendPrompt?: string | undefined;
        extendSteps?: string[] | undefined;
        autoSwitchOnQuota?: boolean | undefined;
        imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
        imageModeOption?: "image-to-image" | "new-image" | undefined;
        outputsPerPrompt?: number | undefined;
        newProject?: boolean | undefined;
        batchOutputs?: number | undefined;
        delayMinSec?: number | undefined;
        delayMaxSec?: number | undefined;
        imageDelayMinSec?: number | undefined;
        imageDelayMaxSec?: number | undefined;
        downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
        downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
        downloadSubfolder?: string | undefined;
        autoRenameFiles?: boolean | undefined;
        characterName?: string | undefined;
        characterInfo?: string | undefined;
        voiceName?: string | undefined;
        voiceStyle?: string | undefined;
        voiceSaveAs?: string | undefined;
        bodyPrompt?: string | undefined;
        maxRetries?: number | undefined;
    };
    prompt: string;
    mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
    inputImages?: {
        id: string;
        name: string;
        mime: string;
        source: "library" | "bridge-token";
    }[] | undefined;
    assetRefs?: string[] | undefined;
    characterRefs?: string[] | undefined;
    batchIndex?: number | undefined;
}>;
export type JobSpec = z.infer<typeof JobSpecSchema>;
export declare const JobSchema: z.ZodObject<{
    prompt: z.ZodString;
    mode: z.ZodEnum<["flow-text-to-image", "flow-image-to-image", "flow-text-to-video", "flow-frame-to-video", "flow-ingredients-to-video", "flow-video-to-video", "flow-create-character", "flow-set-voice", "flow-extend-video", "flow-rename-asset", "flow-upload-assets", "text-to-image", "image-to-image", "text-to-video", "frame-to-video", "ingredients-to-video"]>;
    params: z.ZodObject<{
        aspectRatio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1", "2:3", "3:2", "4:3", "3:4"]>>;
        videoOption: z.ZodOptional<z.ZodEnum<["4s", "6s", "8s", "10s", "15s", "6s-concat", "10s-concat", "15s-concat"]>>;
        videoResolution: z.ZodOptional<z.ZodEnum<["480p", "720p"]>>;
        autoExtendCount: z.ZodDefault<z.ZodNumber>;
        extendPrompt: z.ZodOptional<z.ZodString>;
        extendSteps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        autoSwitchOnQuota: z.ZodOptional<z.ZodBoolean>;
        imageModel: z.ZodOptional<z.ZodEnum<["quality", "speed", "nano-banana-pro", "nano-banana-2", "nano-banana-2-lite", "omni-flash", "veo-3.1-lite", "veo-3.1-fast", "veo-3.1-quality"]>>;
        imageModeOption: z.ZodOptional<z.ZodEnum<["new-image", "image-to-image"]>>;
        outputsPerPrompt: z.ZodDefault<z.ZodNumber>;
        newProject: z.ZodOptional<z.ZodBoolean>;
        batchOutputs: z.ZodOptional<z.ZodNumber>;
        speed: z.ZodOptional<z.ZodNumber>;
        delayMinSec: z.ZodOptional<z.ZodNumber>;
        delayMaxSec: z.ZodOptional<z.ZodNumber>;
        imageDelayMinSec: z.ZodOptional<z.ZodNumber>;
        imageDelayMaxSec: z.ZodOptional<z.ZodNumber>;
        downloadVideoQuality: z.ZodDefault<z.ZodEnum<["480p", "720p", "1080p"]>>;
        downloadImageQuality: z.ZodDefault<z.ZodEnum<["1k", "2k", "4k"]>>;
        downloadSubfolder: z.ZodDefault<z.ZodString>;
        autoRenameFiles: z.ZodDefault<z.ZodBoolean>;
        characterName: z.ZodOptional<z.ZodString>;
        characterInfo: z.ZodOptional<z.ZodString>;
        voiceName: z.ZodOptional<z.ZodString>;
        voiceStyle: z.ZodOptional<z.ZodString>;
        voiceSaveAs: z.ZodOptional<z.ZodString>;
        bodyPrompt: z.ZodOptional<z.ZodString>;
        maxRetries: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
        autoExtendCount: number;
        outputsPerPrompt: number;
        downloadVideoQuality: "480p" | "720p" | "1080p";
        downloadImageQuality: "1k" | "2k" | "4k";
        downloadSubfolder: string;
        autoRenameFiles: boolean;
        speed?: number | undefined;
        videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
        videoResolution?: "480p" | "720p" | undefined;
        extendPrompt?: string | undefined;
        extendSteps?: string[] | undefined;
        autoSwitchOnQuota?: boolean | undefined;
        imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
        imageModeOption?: "image-to-image" | "new-image" | undefined;
        newProject?: boolean | undefined;
        batchOutputs?: number | undefined;
        delayMinSec?: number | undefined;
        delayMaxSec?: number | undefined;
        imageDelayMinSec?: number | undefined;
        imageDelayMaxSec?: number | undefined;
        characterName?: string | undefined;
        characterInfo?: string | undefined;
        voiceName?: string | undefined;
        voiceStyle?: string | undefined;
        voiceSaveAs?: string | undefined;
        bodyPrompt?: string | undefined;
        maxRetries?: number | undefined;
    }, {
        speed?: number | undefined;
        aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
        videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
        videoResolution?: "480p" | "720p" | undefined;
        autoExtendCount?: number | undefined;
        extendPrompt?: string | undefined;
        extendSteps?: string[] | undefined;
        autoSwitchOnQuota?: boolean | undefined;
        imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
        imageModeOption?: "image-to-image" | "new-image" | undefined;
        outputsPerPrompt?: number | undefined;
        newProject?: boolean | undefined;
        batchOutputs?: number | undefined;
        delayMinSec?: number | undefined;
        delayMaxSec?: number | undefined;
        imageDelayMinSec?: number | undefined;
        imageDelayMaxSec?: number | undefined;
        downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
        downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
        downloadSubfolder?: string | undefined;
        autoRenameFiles?: boolean | undefined;
        characterName?: string | undefined;
        characterInfo?: string | undefined;
        voiceName?: string | undefined;
        voiceStyle?: string | undefined;
        voiceSaveAs?: string | undefined;
        bodyPrompt?: string | undefined;
        maxRetries?: number | undefined;
    }>;
    inputImages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        mime: z.ZodString;
        source: z.ZodEnum<["library", "bridge-token"]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        mime: string;
        source: "library" | "bridge-token";
    }, {
        id: string;
        name: string;
        mime: string;
        source: "library" | "bridge-token";
    }>, "many">>;
    assetRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    characterRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    batchIndex: z.ZodOptional<z.ZodNumber>;
} & {
    id: z.ZodString;
    status: z.ZodEnum<["queued", "waiting_for_extension", "running", "downloading", "done", "failed", "cancelled"]>;
    source: z.ZodEnum<["ui", "bridge"]>;
    client: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
    attempts: z.ZodDefault<z.ZodNumber>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
    retryHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        attempt: z.ZodNumber;
        reason: z.ZodString;
        timestamp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        attempt: number;
        reason: string;
        timestamp: number;
    }, {
        attempt: number;
        reason: string;
        timestamp: number;
    }>, "many">>;
    lastFailedAt: z.ZodOptional<z.ZodNumber>;
    stage: z.ZodOptional<z.ZodEnum<["acquiring-tab", "preparing-page", "applying-mode", "applying-settings", "attaching-images", "entering-prompt", "submitting", "generating", "collecting-results", "downloading"]>>;
    error: z.ZodOptional<z.ZodString>;
    retryable: z.ZodOptional<z.ZodBoolean>;
    files: z.ZodDefault<z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        kind: z.ZodEnum<["image", "video"]>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        kind: "image" | "video";
    }, {
        path: string;
        kind: "image" | "video";
    }>, "many">>;
    tabId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    params: {
        aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
        autoExtendCount: number;
        outputsPerPrompt: number;
        downloadVideoQuality: "480p" | "720p" | "1080p";
        downloadImageQuality: "1k" | "2k" | "4k";
        downloadSubfolder: string;
        autoRenameFiles: boolean;
        speed?: number | undefined;
        videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
        videoResolution?: "480p" | "720p" | undefined;
        extendPrompt?: string | undefined;
        extendSteps?: string[] | undefined;
        autoSwitchOnQuota?: boolean | undefined;
        imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
        imageModeOption?: "image-to-image" | "new-image" | undefined;
        newProject?: boolean | undefined;
        batchOutputs?: number | undefined;
        delayMinSec?: number | undefined;
        delayMaxSec?: number | undefined;
        imageDelayMinSec?: number | undefined;
        imageDelayMaxSec?: number | undefined;
        characterName?: string | undefined;
        characterInfo?: string | undefined;
        voiceName?: string | undefined;
        voiceStyle?: string | undefined;
        voiceSaveAs?: string | undefined;
        bodyPrompt?: string | undefined;
        maxRetries?: number | undefined;
    };
    status: "queued" | "waiting_for_extension" | "running" | "downloading" | "done" | "failed" | "cancelled";
    id: string;
    source: "ui" | "bridge";
    maxRetries: number;
    prompt: string;
    mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
    inputImages: {
        id: string;
        name: string;
        mime: string;
        source: "library" | "bridge-token";
    }[];
    createdAt: number;
    updatedAt: number;
    attempts: number;
    retryHistory: {
        attempt: number;
        reason: string;
        timestamp: number;
    }[];
    files: {
        path: string;
        kind: "image" | "video";
    }[];
    assetRefs?: string[] | undefined;
    characterRefs?: string[] | undefined;
    batchIndex?: number | undefined;
    client?: string | undefined;
    lastFailedAt?: number | undefined;
    stage?: "downloading" | "acquiring-tab" | "preparing-page" | "applying-mode" | "applying-settings" | "attaching-images" | "entering-prompt" | "submitting" | "generating" | "collecting-results" | undefined;
    error?: string | undefined;
    retryable?: boolean | undefined;
    tabId?: number | undefined;
}, {
    params: {
        speed?: number | undefined;
        aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
        videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
        videoResolution?: "480p" | "720p" | undefined;
        autoExtendCount?: number | undefined;
        extendPrompt?: string | undefined;
        extendSteps?: string[] | undefined;
        autoSwitchOnQuota?: boolean | undefined;
        imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
        imageModeOption?: "image-to-image" | "new-image" | undefined;
        outputsPerPrompt?: number | undefined;
        newProject?: boolean | undefined;
        batchOutputs?: number | undefined;
        delayMinSec?: number | undefined;
        delayMaxSec?: number | undefined;
        imageDelayMinSec?: number | undefined;
        imageDelayMaxSec?: number | undefined;
        downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
        downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
        downloadSubfolder?: string | undefined;
        autoRenameFiles?: boolean | undefined;
        characterName?: string | undefined;
        characterInfo?: string | undefined;
        voiceName?: string | undefined;
        voiceStyle?: string | undefined;
        voiceSaveAs?: string | undefined;
        bodyPrompt?: string | undefined;
        maxRetries?: number | undefined;
    };
    status: "queued" | "waiting_for_extension" | "running" | "downloading" | "done" | "failed" | "cancelled";
    id: string;
    source: "ui" | "bridge";
    prompt: string;
    mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
    createdAt: number;
    updatedAt: number;
    maxRetries?: number | undefined;
    inputImages?: {
        id: string;
        name: string;
        mime: string;
        source: "library" | "bridge-token";
    }[] | undefined;
    assetRefs?: string[] | undefined;
    characterRefs?: string[] | undefined;
    batchIndex?: number | undefined;
    client?: string | undefined;
    attempts?: number | undefined;
    retryHistory?: {
        attempt: number;
        reason: string;
        timestamp: number;
    }[] | undefined;
    lastFailedAt?: number | undefined;
    stage?: "downloading" | "acquiring-tab" | "preparing-page" | "applying-mode" | "applying-settings" | "attaching-images" | "entering-prompt" | "submitting" | "generating" | "collecting-results" | undefined;
    error?: string | undefined;
    retryable?: boolean | undefined;
    files?: {
        path: string;
        kind: "image" | "video";
    }[] | undefined;
    tabId?: number | undefined;
}>;
export type Job = z.infer<typeof JobSchema>;
export declare const BridgeFileMetaSchema: z.ZodObject<{
    token: z.ZodString;
    name: z.ZodString;
    mime: z.ZodString;
    size: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    mime: string;
    token: string;
    size: number;
}, {
    name: string;
    mime: string;
    token: string;
    size: number;
}>;
export type BridgeFileMeta = z.infer<typeof BridgeFileMetaSchema>;
export declare const SiteSchema: z.ZodEnum<["grok", "flow"]>;
export declare const BrowserSchema: z.ZodEnum<["chrome", "edge", "other"]>;
export declare const ExtToBridgeSchema: z.ZodDiscriminatedUnion<"t", [z.ZodObject<{
    t: z.ZodLiteral<"ext.hello">;
    extVersion: z.ZodString;
    loggedIn: z.ZodBoolean;
    plan: z.ZodString;
    site: z.ZodDefault<z.ZodEnum<["grok", "flow"]>>;
    browser: z.ZodOptional<z.ZodEnum<["chrome", "edge", "other"]>>;
    runningJobIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    flowTab: z.ZodOptional<z.ZodBoolean>;
    flowVisible: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    t: "ext.hello";
    extVersion: string;
    loggedIn: boolean;
    plan: string;
    site: "flow" | "grok";
    browser?: "chrome" | "edge" | "other" | undefined;
    runningJobIds?: string[] | undefined;
    flowTab?: boolean | undefined;
    flowVisible?: boolean | undefined;
}, {
    t: "ext.hello";
    extVersion: string;
    loggedIn: boolean;
    plan: string;
    site?: "flow" | "grok" | undefined;
    browser?: "chrome" | "edge" | "other" | undefined;
    runningJobIds?: string[] | undefined;
    flowTab?: boolean | undefined;
    flowVisible?: boolean | undefined;
}>, z.ZodObject<{
    t: z.ZodLiteral<"ext.heartbeat">;
}, "strip", z.ZodTypeAny, {
    t: "ext.heartbeat";
}, {
    t: "ext.heartbeat";
}>, z.ZodObject<{
    t: z.ZodLiteral<"ext.status">;
    loggedIn: z.ZodBoolean;
    plan: z.ZodString;
    usedToday: z.ZodNumber;
    dailyLimit: z.ZodNumber;
    usage: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        video: z.ZodNumber;
        image: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        image: number;
        video: number;
    }, {
        image: number;
        video: number;
    }>>>;
    limits: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        video: z.ZodNumber;
        image: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        image: number;
        video: number;
    }, {
        image: number;
        video: number;
    }>>>;
    pausedReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    activeJobs: z.ZodNumber;
    grokVisible: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    flowLayout: z.ZodOptional<z.ZodNullable<z.ZodEnum<["wide", "narrow"]>>>;
    flowAccess: z.ZodOptional<z.ZodNullable<z.ZodEnum<["ok", "blocked"]>>>;
    cooldownUntil: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lastWarning: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    browser: z.ZodOptional<z.ZodEnum<["chrome", "edge", "other"]>>;
}, "strip", z.ZodTypeAny, {
    t: "ext.status";
    loggedIn: boolean;
    plan: string;
    usedToday: number;
    dailyLimit: number;
    activeJobs: number;
    browser?: "chrome" | "edge" | "other" | undefined;
    usage?: {
        image: number;
        video: number;
    } | null | undefined;
    limits?: {
        image: number;
        video: number;
    } | null | undefined;
    pausedReason?: string | null | undefined;
    grokVisible?: boolean | null | undefined;
    flowLayout?: "wide" | "narrow" | null | undefined;
    flowAccess?: "ok" | "blocked" | null | undefined;
    cooldownUntil?: number | null | undefined;
    lastWarning?: string | null | undefined;
}, {
    t: "ext.status";
    loggedIn: boolean;
    plan: string;
    usedToday: number;
    dailyLimit: number;
    activeJobs: number;
    browser?: "chrome" | "edge" | "other" | undefined;
    usage?: {
        image: number;
        video: number;
    } | null | undefined;
    limits?: {
        image: number;
        video: number;
    } | null | undefined;
    pausedReason?: string | null | undefined;
    grokVisible?: boolean | null | undefined;
    flowLayout?: "wide" | "narrow" | null | undefined;
    flowAccess?: "ok" | "blocked" | null | undefined;
    cooldownUntil?: number | null | undefined;
    lastWarning?: string | null | undefined;
}>, z.ZodObject<{
    t: z.ZodLiteral<"job.accepted">;
    jobId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    t: "job.accepted";
    jobId: string;
}, {
    t: "job.accepted";
    jobId: string;
}>, z.ZodObject<{
    t: z.ZodLiteral<"job.progress">;
    jobId: z.ZodString;
    stage: z.ZodEnum<["acquiring-tab", "preparing-page", "applying-mode", "applying-settings", "attaching-images", "entering-prompt", "submitting", "generating", "collecting-results", "downloading"]>;
    pct: z.ZodOptional<z.ZodNumber>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    stage: "downloading" | "acquiring-tab" | "preparing-page" | "applying-mode" | "applying-settings" | "attaching-images" | "entering-prompt" | "submitting" | "generating" | "collecting-results";
    t: "job.progress";
    jobId: string;
    message?: string | undefined;
    pct?: number | undefined;
}, {
    stage: "downloading" | "acquiring-tab" | "preparing-page" | "applying-mode" | "applying-settings" | "attaching-images" | "entering-prompt" | "submitting" | "generating" | "collecting-results";
    t: "job.progress";
    jobId: string;
    message?: string | undefined;
    pct?: number | undefined;
}>, z.ZodObject<{
    t: z.ZodLiteral<"job.result">;
    jobId: z.ZodString;
    files: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        kind: z.ZodEnum<["image", "video"]>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        kind: "image" | "video";
    }, {
        path: string;
        kind: "image" | "video";
    }>, "many">;
    warning: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    files: {
        path: string;
        kind: "image" | "video";
    }[];
    t: "job.result";
    jobId: string;
    warning?: string | undefined;
}, {
    files: {
        path: string;
        kind: "image" | "video";
    }[];
    t: "job.result";
    jobId: string;
    warning?: string | undefined;
}>, z.ZodObject<{
    t: z.ZodLiteral<"job.failed">;
    jobId: z.ZodString;
    reason: z.ZodString;
    retryable: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    reason: string;
    retryable: boolean;
    t: "job.failed";
    jobId: string;
}, {
    reason: string;
    retryable: boolean;
    t: "job.failed";
    jobId: string;
}>, z.ZodObject<{
    t: z.ZodLiteral<"healthcheck.result">;
    entries: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        matched: z.ZodBoolean;
        strategy: z.ZodOptional<z.ZodString>;
        snippet: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        matched: boolean;
        strategy?: string | undefined;
        snippet?: string | undefined;
    }, {
        key: string;
        matched: boolean;
        strategy?: string | undefined;
        snippet?: string | undefined;
    }>, "many">;
    diagnostics: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    entries: {
        key: string;
        matched: boolean;
        strategy?: string | undefined;
        snippet?: string | undefined;
    }[];
    t: "healthcheck.result";
    diagnostics?: Record<string, unknown> | undefined;
}, {
    entries: {
        key: string;
        matched: boolean;
        strategy?: string | undefined;
        snippet?: string | undefined;
    }[];
    t: "healthcheck.result";
    diagnostics?: Record<string, unknown> | undefined;
}>, z.ZodObject<{
    t: z.ZodLiteral<"dom.result">;
    url: z.ZodOptional<z.ZodString>;
    roots: z.ZodOptional<z.ZodNumber>;
    items: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
}, "strip", z.ZodTypeAny, {
    t: "dom.result";
    items: Record<string, unknown>[];
    url?: string | undefined;
    roots?: number | undefined;
}, {
    t: "dom.result";
    items: Record<string, unknown>[];
    url?: string | undefined;
    roots?: number | undefined;
}>, z.ZodObject<{
    t: z.ZodLiteral<"logs.result">;
    entries: z.ZodArray<z.ZodObject<{
        ts: z.ZodNumber;
        level: z.ZodString;
        scope: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        ts: number;
        level: string;
        scope: string;
    }, {
        message: string;
        ts: number;
        level: string;
        scope: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    entries: {
        message: string;
        ts: number;
        level: string;
        scope: string;
    }[];
    t: "logs.result";
}, {
    entries: {
        message: string;
        ts: number;
        level: string;
        scope: string;
    }[];
    t: "logs.result";
}>]>;
export type ExtToBridge = z.infer<typeof ExtToBridgeSchema>;
export declare const BridgeToExtSchema: z.ZodDiscriminatedUnion<"t", [z.ZodObject<{
    t: z.ZodLiteral<"bridge.hello">;
    bridgeVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    t: "bridge.hello";
    bridgeVersion: string;
}, {
    t: "bridge.hello";
    bridgeVersion: string;
}>, z.ZodObject<{
    t: z.ZodLiteral<"job.submit">;
    jobId: z.ZodString;
    job: z.ZodObject<{
        prompt: z.ZodString;
        mode: z.ZodEnum<["flow-text-to-image", "flow-image-to-image", "flow-text-to-video", "flow-frame-to-video", "flow-ingredients-to-video", "flow-video-to-video", "flow-create-character", "flow-set-voice", "flow-extend-video", "flow-rename-asset", "flow-upload-assets", "text-to-image", "image-to-image", "text-to-video", "frame-to-video", "ingredients-to-video"]>;
        params: z.ZodObject<{
            aspectRatio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1", "2:3", "3:2", "4:3", "3:4"]>>;
            videoOption: z.ZodOptional<z.ZodEnum<["4s", "6s", "8s", "10s", "15s", "6s-concat", "10s-concat", "15s-concat"]>>;
            videoResolution: z.ZodOptional<z.ZodEnum<["480p", "720p"]>>;
            autoExtendCount: z.ZodDefault<z.ZodNumber>;
            extendPrompt: z.ZodOptional<z.ZodString>;
            extendSteps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            autoSwitchOnQuota: z.ZodOptional<z.ZodBoolean>;
            imageModel: z.ZodOptional<z.ZodEnum<["quality", "speed", "nano-banana-pro", "nano-banana-2", "nano-banana-2-lite", "omni-flash", "veo-3.1-lite", "veo-3.1-fast", "veo-3.1-quality"]>>;
            imageModeOption: z.ZodOptional<z.ZodEnum<["new-image", "image-to-image"]>>;
            outputsPerPrompt: z.ZodDefault<z.ZodNumber>;
            newProject: z.ZodOptional<z.ZodBoolean>;
            batchOutputs: z.ZodOptional<z.ZodNumber>;
            speed: z.ZodOptional<z.ZodNumber>;
            delayMinSec: z.ZodOptional<z.ZodNumber>;
            delayMaxSec: z.ZodOptional<z.ZodNumber>;
            imageDelayMinSec: z.ZodOptional<z.ZodNumber>;
            imageDelayMaxSec: z.ZodOptional<z.ZodNumber>;
            downloadVideoQuality: z.ZodDefault<z.ZodEnum<["480p", "720p", "1080p"]>>;
            downloadImageQuality: z.ZodDefault<z.ZodEnum<["1k", "2k", "4k"]>>;
            downloadSubfolder: z.ZodDefault<z.ZodString>;
            autoRenameFiles: z.ZodDefault<z.ZodBoolean>;
            characterName: z.ZodOptional<z.ZodString>;
            characterInfo: z.ZodOptional<z.ZodString>;
            voiceName: z.ZodOptional<z.ZodString>;
            voiceStyle: z.ZodOptional<z.ZodString>;
            voiceSaveAs: z.ZodOptional<z.ZodString>;
            bodyPrompt: z.ZodOptional<z.ZodString>;
            maxRetries: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
            autoExtendCount: number;
            outputsPerPrompt: number;
            downloadVideoQuality: "480p" | "720p" | "1080p";
            downloadImageQuality: "1k" | "2k" | "4k";
            downloadSubfolder: string;
            autoRenameFiles: boolean;
            speed?: number | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        }, {
            speed?: number | undefined;
            aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            autoExtendCount?: number | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            outputsPerPrompt?: number | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
            downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
            downloadSubfolder?: string | undefined;
            autoRenameFiles?: boolean | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        }>;
        inputImages: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            mime: z.ZodString;
            source: z.ZodEnum<["library", "bridge-token"]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }, {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }>, "many">>;
        assetRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        characterRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        batchIndex: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        params: {
            aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
            autoExtendCount: number;
            outputsPerPrompt: number;
            downloadVideoQuality: "480p" | "720p" | "1080p";
            downloadImageQuality: "1k" | "2k" | "4k";
            downloadSubfolder: string;
            autoRenameFiles: boolean;
            speed?: number | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        };
        prompt: string;
        mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
        inputImages: {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }[];
        assetRefs?: string[] | undefined;
        characterRefs?: string[] | undefined;
        batchIndex?: number | undefined;
    }, {
        params: {
            speed?: number | undefined;
            aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            autoExtendCount?: number | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            outputsPerPrompt?: number | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
            downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
            downloadSubfolder?: string | undefined;
            autoRenameFiles?: boolean | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        };
        prompt: string;
        mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
        inputImages?: {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }[] | undefined;
        assetRefs?: string[] | undefined;
        characterRefs?: string[] | undefined;
        batchIndex?: number | undefined;
    }>;
    inputFiles: z.ZodArray<z.ZodObject<{
        token: z.ZodString;
        name: z.ZodString;
        mime: z.ZodString;
        size: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        mime: string;
        token: string;
        size: number;
    }, {
        name: string;
        mime: string;
        token: string;
        size: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    t: "job.submit";
    jobId: string;
    job: {
        params: {
            aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
            autoExtendCount: number;
            outputsPerPrompt: number;
            downloadVideoQuality: "480p" | "720p" | "1080p";
            downloadImageQuality: "1k" | "2k" | "4k";
            downloadSubfolder: string;
            autoRenameFiles: boolean;
            speed?: number | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        };
        prompt: string;
        mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
        inputImages: {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }[];
        assetRefs?: string[] | undefined;
        characterRefs?: string[] | undefined;
        batchIndex?: number | undefined;
    };
    inputFiles: {
        name: string;
        mime: string;
        token: string;
        size: number;
    }[];
}, {
    t: "job.submit";
    jobId: string;
    job: {
        params: {
            speed?: number | undefined;
            aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            autoExtendCount?: number | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            outputsPerPrompt?: number | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
            downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
            downloadSubfolder?: string | undefined;
            autoRenameFiles?: boolean | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        };
        prompt: string;
        mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
        inputImages?: {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }[] | undefined;
        assetRefs?: string[] | undefined;
        characterRefs?: string[] | undefined;
        batchIndex?: number | undefined;
    };
    inputFiles: {
        name: string;
        mime: string;
        token: string;
        size: number;
    }[];
}>, z.ZodObject<{
    t: z.ZodLiteral<"job.cancel">;
    jobId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    t: "job.cancel";
    jobId: string;
}, {
    t: "job.cancel";
    jobId: string;
}>, z.ZodObject<{
    t: z.ZodLiteral<"queue.stop">;
}, "strip", z.ZodTypeAny, {
    t: "queue.stop";
}, {
    t: "queue.stop";
}>, z.ZodObject<{
    t: z.ZodLiteral<"queue.clear">;
}, "strip", z.ZodTypeAny, {
    t: "queue.clear";
}, {
    t: "queue.clear";
}>, z.ZodObject<{
    t: z.ZodLiteral<"ext.reload">;
}, "strip", z.ZodTypeAny, {
    t: "ext.reload";
}, {
    t: "ext.reload";
}>, z.ZodObject<{
    t: z.ZodLiteral<"status.query">;
}, "strip", z.ZodTypeAny, {
    t: "status.query";
}, {
    t: "status.query";
}>, z.ZodObject<{
    t: z.ZodLiteral<"healthcheck.run">;
}, "strip", z.ZodTypeAny, {
    t: "healthcheck.run";
}, {
    t: "healthcheck.run";
}>, z.ZodObject<{
    t: z.ZodLiteral<"logs.query">;
}, "strip", z.ZodTypeAny, {
    t: "logs.query";
}, {
    t: "logs.query";
}>, z.ZodObject<{
    t: z.ZodLiteral<"dom.query">;
    selector: z.ZodOptional<z.ZodString>;
    clickFirst: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    t: "dom.query";
    selector?: string | undefined;
    clickFirst?: string | undefined;
}, {
    t: "dom.query";
    selector?: string | undefined;
    clickFirst?: string | undefined;
}>]>;
export type BridgeToExt = z.infer<typeof BridgeToExtSchema>;
export declare const SubmitJobRequestSchema: z.ZodObject<{
    job: z.ZodObject<{
        prompt: z.ZodString;
        mode: z.ZodEnum<["flow-text-to-image", "flow-image-to-image", "flow-text-to-video", "flow-frame-to-video", "flow-ingredients-to-video", "flow-video-to-video", "flow-create-character", "flow-set-voice", "flow-extend-video", "flow-rename-asset", "flow-upload-assets", "text-to-image", "image-to-image", "text-to-video", "frame-to-video", "ingredients-to-video"]>;
        params: z.ZodObject<{
            aspectRatio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1", "2:3", "3:2", "4:3", "3:4"]>>;
            videoOption: z.ZodOptional<z.ZodEnum<["4s", "6s", "8s", "10s", "15s", "6s-concat", "10s-concat", "15s-concat"]>>;
            videoResolution: z.ZodOptional<z.ZodEnum<["480p", "720p"]>>;
            autoExtendCount: z.ZodDefault<z.ZodNumber>;
            extendPrompt: z.ZodOptional<z.ZodString>;
            extendSteps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            autoSwitchOnQuota: z.ZodOptional<z.ZodBoolean>;
            imageModel: z.ZodOptional<z.ZodEnum<["quality", "speed", "nano-banana-pro", "nano-banana-2", "nano-banana-2-lite", "omni-flash", "veo-3.1-lite", "veo-3.1-fast", "veo-3.1-quality"]>>;
            imageModeOption: z.ZodOptional<z.ZodEnum<["new-image", "image-to-image"]>>;
            outputsPerPrompt: z.ZodDefault<z.ZodNumber>;
            newProject: z.ZodOptional<z.ZodBoolean>;
            batchOutputs: z.ZodOptional<z.ZodNumber>;
            speed: z.ZodOptional<z.ZodNumber>;
            delayMinSec: z.ZodOptional<z.ZodNumber>;
            delayMaxSec: z.ZodOptional<z.ZodNumber>;
            imageDelayMinSec: z.ZodOptional<z.ZodNumber>;
            imageDelayMaxSec: z.ZodOptional<z.ZodNumber>;
            downloadVideoQuality: z.ZodDefault<z.ZodEnum<["480p", "720p", "1080p"]>>;
            downloadImageQuality: z.ZodDefault<z.ZodEnum<["1k", "2k", "4k"]>>;
            downloadSubfolder: z.ZodDefault<z.ZodString>;
            autoRenameFiles: z.ZodDefault<z.ZodBoolean>;
            characterName: z.ZodOptional<z.ZodString>;
            characterInfo: z.ZodOptional<z.ZodString>;
            voiceName: z.ZodOptional<z.ZodString>;
            voiceStyle: z.ZodOptional<z.ZodString>;
            voiceSaveAs: z.ZodOptional<z.ZodString>;
            bodyPrompt: z.ZodOptional<z.ZodString>;
            maxRetries: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
            autoExtendCount: number;
            outputsPerPrompt: number;
            downloadVideoQuality: "480p" | "720p" | "1080p";
            downloadImageQuality: "1k" | "2k" | "4k";
            downloadSubfolder: string;
            autoRenameFiles: boolean;
            speed?: number | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        }, {
            speed?: number | undefined;
            aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            autoExtendCount?: number | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            outputsPerPrompt?: number | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
            downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
            downloadSubfolder?: string | undefined;
            autoRenameFiles?: boolean | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        }>;
        inputImages: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            mime: z.ZodString;
            source: z.ZodEnum<["library", "bridge-token"]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }, {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }>, "many">>;
        assetRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        characterRefs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        batchIndex: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        params: {
            aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
            autoExtendCount: number;
            outputsPerPrompt: number;
            downloadVideoQuality: "480p" | "720p" | "1080p";
            downloadImageQuality: "1k" | "2k" | "4k";
            downloadSubfolder: string;
            autoRenameFiles: boolean;
            speed?: number | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        };
        prompt: string;
        mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
        inputImages: {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }[];
        assetRefs?: string[] | undefined;
        characterRefs?: string[] | undefined;
        batchIndex?: number | undefined;
    }, {
        params: {
            speed?: number | undefined;
            aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            autoExtendCount?: number | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            outputsPerPrompt?: number | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
            downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
            downloadSubfolder?: string | undefined;
            autoRenameFiles?: boolean | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        };
        prompt: string;
        mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
        inputImages?: {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }[] | undefined;
        assetRefs?: string[] | undefined;
        characterRefs?: string[] | undefined;
        batchIndex?: number | undefined;
    }>;
    imagePaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    client: z.ZodOptional<z.ZodString>;
    maxRetries: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    job: {
        params: {
            aspectRatio: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4";
            autoExtendCount: number;
            outputsPerPrompt: number;
            downloadVideoQuality: "480p" | "720p" | "1080p";
            downloadImageQuality: "1k" | "2k" | "4k";
            downloadSubfolder: string;
            autoRenameFiles: boolean;
            speed?: number | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        };
        prompt: string;
        mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
        inputImages: {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }[];
        assetRefs?: string[] | undefined;
        characterRefs?: string[] | undefined;
        batchIndex?: number | undefined;
    };
    imagePaths: string[];
    maxRetries?: number | undefined;
    client?: string | undefined;
}, {
    job: {
        params: {
            speed?: number | undefined;
            aspectRatio?: "16:9" | "9:16" | "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | undefined;
            videoOption?: "4s" | "6s" | "8s" | "10s" | "15s" | "6s-concat" | "10s-concat" | "15s-concat" | undefined;
            videoResolution?: "480p" | "720p" | undefined;
            autoExtendCount?: number | undefined;
            extendPrompt?: string | undefined;
            extendSteps?: string[] | undefined;
            autoSwitchOnQuota?: boolean | undefined;
            imageModel?: "omni-flash" | "veo-3.1-quality" | "quality" | "speed" | "nano-banana-pro" | "nano-banana-2" | "nano-banana-2-lite" | "veo-3.1-lite" | "veo-3.1-fast" | undefined;
            imageModeOption?: "image-to-image" | "new-image" | undefined;
            outputsPerPrompt?: number | undefined;
            newProject?: boolean | undefined;
            batchOutputs?: number | undefined;
            delayMinSec?: number | undefined;
            delayMaxSec?: number | undefined;
            imageDelayMinSec?: number | undefined;
            imageDelayMaxSec?: number | undefined;
            downloadVideoQuality?: "480p" | "720p" | "1080p" | undefined;
            downloadImageQuality?: "1k" | "2k" | "4k" | undefined;
            downloadSubfolder?: string | undefined;
            autoRenameFiles?: boolean | undefined;
            characterName?: string | undefined;
            characterInfo?: string | undefined;
            voiceName?: string | undefined;
            voiceStyle?: string | undefined;
            voiceSaveAs?: string | undefined;
            bodyPrompt?: string | undefined;
            maxRetries?: number | undefined;
        };
        prompt: string;
        mode: "flow-text-to-image" | "flow-image-to-image" | "flow-text-to-video" | "flow-frame-to-video" | "flow-ingredients-to-video" | "flow-video-to-video" | "flow-create-character" | "flow-set-voice" | "flow-extend-video" | "flow-rename-asset" | "flow-upload-assets" | "text-to-image" | "image-to-image" | "text-to-video" | "frame-to-video" | "ingredients-to-video";
        inputImages?: {
            id: string;
            name: string;
            mime: string;
            source: "library" | "bridge-token";
        }[] | undefined;
        assetRefs?: string[] | undefined;
        characterRefs?: string[] | undefined;
        batchIndex?: number | undefined;
    };
    maxRetries?: number | undefined;
    client?: string | undefined;
    imagePaths?: string[] | undefined;
}>;
export type SubmitJobRequest = z.infer<typeof SubmitJobRequestSchema>;
export interface ExtensionState {
    ws: any | null;
    extVersion: string | null;
    loggedIn: boolean | null;
    plan: string | null;
    usedToday: number | null;
    dailyLimit: number | null;
    usage: {
        video: number;
        image: number;
    } | null;
    limits: {
        video: number;
        image: number;
    } | null;
    pausedReason: string | null;
    activeJobs: number;
    grokVisible: boolean | null;
    flowLayout: "wide" | "narrow" | null;
    flowAccess: "ok" | "blocked" | null;
    cooldownUntil: number | null;
    lastWarning: string | null;
    browser: "chrome" | "edge" | "other" | null;
    takeovers: number[];
    lastSeen: number;
    standbyAt: number;
}
//# sourceMappingURL=types.d.ts.map