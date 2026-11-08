const LEVEL_WEIGHTS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
let currentLevel = process.env.LOG_LEVEL || "info";
export function setLogLevel(level) {
    currentLevel = level;
}
export function log(level, tag, message, data) {
    if (LEVEL_WEIGHTS[level] < LEVEL_WEIGHTS[currentLevel])
        return;
    // In MCP stdio mode, logs must go to stderr so they don't corrupt JSON-RPC on stdout
    const isStdioMode = !process.stdout.isTTY || process.env.MCP_STDIO === "1";
    const output = isStdioMode ? process.stderr : (level === "error" ? process.stderr : process.stdout);
    const timestamp = new Date().toISOString().substring(11, 19);
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${tag}]`;
    if (data !== undefined) {
        output.write(`${prefix} ${message} ${typeof data === "string" ? data : JSON.stringify(data)}\n`);
    }
    else {
        output.write(`${prefix} ${message}\n`);
    }
}
export const logger = {
    debug: (tag, msg, data) => log("debug", tag, msg, data),
    info: (tag, msg, data) => log("info", tag, msg, data),
    warn: (tag, msg, data) => log("warn", tag, msg, data),
    error: (tag, msg, data) => log("error", tag, msg, data),
};
//# sourceMappingURL=logger.js.map