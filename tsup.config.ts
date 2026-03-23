import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      "hooks/pretooluse": "hooks/src/pretooluse.ts",
      "hooks/stop": "hooks/src/stop.ts",
      "hooks/session-end": "hooks/src/session-end.ts",
    },
    outDir: "dist",
    format: "esm",
    target: "node20",
    platform: "node",
    splitting: false,
    noExternal: [/(.*)/],
    outExtension: () => ({ js: ".mjs" }),
  },
  {
    entry: {
      "mcp/server": "mcp/server.ts",
    },
    outDir: "dist",
    format: "esm",
    target: "node20",
    platform: "node",
    splitting: false,
    noExternal: [/(.*)/],
    outExtension: () => ({ js: ".mjs" }),
  },
]);
