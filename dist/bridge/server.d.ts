import { type Job, type BridgeToExt } from "./types.js";
export declare const BRIDGE_VERSION = "1.0.13";
export declare function sendToExt(site: "flow" | "grok", msg: BridgeToExt): boolean;
export declare function dispatchJob(job: Job): boolean;
export declare function flushPendingJobs(): void;
export declare function startBridgeServer(port?: number): Promise<void>;
//# sourceMappingURL=server.d.ts.map