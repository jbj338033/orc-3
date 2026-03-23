import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callOpenAI } from "../providers/openai.js";

export function registerGpt(server: McpServer) {
  server.tool(
    "orc_gpt",
    "send a prompt to OpenAI GPT models",
    {
      prompt: z.string().describe("the prompt to send"),
      model: z.string().default("gpt-4o").describe("OpenAI model name"),
      system: z.string().optional().describe("system prompt"),
    },
    async ({ prompt, model, system }) => {
      try {
        const result = await callOpenAI(model, prompt, system);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    },
  );
}
