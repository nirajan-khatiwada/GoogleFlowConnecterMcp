import type { ExtensionState, Job } from "./types.js";
export declare function freshExtState(): ExtensionState;
export declare function getExt(site?: "flow" | "grok"): ExtensionState;
export declare function loadJobs(): void;
export declare function saveJobs(): void;
export declare function addJob(job: Job): void;
export declare function getJob(id: string): Job | undefined;
export declare function listJobs(): Job[];
export declare function updateJob(id: string, patch: Partial<Job>): Job | undefined;
export declare function pendingJobs(): Job[];
export declare function orphanedJobs(site: string, runningJobIds?: string[]): Job[];
export declare function clearFinished(site: string): number;
export declare function expireStaleJobs(): number;
export interface FailureResult {
    shouldRetry: boolean;
    job: Job | undefined;
    nextAttempt: number;
    maxRetries: number;
    reason: string;
}
export declare function recordJobFailure(id: string, reason: string, retryable?: boolean): FailureResult;
export declare function retryJob(id: string, options?: {
    resetAttempts?: boolean;
}): Job | undefined;
export declare function retryFailedJobs(site?: string, options?: {
    resetAttempts?: boolean;
}): Job[];
export declare function waitForJob(jobId: string, timeoutMs?: number): Promise<Job | null>;
//# sourceMappingURL=state.d.ts.map