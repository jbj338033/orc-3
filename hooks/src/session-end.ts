import { readStdin, readSession, writeSession } from "./env.js";

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
    // ignore errors
  }
}

main();
