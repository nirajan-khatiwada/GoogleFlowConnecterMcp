import { randomUUID } from "node:crypto";
import { statSync, createReadStream, existsSync, writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { extname, basename, resolve, join } from "node:path";
import { homedir } from "node:os";
import { logger } from "./logger.js";
const MIME_MAP = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
};
const fileTokens = new Map();
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const CACHE_DIR = join(homedir(), ".flow-mcp", "cache");
export async function registerFile(filePath) {
    let absolutePath = filePath;
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
        if (!existsSync(CACHE_DIR)) {
            mkdirSync(CACHE_DIR, { recursive: true });
        }
        const res = await fetch(filePath);
        if (!res.ok) {
            throw new Error(`Failed to download independent image from ${filePath}: HTTP ${res.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = res.headers.get("content-type")?.split(";")[0].trim() || "image/png";
        let ext = extname(new URL(filePath).pathname).toLowerCase();
        if (!ext || !MIME_MAP[ext]) {
            const foundExt = Object.entries(MIME_MAP).find(([, mime]) => mime === contentType);
            ext = foundExt ? foundExt[0] : ".png";
        }
        const filename = `img_${randomUUID().slice(0, 8)}${ext}`;
        absolutePath = join(CACHE_DIR, filename);
        writeFileSync(absolutePath, buffer);
    }
    else {
        absolutePath = resolve(filePath);
        if (!existsSync(absolutePath)) {
            throw new Error(`File does not exist: ${absolutePath}`);
        }
    }
    const ext = extname(absolutePath).toLowerCase();
    const mime = MIME_MAP[ext] || "image/png";
    const stat = statSync(absolutePath);
    const token = randomUUID();
    const meta = {
        token,
        name: basename(absolutePath),
        mime,
        size: stat.size,
    };
    fileTokens.set(token, {
        path: absolutePath,
        meta,
        expiresAt: Date.now() + TOKEN_TTL_MS,
    });
    logger.debug("files", `Registered file ${meta.name} with token ${token} (${meta.size} bytes)`);
    return meta;
}
export function serveFile(token, res) {
    let entry = fileTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
        try {
            const scanDirs = [
                join(homedir(), ".grok-auto", "runs"),
                join(homedir(), ".flow-mcp", "runs"),
            ];
            for (const runsDir of scanDirs) {
                if (!existsSync(runsDir))
                    continue;
                for (const rf of readdirSync(runsDir)) {
                    if (!rf.endsWith(".json"))
                        continue;
                    try {
                        const data = JSON.parse(readFileSync(join(runsDir, rf), "utf-8"));
                        for (const item of (data.entries || [])) {
                            if (Array.isArray(item.imagePaths)) {
                                for (const p of item.imagePaths) {
                                    if (typeof p === "string" && existsSync(p)) {
                                        const ext = extname(p).toLowerCase();
                                        const fname = basename(p);
                                        const inputImages = item.spec?.inputImages;
                                        const matchesToken = Array.isArray(inputImages) && inputImages.some((im) => im && (im.id === token || im.token === token));
                                        const matchesName = fname === token || token.includes(fname) || fname.includes(token);
                                        if (matchesToken || matchesName || (Array.isArray(item.imagePaths) && item.imagePaths.length === 1 && token.length > 20)) {
                                            const stat = statSync(p);
                                            const meta = {
                                                token,
                                                name: fname,
                                                mime: MIME_MAP[ext] || "image/jpeg",
                                                size: stat.size,
                                            };
                                            entry = { path: p, meta, expiresAt: Date.now() + TOKEN_TTL_MS };
                                            fileTokens.set(token, entry);
                                            logger.info("files", `Restored missing file token ${token} -> ${p}`);
                                            break;
                                        }
                                    }
                                }
                            }
                            if (entry)
                                break;
                        }
                    }
                    catch { }
                    if (entry)
                        break;
                }
                if (entry)
                    break;
            }
        }
        catch (err) {
            logger.warn("files", "Fallback file resolution error", err);
        }
    }
    if (!entry || !existsSync(entry.path)) {
        res.writeHead(404, { "content-type": "text/plain" }).end("File not found or token expired");
        return;
    }
    res.writeHead(200, {
        "content-type": entry.meta.mime,
        "content-length": entry.meta.size,
        "cache-control": "no-cache",
    });
    createReadStream(entry.path).pipe(res);
}
export function sweepExpiredTokens() {
    const now = Date.now();
    for (const [token, entry] of fileTokens.entries()) {
        if (entry.expiresAt < now) {
            fileTokens.delete(token);
        }
    }
}
//# sourceMappingURL=files.js.map