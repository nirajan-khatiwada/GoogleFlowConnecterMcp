export type LogLevel = "debug" | "info" | "warn" | "error";
export declare function setLogLevel(level: LogLevel): void;
export declare function log(level: LogLevel, tag: string, message: string, data?: unknown): void;
export declare const logger: {
    debug: (tag: string, msg: string, data?: unknown) => void;
    info: (tag: string, msg: string, data?: unknown) => void;
    warn: (tag: string, msg: string, data?: unknown) => void;
    error: (tag: string, msg: string, data?: unknown) => void;
};
//# sourceMappingURL=logger.d.ts.map