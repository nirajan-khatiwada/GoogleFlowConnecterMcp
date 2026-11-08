export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function log(level: LogLevel, tag: string, message: string, data?: unknown): void {
  if (LEVEL_WEIGHTS[level] < LEVEL_WEIGHTS[currentLevel]) return;
  
  // In MCP stdio mode, logs must go to stderr so they don't corrupt JSON-RPC on stdout
  const isStdioMode = !process.stdout.isTTY || process.env.MCP_STDIO === "1";
  const output = isStdioMode ? process.stderr : (level === "error" ? process.stderr : process.stdout);
  
  const timestamp = new Date().toISOString().substring(11, 19);
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${tag}]`;
  
  if (data !== undefined) {
    output.write(`${prefix} ${message} ${typeof data === "string" ? data : JSON.stringify(data)}\n`);
  } else {
    output.write(`${prefix} ${message}\n`);
  }
}

export const logger = {
  debug: (tag: string, msg: string, data?: unknown) => log("debug", tag, msg, data),
  info: (tag: string, msg: string, data?: unknown) => log("info", tag, msg, data),
  warn: (tag: string, msg: string, data?: unknown) => log("warn", tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) => log("error", tag, msg, data),
};
