// hooks/src/env.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
function orcDir(cwd) {
  return join(cwd, ".orc");
}
function sessionDir(cwd, sessionId) {
  return join(orcDir(cwd), "sessions", sessionId);
}
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
function readSession(cwd, sessionId) {
  const path = join(sessionDir(cwd, sessionId), "session.json");
  return readJson(path);
}
function writeSession(cwd, sessionId, session) {
  const dir = sessionDir(cwd, sessionId);
  ensureDir(dir);
  writeJson(join(dir, "session.json"), session);
}
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
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}
function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

// hooks/src/session-end.ts
async function main() {
  try {
    const raw = await readStdin();
    if (!raw) return;
    const input = JSON.parse(raw);
    const cwd = input.cwd || process.cwd();
    const sessionId = input.session_id;
    if (!sessionId) return;
    const session = readSession(cwd, sessionId);
    if (session && session.active) {
      session.active = false;
      writeSession(cwd, sessionId, session);
    }
  } catch {
  }
}
main();
