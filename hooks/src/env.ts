import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// --- types ---

export interface Story {
  id: string;
  title: string;
  passes: boolean;
}

export interface Prd {
  task: string;
  mode: string;
  stories: Story[];
  iteration: number;
  errors: string[];
  started_at: string;
}

export interface Session {
  active: boolean;
  mode: string;
  sessionId: string;
  started_at: string;
}

export interface StopHookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode?: string;
  hook_event_name: string;
  stop_hook_active?: boolean;
  last_assistant_message?: string;
}

export interface PreToolUseInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id: string;
}

// --- paths ---

function orcDir(cwd: string): string {
  return join(cwd, ".orc");
}

function sessionDir(cwd: string, sessionId: string): string {
  return join(orcDir(cwd), "sessions", sessionId);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// --- session ---

export function readSession(cwd: string, sessionId: string): Session | null {
  const path = join(sessionDir(cwd, sessionId), "session.json");
  return readJson<Session>(path);
}

export function writeSession(cwd: string, sessionId: string, session: Session): void {
  const dir = sessionDir(cwd, sessionId);
  ensureDir(dir);
  writeJson(join(dir, "session.json"), session);
}

// --- prd ---

export function readPrd(cwd: string, sessionId: string): Prd | null {
  const path = join(sessionDir(cwd, sessionId), "prd.json");
  return readJson<Prd>(path);
}

export function writePrd(cwd: string, sessionId: string, prd: Prd): void {
  const dir = sessionDir(cwd, sessionId);
  ensureDir(dir);
  writeJson(join(dir, "prd.json"), prd);
}

export function nextIncompleteStory(prd: Prd): Story | null {
  return prd.stories.find((s) => !s.passes) ?? null;
}

export function allStoriesComplete(prd: Prd): boolean {
  return prd.stories.length > 0 && prd.stories.every((s) => s.passes);
}

// --- circuit breaker ---

const MAX_CONSECUTIVE_ERRORS = 3;

export function shouldBreak(prd: Prd): boolean {
  const errors = prd.errors;
  if (errors.length < MAX_CONSECUTIVE_ERRORS) return false;
  const last = errors.slice(-MAX_CONSECUTIVE_ERRORS);
  return last.every((e) => e === last[0]);
}

// --- staleness ---

const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

export function isStale(session: Session): boolean {
  const started = new Date(session.started_at).getTime();
  return Date.now() - started > STALE_MS;
}

// --- context limit ---

export function estimateContextPercent(transcriptPath: string): number {
  try {
    const content = readFileSync(transcriptPath, "utf-8");
    const windowMatches = content.match(/"context_window"\s{0,5}:\s{0,5}(\d+)/g);
    const inputMatches = content.match(/"input_tokens"\s{0,5}:\s{0,5}(\d+)/g);
    if (!windowMatches || !inputMatches) return 0;
    const lastWindow = parseInt(windowMatches[windowMatches.length - 1].match(/(\d+)/)![1]);
    const lastInput = parseInt(inputMatches[inputMatches.length - 1].match(/(\d+)/)![1]);
    if (lastWindow === 0) return 0;
    return Math.round((lastInput / lastWindow) * 100);
  } catch {
    return 0;
  }
}

// --- stdin/stdout helpers ---

export async function readStdin(timeoutMs = 2000): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
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

export function outputBlock(reason: string): void {
  console.log(JSON.stringify({ decision: "block", reason }));
}

export function outputAllow(): void {
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
}

// --- json helpers ---

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}
