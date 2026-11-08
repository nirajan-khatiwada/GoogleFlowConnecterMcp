import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import {
  BRIDGE_DEFAULT_PORT,
  BRIDGE_HOST,
  ExtToBridgeSchema,
  SubmitJobRequestSchema,
  siteForMode,
  MODE_LIMITS,
  maxReferences,
  type BridgeFileMeta,
  type Job,
  type BridgeToExt,
} from "./types.js";
import {
  getExt,
  loadJobs,
  addJob,
  getJob,
  updateJob,
  listJobs,
  pendingJobs,
  orphanedJobs,
  clearFinished,
  expireStaleJobs,
  waitForJob,
  recordJobFailure,
  retryJob,
  retryFailedJobs,
} from "./state.js";
import { registerFile, serveFile, sweepExpiredTokens } from "../utils/files.js";
import { logger } from "../utils/logger.js";

export const BRIDGE_VERSION = "1.0.13";

const wsSite = new WeakMap<WebSocket, "flow" | "grok">();
const jobFiles = new Map<string, BridgeFileMeta[]>();
const retryTimers = new Map<string, NodeJS.Timeout>();

const healthcheckWaiters = new Map<string, Array<(res: unknown) => void>>();
const domWaiters = new Map<string, Array<(items: unknown[]) => void>>();
const logsWaiters = new Map<string, Array<(entries: unknown[]) => void>>();

export function sendToExt(site: "flow" | "grok", msg: BridgeToExt): boolean {
  const ws = getExt(site).ws;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
    return true;
  }
  return false;
}

export function dispatchJob(job: Job): boolean {
  // Never dispatch test or mock jobs to the real browser extension
  if (job.client === "test") {
    return false;
  }

  const site = siteForMode(job.mode);
  const inputFiles = jobFiles.get(job.id) ?? [];
  const sent = sendToExt(site, {
    t: "job.submit",
    jobId: job.id,
    job: {
      prompt: job.prompt,
      mode: job.mode,
      params: job.params,
      inputImages: job.inputImages,
      assetRefs: job.assetRefs,
      characterRefs: job.characterRefs,
      batchIndex: job.batchIndex,
    },
    inputFiles,
  });

  updateJob(job.id, { status: sent ? "queued" : "waiting_for_extension" });
  return sent;
}

export function flushPendingJobs(): void {
  for (const job of pendingJobs()) {
    if (job.client === "test") {
      updateJob(job.id, { status: "cancelled" });
      continue;
    }
    dispatchJob(job);
  }
}

function handleExtMessage(raw: string, ws: WebSocket): void {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (err) {
    logger.warn("bridge", "Invalid JSON from extension", err);
    return;
  }

  const result = ExtToBridgeSchema.safeParse(parsedJson);
  if (!result.success) {
    logger.warn("bridge", `Unrecognized message from extension: ${result.error.message}`);
    return;
  }

  const msg = result.data;
  const fromSite = wsSite.get(ws);
  if (fromSite && getExt(fromSite).ws === ws) {
    getExt(fromSite).lastSeen = Date.now();
  }

  switch (msg.t) {
    case "ext.hello": {
      const site = msg.site;
      const state = getExt(site);

      if (state.ws && state.ws !== ws) {
        logger.info("bridge", `Replacing older extension connection with new instance`);
        try {
          state.ws.close(4001, "replaced");
        } catch {}
      }

      wsSite.set(ws, site);
      state.ws = ws;
      state.lastSeen = Date.now();
      state.extVersion = msg.extVersion;
      state.loggedIn = msg.loggedIn;
      // In flow-mcp, we treat the user as Pro/unlimited by default!
      state.plan = msg.plan || "pro";
      state.browser = msg.browser ?? null;
      state.grokVisible = msg.flowVisible ?? true;

      logger.info(
        "bridge",
        `Extension connected for ${site} (v${msg.extVersion}, loggedIn=${msg.loggedIn}, browser=${msg.browser ?? "?"})`
      );

      // Reclaim orphaned jobs
      for (const orphan of orphanedJobs(site, msg.runningJobIds)) {
        logger.info("bridge", `Reclaiming job ${orphan.id} left running by prior session`);
        updateJob(orphan.id, { status: "waiting_for_extension", stage: undefined });
      }

      flushPendingJobs();
      break;
    }

    case "ext.status": {
      const site = wsSite.get(ws) ?? "flow";
      const state = getExt(site);
      state.loggedIn = msg.loggedIn;
      state.plan = msg.plan;
      state.usedToday = msg.usedToday;
      state.dailyLimit = msg.dailyLimit;
      state.usage = msg.usage ?? null;
      state.limits = msg.limits ?? null;
      state.pausedReason = msg.pausedReason ?? null;
      state.activeJobs = msg.activeJobs;
      state.grokVisible = msg.grokVisible ?? null;
      state.flowLayout = msg.flowLayout ?? null;
      state.flowAccess = msg.flowAccess ?? null;
      state.cooldownUntil = msg.cooldownUntil ?? null;
      state.lastWarning = msg.lastWarning ?? null;
      state.browser = msg.browser ?? state.browser;
      break;
    }

    case "ext.heartbeat": {
      break;
    }

    case "job.accepted": {
      const current = getJob(msg.jobId);
      if (current && current.status !== "cancelled") {
        updateJob(msg.jobId, { status: "running" });
      }
      break;
    }

    case "job.progress": {
      const current = getJob(msg.jobId);
      if (current && current.status !== "cancelled") {
        updateJob(msg.jobId, { stage: msg.stage, status: "running" });
        logger.debug("bridge", `Job ${msg.jobId} progress: ${msg.stage}`);
      }
      break;
    }

    case "job.result": {
      updateJob(msg.jobId, {
        status: "done",
        files: msg.files,
        stage: undefined,
        error: msg.warning,
      });
      jobFiles.delete(msg.jobId);
      logger.info("bridge", `Job ${msg.jobId} completed successfully with ${msg.files.length} file(s)`);
      break;
    }

    case "job.failed": {
      const current = getJob(msg.jobId);
      if (!current) {
        logger.warn("bridge", `job.failed received for unknown job ${msg.jobId}`);
        break;
      }

      // Clear any pending retry timer for this job if one existed
      const existingTimer = retryTimers.get(msg.jobId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        retryTimers.delete(msg.jobId);
      }

      const failResult = recordJobFailure(msg.jobId, msg.reason, msg.retryable);

      if (failResult.shouldRetry) {
        // Exponential backoff: 2s, 3s, 4.5s... capped at 15s
        const backoffMs = Math.min(2000 * Math.pow(1.5, failResult.nextAttempt - 1), 15000);
        logger.warn(
          "bridge",
          `Job ${msg.jobId} failed on attempt ${failResult.nextAttempt}/${failResult.maxRetries} (${msg.reason}). Re-queueing and retrying in ${(backoffMs / 1000).toFixed(1)}s...`
        );

        // Schedule auto-retry
        const timer = setTimeout(() => {
          retryTimers.delete(msg.jobId);
          const jobToRetry = getJob(msg.jobId);
          if (jobToRetry && jobToRetry.status === "queued") {
            logger.info("bridge", `Dispatching retry for job ${msg.jobId} (attempt ${jobToRetry.attempts}/${jobToRetry.maxRetries})`);
            dispatchJob(jobToRetry);
          }
        }, backoffMs);

        retryTimers.set(msg.jobId, timer);
        // Note: Keep jobFiles intact so files remain accessible on retry
      } else {
        logger.error(
          "bridge",
          `Job ${msg.jobId} failed permanently: ${failResult.reason} (attempts: ${failResult.nextAttempt}/${failResult.maxRetries})`
        );
        jobFiles.delete(msg.jobId);
      }
      break;
    }

    case "healthcheck.result": {
      const site = wsSite.get(ws) ?? "flow";
      const waiters = healthcheckWaiters.get(site) ?? [];
      healthcheckWaiters.set(site, []);
      for (const w of waiters) w({ entries: msg.entries, diagnostics: msg.diagnostics });
      break;
    }

    case "dom.result": {
      const site = wsSite.get(ws) ?? "flow";
      const waiters = domWaiters.get(site) ?? [];
      domWaiters.set(site, []);
      for (const w of waiters) w(msg.items);
      break;
    }

    case "logs.result": {
      const site = wsSite.get(ws) ?? "flow";
      const waiters = logsWaiters.get(site) ?? [];
      logsWaiters.set(site, []);
      for (const w of waiters) w(msg.entries);
      break;
    }
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(data));
}

async function handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${BRIDGE_HOST}`);
  const pathname = url.pathname;

  // CORS headers
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end();
    return;
  }

  expireStaleJobs();

  try {
    // Health check endpoint
    if (req.method === "GET" && pathname === "/health") {
      res.writeHead(200, {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      });
      res.end(JSON.stringify({ ok: true, status: "healthy", bridge: "flow-mcp", version: BRIDGE_VERSION }));
      return;
    }

    // Status endpoint
    if (req.method === "GET" && pathname === "/status") {
      const site = (url.searchParams.get("site") as "flow" | "grok") || "flow";
      const state = getExt(site);
      const isConnected = state.ws?.readyState === WebSocket.OPEN;

      const status = {
        bridge: "up",
        bridgeVersion: BRIDGE_VERSION,
        extensionConnected: isConnected,
        extensionVersion: state.extVersion ?? undefined,
        loggedIn: state.loggedIn,
        plan: "Free & Unlimited (No pricing)",
        pricing: null,
        usedToday: state.usedToday,
        dailyLimit: null, // Unlimited!
        usage: state.usage ?? { video: 0, image: 0 },
        limits: null, // No limits
        pausedReason: state.pausedReason,
        activeJobs: state.activeJobs,
        grokVisible: state.grokVisible,
        flowLayout: state.flowLayout,
        flowAccess: state.flowAccess,
        cooldownUntil: state.cooldownUntil,
        lastWarning: state.lastWarning,
        browser: state.browser ?? undefined,
        duplicateInstalls: false,
      };

      if (isConnected) {
        sendToExt(site, { t: "status.query" });
      }

      sendJson(res, 200, status);
      return;
    }

    // Submit job endpoint
    if (req.method === "POST" && pathname === "/jobs") {
      const raw = await readBody(req);
      const parsed = SubmitJobRequestSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        sendJson(res, 400, { error: parsed.error.message });
        return;
      }

      let files: BridgeFileMeta[] = [];
      try {
        files = await Promise.all(parsed.data.imagePaths.map(registerFile));
      } catch (err) {
        sendJson(res, 400, { error: `Invalid image path: ${err instanceof Error ? err.message : err}` });
        return;
      }

      const mode = parsed.data.job.mode;
      const limits = MODE_LIMITS[mode];
      const refCount = files.length + (parsed.data.job.assetRefs?.length ?? 0);
      const maxAllowed = maxReferences(mode, parsed.data.job.params.imageModel);

      if (refCount > maxAllowed) {
        sendJson(res, 400, {
          error: `${mode} allows at most ${maxAllowed} reference(s), got ${refCount}`,
        });
        return;
      }

      if (parsed.data.job.params.outputsPerPrompt > limits.maxOutputs) {
        sendJson(res, 400, {
          error: `${mode} allows at most ${limits.maxOutputs} output(s) per prompt`,
        });
        return;
      }

      const now = Date.now();
      const jobId = randomUUID();
      const maxRetries = parsed.data.maxRetries ?? parsed.data.job.params.maxRetries ?? 3;
      const job: Job = {
        ...parsed.data.job,
        id: jobId,
        status: "waiting_for_extension",
        source: "bridge",
        client: parsed.data.client || "flow-mcp",
        createdAt: now,
        updatedAt: now,
        attempts: 0,
        maxRetries,
        retryHistory: [],
        files: [],
        inputImages: files.map((f) => ({
          id: f.token,
          name: f.name,
          mime: f.mime,
          source: "bridge-token",
        })),
      };

      jobFiles.set(jobId, files);
      addJob(job);
      dispatchJob(job);

      logger.info("bridge", `Job submitted: ${jobId} (${job.mode})`);
      sendJson(res, 200, { jobId });
      return;
    }

    // List jobs
    if (req.method === "GET" && pathname === "/jobs") {
      sendJson(res, 200, { jobs: listJobs() });
      return;
    }

    // Specific job endpoints: /jobs/:id, /jobs/:id/wait, /jobs/:id/cancel, /jobs/:id/retry
    const jobMatch = /^\/jobs\/([\w-]+)(\/wait|\/cancel|\/retry)?$/.exec(pathname);
    if (jobMatch) {
      const [, id, action] = jobMatch;

      if (req.method === "GET" && !action) {
        const job = getJob(id);
        if (!job) {
          sendJson(res, 404, { error: "Job not found" });
          return;
        }
        sendJson(res, 200, job);
        return;
      }

      if (req.method === "GET" && action === "/wait") {
        const timeoutMs = Math.min(Number(url.searchParams.get("timeoutMs") ?? 60000), 600000);
        const job = await waitForJob(id, timeoutMs);
        if (!job) {
          sendJson(res, 404, { error: "Job not found" });
          return;
        }
        sendJson(res, 200, job);
        return;
      }

      if (req.method === "POST" && action === "/cancel") {
        const timer = retryTimers.get(id);
        if (timer) {
          clearTimeout(timer);
          retryTimers.delete(id);
        }
        const existing = getJob(id);
        if (existing) {
          sendToExt(siteForMode(existing.mode), { t: "job.cancel", jobId: id });
        }
        jobFiles.delete(id);
        const updated = updateJob(id, { status: "cancelled", error: "Cancelled by user" });
        sendJson(res, 200, updated);
        return;
      }

      if (req.method === "POST" && action === "/retry") {
        const timer = retryTimers.get(id);
        if (timer) {
          clearTimeout(timer);
          retryTimers.delete(id);
        }
        const retried = retryJob(id, { resetAttempts: true });
        if (!retried) {
          sendJson(res, 404, { error: "Job not found" });
          return;
        }
        const dispatched = dispatchJob(retried);
        sendJson(res, 200, { ok: true, dispatched, job: retried });
        return;
      }
    }

    // Stop queue
    if (req.method === "POST" && pathname === "/stop") {
      const site = (url.searchParams.get("site") as "flow" | "grok") || "flow";
      for (const [jobId, timer] of retryTimers.entries()) {
        clearTimeout(timer);
        retryTimers.delete(jobId);
      }
      const delivered = sendToExt(site, { t: "queue.stop" });
      let cancelled = 0;
      for (const job of listJobs()) {
        if (siteForMode(job.mode) !== site) continue;
        if (job.status === "queued" || job.status === "waiting_for_extension" || job.status === "running") {
          updateJob(job.id, { status: "cancelled", error: "Queue stopped by user" });
          jobFiles.delete(job.id);
          cancelled++;
        }
      }
      sendJson(res, 200, { delivered, cancelled });
      return;
    }

    // Clear queue
    if (req.method === "POST" && pathname === "/queue/clear") {
      const site = (url.searchParams.get("site") as "flow" | "grok") || "flow";
      const delivered = sendToExt(site, { t: "queue.clear" });
      const removed = clearFinished(site);
      sendJson(res, 200, { delivered, removed });
      return;
    }

    // Retry all failed jobs
    if (req.method === "POST" && pathname === "/queue/retry-failed") {
      const site = (url.searchParams.get("site") as "flow" | "grok") || "flow";
      const retriedJobs = retryFailedJobs(site, { resetAttempts: true });
      let dispatchedCount = 0;
      for (const j of retriedJobs) {
        if (dispatchJob(j)) {
          dispatchedCount++;
        }
      }
      sendJson(res, 200, {
        ok: true,
        retriedCount: retriedJobs.length,
        dispatchedCount,
        jobs: retriedJobs,
      });
      return;
    }

    // Serve uploaded files
    const fileMatch = /^\/files\/([\w-]+)$/.exec(pathname);
    if (req.method === "GET" && fileMatch) {
      serveFile(fileMatch[1], res);
      return;
    }

    // Reload extension
    if (req.method === "POST" && pathname === "/reload-extension") {
      const site = (url.searchParams.get("site") as "flow" | "grok") || "flow";
      const delivered = sendToExt(site, { t: "ext.reload" });
      sendJson(res, 200, { delivered });
      return;
    }

    sendJson(res, 404, { error: "Route not found" });
  } catch (err) {
    logger.error("bridge", "HTTP error", err);
    sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
}

export function startBridgeServer(port = BRIDGE_DEFAULT_PORT): Promise<void> {
  loadJobs();
  const server = createServer((req, res) => {
    handleHttp(req, res).catch((err) => {
      logger.error("bridge", "Unhandled request error", err);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain" }).end("Internal Server Error");
      }
    });
  });

  const wss = new WebSocketServer({
    server,
    path: "/ws",
  });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ t: "bridge.hello", bridgeVersion: BRIDGE_VERSION }));

    ws.on("message", (data) => {
      handleExtMessage(String(data), ws);
    });

    ws.on("close", () => {
      const site = wsSite.get(ws);
      if (site && getExt(site).ws === ws) {
        getExt(site).ws = null;
        wsSite.delete(ws);
        logger.info("bridge", `${site} extension disconnected`);
      }
    });

    ws.on("error", (err) => {
      logger.warn("bridge", "WebSocket client error", err);
    });
  });

  setInterval(sweepExpiredTokens, 60000).unref();

  return new Promise((resolve, reject) => {
    server.once("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        logger.info("bridge", `Bridge server already running on port ${port}`);
        resolve(); // Existing daemon already listening
      } else {
        reject(err);
      }
    });

    server.listen(port, BRIDGE_HOST, () => {
      logger.info("bridge", `flow-mcp Bridge listening on http://${BRIDGE_HOST}:${port} (ws: /ws)`);
      resolve();
    });
  });
}
