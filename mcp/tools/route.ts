import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callOpenAI } from "../providers/openai.js";
import { callGemini } from "../providers/google.js";
import { isCliAvailable, execCli } from "../providers/cli.js";

export function registerRoute(server: McpServer) {
  server.tool(
    "orc_route",
    "route a prompt to the best model based on capability",
    {
      prompt: z.string().describe("the prompt to send"),
      capability: z
        .enum(["reasoning", "coding", "vision", "speed"])
        .describe("desired capability"),
    },
    async ({ prompt, capability }) => {
      try {
        let result: string;
        let usedModel: string;

        switch (capability) {
          case "reasoning": {
            usedModel = "o3";
            result = await callOpenAI(usedModel, prompt);
            break;
          }
          case "coding": {
            const hasCodex = await isCliAvailable("codex");
            if (hasCodex) {
              usedModel = "codex-cli (o3)";
              const { stdout } = await execCli("codex", [
                "exec",
                "-m",
                "o3",
                prompt,
              ]);
              result = stdout;
            } else {
              usedModel = "gpt-4o";
              result = await callOpenAI(usedModel, prompt);
            }
            break;
          }
          case "vision": {
            usedModel = "gemini-2.5-flash";
            result = await callGemini(usedModel, prompt);
            break;
          }
          case "speed": {
            usedModel = "gemini-2.5-flash";
            result = await callGemini(usedModel, prompt);
            break;
          }
        }

        const text = `[routed to ${usedModel}]\n\n${result}`;
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    },
  );
}
