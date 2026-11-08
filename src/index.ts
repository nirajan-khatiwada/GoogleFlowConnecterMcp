import { createCli } from "./cli/commands.js";
import { runStdioServer } from "./mcp/server.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // If no arguments provided, or if explicitly run as mcp server, run the MCP stdio transport
  if (args.length === 0 || args[0] === "mcp") {
    await runStdioServer();
    return;
  }

  // Otherwise, handle CLI commands
  const cli = createCli();
  await cli.parseAsync(process.argv);
}

main().catch((err) => {
  // If in stdio mode, log to stderr
  process.stderr.write(`[flow-mcp] Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
