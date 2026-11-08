import type { ServerResponse } from "node:http";
import type { BridgeFileMeta } from "../bridge/types.js";
export declare function registerFile(filePath: string): Promise<BridgeFileMeta>;
export declare function serveFile(token: string, res: ServerResponse): void;
export declare function sweepExpiredTokens(): void;
//# sourceMappingURL=files.d.ts.map