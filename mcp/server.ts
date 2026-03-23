import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGpt } from "./tools/gpt.js";
import { registerGemini } from "./tools/gemini.js";
import { registerRoute } from "./tools/route.js";
import { registerStatus } from "./tools/status.js";
import { registerCodex } from "./tools/codex.js";
import { registerGeminiCli } from "./tools/gemini-cli.js";
import { registerConsensus } from "./tools/consensus.js";

const server = new McpServer({
  name: "orc",
  version: "1.0.0",
});

registerGpt(server);
registerGemini(server);
registerRoute(server);
registerStatus(server);
registerCodex(server);
registerGeminiCli(server);
registerConsensus(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[orc] mcp server started");
