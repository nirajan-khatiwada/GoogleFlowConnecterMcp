import test from "node:test";
import assert from "node:assert/strict";
import { startBridgeServer } from "../dist/bridge/server.js";
import { registerFile } from "../dist/utils/files.js";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_PORT = 8792;

test("Bridge Server & Protocol Verification", async (t) => {
  await t.test("Bridge server starts and responds to /health", async () => {
    await startBridgeServer(TEST_PORT);
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.bridge, "flow-mcp");
  });

  await t.test("Status returns 100% Free & Unlimited status", async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/status?site=flow`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.bridge, "up");
    assert.equal(data.plan, "Free & Unlimited (No pricing)");
    assert.equal(data.dailyLimit, null);
  });

  await t.test("File registration and HTTP streaming", async () => {
    const tempFile = join(tmpdir(), "test_img.png");
    writeFileSync(tempFile, Buffer.from("fake-png-content"));

    const meta = await registerFile(tempFile);
    assert.ok(meta.token);
    assert.equal(meta.name, "test_img.png");
    assert.equal(meta.mime, "image/png");

    const fileRes = await fetch(`http://127.0.0.1:${TEST_PORT}/files/${meta.token}`);
    assert.equal(fileRes.status, 200);
    assert.equal(fileRes.headers.get("content-type"), "image/png");
    const content = await fileRes.text();
    assert.equal(content, "fake-png-content");

    unlinkSync(tempFile);
  });

  await t.test("Job submission and listing", async () => {
    const payload = {
      job: {
        prompt: "A beautiful sunrise over Kyoto",
        mode: "flow-text-to-image",
        params: {
          aspectRatio: "16:9",
          outputsPerPrompt: 1,
        },
        inputImages: [],
      },
      imagePaths: [],
      client: "test",
    };

    const submitRes = await fetch(`http://127.0.0.1:${TEST_PORT}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(submitRes.status, 200);
    const { jobId } = await submitRes.json();
    assert.ok(jobId);

    const listRes = await fetch(`http://127.0.0.1:${TEST_PORT}/jobs`);
    assert.equal(listRes.status, 200);
    const { jobs } = await listRes.json();
    const createdJob = jobs.find((j) => j.id === jobId);
    assert.ok(createdJob);
    assert.equal(createdJob.prompt, "A beautiful sunrise over Kyoto");
    assert.equal(createdJob.status, "waiting_for_extension");

    // Clean up test job immediately so it never persists to disk
    await fetch(`http://127.0.0.1:${TEST_PORT}/queue/clear?site=flow`, { method: "POST" });
  });

  await t.test("Job failure recording, auto-retry state transitions and manual retry", async () => {
    // 1. Submit a job
    const payload = {
      job: {
        prompt: "A drone shot of an ancient fortress in Rajasthan",
        mode: "flow-text-to-video",
        params: {
          aspectRatio: "16:9",
          videoOption: "6s",
          outputsPerPrompt: 1,
          maxRetries: 2,
        },
        inputImages: [],
      },
      imagePaths: [],
      client: "test",
      maxRetries: 2,
    };

    const submitRes = await fetch(`http://127.0.0.1:${TEST_PORT}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(submitRes.status, 200);
    const { jobId } = await submitRes.json();
    assert.ok(jobId);

    // Import state helper
    const { getJob, recordJobFailure, retryJob, retryFailedJobs } = await import("../dist/bridge/state.js");

    const job = getJob(jobId);
    assert.ok(job);
    assert.equal(job.maxRetries, 2);
    assert.equal(job.attempts, 0);

    // Simulate first failure (attempt 1 of 2) -> Should trigger retry
    const res1 = recordJobFailure(jobId, "Network glitch or tab lag", true);
    assert.equal(res1.shouldRetry, true);
    assert.equal(res1.nextAttempt, 1);
    assert.equal(res1.job?.status, "queued");
    assert.ok(res1.job?.error?.includes("Attempt 1/2 failed"));
    assert.equal(res1.job?.retryHistory?.length, 1);

    // Simulate second failure (attempt 2 of 2) -> Should trigger retry
    const res2 = recordJobFailure(jobId, "Element render timeout", true);
    assert.equal(res2.shouldRetry, true);
    assert.equal(res2.nextAttempt, 2);
    assert.equal(res2.job?.status, "queued");
    assert.ok(res2.job?.error?.includes("Attempt 2/2 failed"));
    assert.equal(res2.job?.retryHistory?.length, 2);

    // Simulate third failure (attempt 3 of 2) -> Exceeds maxRetries -> Should NOT retry
    const res3 = recordJobFailure(jobId, "Quota temporarily paused", true);
    assert.equal(res3.shouldRetry, false);
    assert.equal(res3.nextAttempt, 3);
    assert.equal(res3.job?.status, "failed");
    assert.ok(res3.job?.error?.includes("Exceeded max retries (2)"));

    // Test manual retry endpoint: POST /jobs/:id/retry
    const retryHttpRes = await fetch(`http://127.0.0.1:${TEST_PORT}/jobs/${jobId}/retry`, {
      method: "POST",
    });
    assert.equal(retryHttpRes.status, 200);
    const retryHttpData = await retryHttpRes.json();
    assert.equal(retryHttpData.ok, true);
    assert.equal(retryHttpData.job.status, "queued");
    assert.equal(retryHttpData.job.attempts, 0);
    assert.equal(retryHttpData.job.error, undefined);

    // Mark failed again to test batch retry: POST /queue/retry-failed
    recordJobFailure(jobId, "Simulated batch test failure", false);
    const failedJob = getJob(jobId);
    assert.equal(failedJob?.status, "failed");

    const batchRetryRes = await fetch(`http://127.0.0.1:${TEST_PORT}/queue/retry-failed?site=flow`, {
      method: "POST",
    });
    assert.equal(batchRetryRes.status, 200);
    const batchData = await batchRetryRes.json();
    assert.equal(batchData.ok, true);
    assert.ok(batchData.retriedCount >= 1);
    const retriedBatchJob = getJob(jobId);
    assert.equal(retriedBatchJob?.status, "queued");

    // Clean up test job
    await fetch(`http://127.0.0.1:${TEST_PORT}/queue/clear?site=flow`, { method: "POST" });
  });

  setTimeout(() => process.exit(0), 100);
});
