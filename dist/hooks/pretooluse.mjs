// hooks/src/env.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
var STALE_MS = 2 * 60 * 60 * 1e3;
async function readStdin(timeoutMs = 2e3) {
  return new Promise((resolve) => {
    const chunks = [];
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        process.stdin.removeAllListeners();
        process.stdin.destroy();
        resolve(Buffer.concat(chunks).toString("utf-8"));
      }
    }, timeoutMs);
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks).toString("utf-8"));
      }
    });
    process.stdin.on("error", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve("");
      }
    });
  });
}

// hooks/src/pretooluse.ts
var DANGEROUS_PATTERNS = [
  /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?\/(?!\w)/,
  // rm -rf /
  /\bmkfs\b/,
  /\bdd\s+if=/,
  /\bformat\b/,
  />\s*\/dev\/sd/,
  /\bgit\s+push\s+.*--force\s+.*\b(main|master)\b/,
  /\bgit\s+reset\s+--hard\s+origin\/(main|master)\b/
];
async function main() {
  try {
    const raw = await readStdin();
    if (!raw) process.exit(0);
    const input = JSON.parse(raw);
    if (input.tool_name !== "Bash") process.exit(0);
    const command = String(input.tool_input?.command ?? "");
    if (!command) process.exit(0);
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        console.log(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: `blocked by orc: dangerous command matches ${pattern.source}`
          }
        }));
        process.exit(0);
      }
    }
    process.exit(0);
  } catch {
    process.exit(0);
  }
}
main();
