import {
  readStdin,
  readSession,
  readPrd,
  writePrd,
  nextIncompleteStory,
  allStoriesComplete,
  shouldBreak,
  isStale,
  estimateContextPercent,
  outputBlock,
  outputAllow,
  type StopHookInput,
} from "./env.js";

async function main() {
  try {
    const raw = await readStdin();
    if (!raw) {
      outputAllow();
      return;
    }

    const input: StopHookInput = JSON.parse(raw);

    // 1. already in stop hook → allow exit (prevent infinite loop)
    if (input.stop_hook_active) {
      outputAllow();
      return;
    }

    // 2. context limit → allow exit (prevent deadlock)
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

    // 3. read session state
    const session = readSession(cwd, sessionId);
    if (!session || !session.active) {
      outputAllow();
      return;
    }

    // 4. staleness check (2 hours)
    if (isStale(session)) {
      outputAllow();
      return;
    }

    // 5. read PRD
    const prd = readPrd(cwd, sessionId);
    if (!prd) {
      outputAllow();
      return;
    }

    // 6. all stories complete → allow exit
    if (allStoriesComplete(prd)) {
      outputAllow();
      return;
    }

    // 7. circuit breaker: 3 consecutive identical errors → allow exit
    if (shouldBreak(prd)) {
      outputAllow();
      return;
    }

    // 8. track error if last message mentions failure
    const lastMsg = input.last_assistant_message ?? "";
    const errorPatterns = [/error:/i, /failed/i, /exception/i, /cannot/i, /unable to/i];
    const hasError = errorPatterns.some((p) => p.test(lastMsg));
    if (hasError) {
      const errorSig = lastMsg.slice(0, 200).trim();
      prd.errors.push(errorSig);
      // keep only last 10 errors
      if (prd.errors.length > 10) prd.errors = prd.errors.slice(-10);
    } else {
      // progress was made, clear error streak
      prd.errors = [];
    }

    // 9. increment iteration
    prd.iteration++;
    writePrd(cwd, sessionId, prd);

    // 10. find next incomplete story and block
    const next = nextIncompleteStory(prd);
    if (!next) {
      outputAllow();
      return;
    }

    const remaining = prd.stories.filter((s) => !s.passes).length;
    const total = prd.stories.length;
    const progress = `[${total - remaining}/${total}]`;

    outputBlock(
      `orc ${progress} next story: "${next.title}" (id: ${next.id}). ` +
      `implement this story, verify it works (build + test), then update prd.json to mark passes:true. ` +
      `iteration ${prd.iteration}.`
    );
  } catch {
    // fail-open: never block permanently on error
    outputAllow();
  }
}

main();
