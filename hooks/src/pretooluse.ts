import { readStdin } from "./env.js";

const DANGEROUS_PATTERNS = [
  /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?\/(?!\w)/,  // rm -rf /
  /\bmkfs\b/,
  /\bdd\s+if=/,
  /\bformat\b/,
  />\s*\/dev\/sd/,
  /\bgit\s+push\s+.*--force\s+.*\b(main|master)\b/,
  /\bgit\s+reset\s+--hard\s+origin\/(main|master)\b/,
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
            permissionDecisionReason: `blocked by orc: dangerous command matches ${pattern.source}`,
          },
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
