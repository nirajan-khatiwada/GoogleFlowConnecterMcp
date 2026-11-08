import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { logger } from "../utils/logger.js";
const DATA_DIR = join(homedir(), ".flow-mcp");
const JOBS_FILE = join(DATA_DIR, "jobs.json");
const jobs = new Map();
const jobWaiters = new Map();
export function freshExtState() {
    return {
        ws: null,
        extVersion: null,
        loggedIn: null,
        plan: "Free & Unlimited (No pricing)", // 100% Free Forever
        usedToday: 0,
        dailyLimit: null, // Unlimited!
        usage: { video: 0, image: 0 },
        limits: null, // No limits
        pausedReason: null,
        activeJobs: 0,
        grokVisible: null,
        flowLayout: null,
        flowAccess: null,
        cooldownUntil: null,
        lastWarning: null,
        browser: null,
        takeovers: [],
        lastSeen: 0,
        standbyAt: 0,
    };
}
const extensions = new Map();
export function getExt(site = "flow") {
    let state = extensions.get(site);
    if (!state) {
        state = freshExtState();
        extensions.set(site, state);
    }
    return state;
}
export function loadJobs() {
    try {
        if (!existsSync(DATA_DIR)) {
            mkdirSync(DATA_DIR, { recursive: true });
        }
        if (existsSync(JOBS_FILE)) {
            const data = JSON.parse(readFileSync(JOBS_FILE, "utf-8"));
            jobs.clear();
            for (const job of data) {
                if (job.client !== "test") {
                    jobs.set(job.id, job);
                }
            }
            logger.debug("state", `Loaded ${jobs.size} jobs from ${JOBS_FILE}`);
        }
    }
    catch (err) {
        logger.warn("state", "Could not load saved jobs", err);
    }
}
export function saveJobs() {
    try {
        if (!existsSync(DATA_DIR)) {
            mkdirSync(DATA_DIR, { recursive: true });
        }
        const list = Array.from(jobs.values())
            .filter((j) => j.client !== "test")
            .slice(-200); // keep recent 200
        writeFileSync(JOBS_FILE, JSON.stringify(list, null, 2), "utf-8");
    }
    catch (err) {
        logger.warn("state", "Could not save jobs to disk", err);
    }
}
export function addJob(job) {
    jobs.set(job.id, job);
    saveJobs();
    notifyWaiters(job);
}
export function getJob(id) {
    return jobs.get(id);
}
export function listJobs() {
    return Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
}
export function updateJob(id, patch) {
    const existing = jobs.get(id);
    if (!existing)
        return undefined;
    const updated = {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
    };
    jobs.set(id, updated);
    saveJobs();
    notifyWaiters(updated);
    return updated;
}
export function pendingJobs() {
    return Array.from(jobs.values()).filter((j) => j.client !== "test" && (j.status === "waiting_for_extension" || j.status === "queued"));
}
export function orphanedJobs(site, runningJobIds = []) {
    const runningSet = new Set(runningJobIds);
    return Array.from(jobs.values()).filter((j) => j.client !== "test" &&
        (j.mode.startsWith("flow-") ? "flow" : "grok") === site &&
        (j.status === "running" || j.status === "downloading") &&
        !runningSet.has(j.id));
}
export function clearFinished(site) {
    let count = 0;
    for (const [id, job] of jobs.entries()) {
        const jobSite = job.mode.startsWith("flow-") ? "flow" : "grok";
        if (job.client === "test" ||
            (jobSite === site && (job.status === "done" || job.status === "failed" || job.status === "cancelled"))) {
            jobs.delete(id);
            count++;
        }
    }
    if (count > 0)
        saveJobs();
    return count;
}
export function expireStaleJobs() {
    const now = Date.now();
    let count = 0;
    for (const [id, job] of jobs.entries()) {
        if ((job.status === "running" || job.status === "downloading") &&
            now - job.updatedAt > 30 * 60 * 1000 // 30 mins with no progress
        ) {
            updateJob(id, {
                status: "failed",
                error: "Job timed out with no activity for 30 minutes",
                retryable: false,
            });
            count++;
        }
    }
    return count;
}
export function recordJobFailure(id, reason, retryable = true) {
    const existing = jobs.get(id);
    if (!existing) {
        return { shouldRetry: false, job: undefined, nextAttempt: 1, maxRetries: 3, reason };
    }
    const currentAttempts = existing.attempts ?? 0;
    const maxRetries = existing.maxRetries ?? 3;
    const nextAttempt = currentAttempts + 1;
    const isRetryable = retryable !== false;
    const shouldRetry = isRetryable && nextAttempt <= maxRetries;
    const history = existing.retryHistory ? [...existing.retryHistory] : [];
    history.push({
        attempt: nextAttempt,
        reason,
        timestamp: Date.now(),
    });
    const updated = {
        ...existing,
        attempts: nextAttempt,
        stage: undefined,
        retryable: isRetryable,
        retryHistory: history,
        lastFailedAt: Date.now(),
        updatedAt: Date.now(),
        ...(shouldRetry
            ? {
                status: "queued",
                error: `Attempt ${nextAttempt}/${maxRetries} failed: ${reason}. Queued for retry...`,
            }
            : {
                status: "failed",
                error: currentAttempts >= maxRetries
                    ? `Exceeded max retries (${maxRetries}): ${reason}`
                    : reason,
            }),
    };
    jobs.set(id, updated);
    saveJobs();
    notifyWaiters(updated);
    return { shouldRetry, job: updated, nextAttempt, maxRetries, reason };
}
export function retryJob(id, options) {
    const existing = jobs.get(id);
    if (!existing)
        return undefined;
    const attempts = options?.resetAttempts ? 0 : (existing.attempts ?? 0);
    const updated = {
        ...existing,
        status: "queued",
        stage: undefined,
        error: undefined,
        attempts,
        updatedAt: Date.now(),
    };
    jobs.set(id, updated);
    saveJobs();
    notifyWaiters(updated);
    return updated;
}
export function retryFailedJobs(site = "flow", options) {
    const retried = [];
    for (const job of jobs.values()) {
        const jobSite = job.mode.startsWith("flow-") ? "flow" : "grok";
        if (jobSite === site &&
            (job.status === "failed" || job.status === "cancelled")) {
            const res = retryJob(job.id, options);
            if (res)
                retried.push(res);
        }
    }
    return retried;
}
function notifyWaiters(job) {
    const waiters = jobWaiters.get(job.id);
    if (!waiters || waiters.length === 0)
        return;
    if (job.status === "done" || job.status === "failed" || job.status === "cancelled") {
        for (const cb of waiters) {
            try {
                cb(job);
            }
            catch (err) {
                logger.error("state", "Waiter callback error", err);
            }
        }
        jobWaiters.delete(job.id);
    }
}
export function waitForJob(jobId, timeoutMs = 60000) {
    const existing = jobs.get(jobId);
    if (!existing)
        return Promise.resolve(null);
    if (existing.status === "done" || existing.status === "failed" || existing.status === "cancelled") {
        return Promise.resolve(existing);
    }
    return new Promise((resolve) => {
        let resolved = false;
        const timer = setTimeout(() => {
            if (resolved)
                return;
            resolved = true;
            const currentWaiters = jobWaiters.get(jobId) ?? [];
            jobWaiters.set(jobId, currentWaiters.filter((w) => w !== onUpdate));
            resolve(jobs.get(jobId) ?? null);
        }, timeoutMs);
        const onUpdate = (job) => {
            if (resolved)
                return;
            resolved = true;
            clearTimeout(timer);
            resolve(job);
        };
        const currentWaiters = jobWaiters.get(jobId) ?? [];
        jobWaiters.set(jobId, [...currentWaiters, onUpdate]);
    });
}
//# sourceMappingURL=state.js.map