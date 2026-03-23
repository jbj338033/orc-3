import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callOpenAI } from "../providers/openai.js";
import { isCliAvailable, execCli } from "../providers/cli.js";

export function registerCodex(server: McpServer) {
  server.tool(
    "orc_codex",
    "run a prompt via Codex CLI or fall back to OpenAI API",
    {
      prompt: z.string().describe("the prompt to send"),
      model: z.string().default("o3").describe("model to use"),
      writable: z.boolean().default(false).describe("allow file writes (full-auto mode)"),
    },
    async ({ prompt, model, writable }) => {
      try {
        const hasCodex = await isCliAvailable("codex");

        if (hasCodex) {
          const args = ["exec", "-m", model];
          if (writable) args.push("--full-auto");
          args.push(prompt);

          const { stdout, exitCode } = await execCli("codex", args);
          if (exitCode !== 0) {
            return {
              content: [{ type: "text" as const, text: `codex exited with code ${exitCode}\n${stdout}` }],
              isError: true,
            };
          }
          return { content: [{ type: "text" as const, text: stdout }] };
        }

        const result = await callOpenAI(model, prompt);
        return {
          content: [{ type: "text" as const, text: `[fallback: openai api]\n\n${result}` }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    },
  );
}
