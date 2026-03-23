import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callOpenAI } from "../providers/openai.js";
import { callGemini } from "../providers/google.js";
import { isCliAvailable, execCli } from "../providers/cli.js";

export function registerConsensus(server: McpServer) {
  server.tool(
    "orc_consensus",
    "ask multiple AI models the same question and compare their answers",
    {
      question: z.string().describe("the question to ask all models"),
      context: z.string().optional().describe("additional context"),
    },
    async ({ question, context }) => {
      try {
        const fullPrompt = context
          ? `Context:\n${context}\n\nQuestion:\n${question}`
          : question;

        const codexPromise = (async () => {
          const hasCodex = await isCliAvailable("codex");
          if (hasCodex) {
            const { stdout } = await execCli("codex", ["exec", "-m", "o3", fullPrompt]);
            return stdout;
          }
          return callOpenAI("o3", fullPrompt);
        })();

        const results = await Promise.allSettled([
          callOpenAI("gpt-4o", fullPrompt),
          callGemini("gemini-2.5-flash", fullPrompt),
          codexPromise,
        ]);

        const labels = ["GPT-4o", "Gemini 2.5 Flash", "O3 (Codex)"];
        const sections = results.map((r, i) => {
          const status = r.status === "fulfilled" ? r.value : `error: ${r.reason}`;
          return `### ${labels[i]}\n${status}`;
        });

        const text = [
          "=== consensus results ===",
          "",
          ...sections,
          "",
          "### analysis",
          "compare the responses above to identify areas of agreement and disagreement",
        ].join("\n\n");

        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    },
  );
}
