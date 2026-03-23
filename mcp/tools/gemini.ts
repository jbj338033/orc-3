import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callGemini } from "../providers/google.js";

export function registerGemini(server: McpServer) {
  server.tool(
    "orc_gemini",
    "send a prompt to Google Gemini models",
    {
      prompt: z.string().describe("the prompt to send"),
      model: z.string().default("gemini-2.5-flash").describe("Gemini model name"),
      system: z.string().optional().describe("system prompt"),
    },
    async ({ prompt, model, system }) => {
      try {
        const result = await callGemini(model, prompt, system);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    },
  );
}
