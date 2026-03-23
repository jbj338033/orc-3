import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isCliAvailable } from "../providers/cli.js";

export function registerStatus(server: McpServer) {
  server.tool(
    "orc_status",
    "check which AI providers and CLIs are configured",
    async () => {
      try {
        const checks = await Promise.all([
          isCliAvailable("codex"),
          isCliAvailable("gemini"),
        ]);

        const lines = [
          "=== orc status ===",
          "",
          "providers:",
          `  openai:      ${process.env.OPENAI_API_KEY ? "configured" : "not set"}`,
          `  gemini:      ${process.env.GEMINI_API_KEY ? "configured" : "not set"}`,
          `  openrouter:  ${process.env.OPENROUTER_API_KEY ? "configured" : "not set"}`,
          "",
          "cli tools:",
          `  codex:       ${checks[0] ? "available" : "not found"}`,
          `  gemini:      ${checks[1] ? "available" : "not found"}`,
        ];

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    },
  );
}
