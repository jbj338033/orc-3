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
function readPrd(cwd, sessionId) {
  const path = join(sessionDir(cwd, sessionId), "prd.json");
  return readJson(path);
}
function writePrd(cwd, sessionId, prd) {
  const dir = sessionDir(cwd, sessionId);
  ensureDir(dir);
  writeJson(join(dir, "prd.json"), prd);
}
function nextIncompleteStory(prd) {
  return prd.stories.find((s) => !s.passes) ?? null;
}
function allStoriesComplete(prd) {
  return prd.stories.length > 0 && prd.stories.every((s) => s.passes);
}
var MAX_CONSECUTIVE_ERRORS = 3;
function shouldBreak(prd) {
  const errors = prd.errors;
  if (errors.length < MAX_CONSECUTIVE_ERRORS) return false;
  const last = errors.slice(-MAX_CONSECUTIVE_ERRORS);
  return last.every((e) => e === last[0]);
}
var STALE_MS = 2 * 60 * 60 * 1e3;
function isStale(session) {
  const started = new Date(session.started_at).getTime();
  return Date.now() - started > STALE_MS;
}
function estimateContextPercent(transcriptPath) {
  try {
    const content = readFileSync(transcriptPath, "utf-8");
    const windowMatches = content.match(/"context_window"\s{0,5}:\s{0,5}(\d+)/g);
    const inputMatches = content.match(/"input_tokens"\s{0,5}:\s{0,5}(\d+)/g);
    if (!windowMatches || !inputMatches) return 0;
    const lastWindow = parseInt(windowMatches[windowMatches.length - 1].match(/(\d+)/)[1]);
    const lastInput = parseInt(inputMatches[inputMatches.length - 1].match(/(\d+)/)[1]);
    if (lastWindow === 0) return 0;
    return Math.round(lastInput / lastWindow * 100);
  } catch {
    return 0;
  }
}
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
function outputBlock(reason) {
  console.log(JSON.stringify({ decision: "block", reason }));
}
function outputAllow() {
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
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

// hooks/src/stop.ts
async function main() {
  try {
    const raw = await readStdin();
    if (!raw) {
      outputAllow();
      return;
    }
    const input = JSON.parse(raw);
    if (input.stop_hook_active) {
      outputAllow();
      return;
    }
    if (input.transcript_path) {
      const pct = estimateContextPercent(input.transcript_path);
      if (pct >= 95) {
        outputAllow();
        return;
      }
    }
    const cwd = input.cwd || process.cwd();
    const sessionId = input.session_id;
    if (!sessionId) {
      outputAllow();
      return;
    }
    const session = readSession(cwd, sessionId);
    if (!session || !session.active) {
      outputAllow();
      return;
    }
    if (isStale(session)) {
      outputAllow();
      return;
    }
    const prd = readPrd(cwd, sessionId);
    if (!prd) {
      outputAllow();
      return;
    }
    if (allStoriesComplete(prd)) {
      outputAllow();
      return;
    }
    if (shouldBreak(prd)) {
      outputAllow();
      return;
    }
    const lastMsg = input.last_assistant_message ?? "";
    const errorPatterns = [/error:/i, /failed/i, /exception/i, /cannot/i, /unable to/i];
    const hasError = errorPatterns.some((p) => p.test(lastMsg));
    if (hasError) {
      const errorSig = lastMsg.slice(0, 200).trim();
      prd.errors.push(errorSig);
      if (prd.errors.length > 10) prd.errors = prd.errors.slice(-10);
    } else {
      prd.errors = [];
    }
    prd.iteration++;
    writePrd(cwd, sessionId, prd);
    const next = nextIncompleteStory(prd);
    if (!next) {
      outputAllow();
      return;
    }
    const remaining = prd.stories.filter((s) => !s.passes).length;
    const total = prd.stories.length;
    const progress = `[${total - remaining}/${total}]`;
    outputBlock(
      `orc ${progress} next story: "${next.title}" (id: ${next.id}). implement this story, verify it works (build + test), then update prd.json to mark passes:true. iteration ${prd.iteration}.`
    );
  } catch {
    outputAllow();
  }
}
main();
