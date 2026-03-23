import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callGemini } from "../providers/google.js";
import { isCliAvailable, execCli } from "../providers/cli.js";

export function registerGeminiCli(server: McpServer) {
  server.tool(
    "orc_gemini_cli",
    "run a prompt via Gemini CLI or fall back to Gemini API",
    {
      prompt: z.string().describe("the prompt to send"),
      model: z.string().default("gemini-2.5-pro").describe("model to use"),
      sandbox: z.boolean().default(true).describe("run in sandbox mode"),
    },
    async ({ prompt, model, sandbox }) => {
      try {
        const hasGemini = await isCliAvailable("gemini");

        if (hasGemini) {
          const args = ["-m", model];
          if (sandbox) args.push("-s");
          args.push("-p", prompt);

          const { stdout, exitCode } = await execCli("gemini", args);
          if (exitCode !== 0) {
            return {
              content: [{ type: "text" as const, text: `gemini cli exited with code ${exitCode}\n${stdout}` }],
              isError: true,
            };
          }
          return { content: [{ type: "text" as const, text: stdout }] };
        }

        const result = await callGemini(model, prompt);
        return {
          content: [{ type: "text" as const, text: `[fallback: gemini api]\n\n${result}` }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    },
  );
}
