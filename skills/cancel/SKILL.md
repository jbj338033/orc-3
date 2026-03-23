---
name: cancel
description: cancel the active orc session and stop the Ralph loop
disable-model-invocation: true
---

Cancel the current orc session.

## Steps

1. Find the active session file at `.orc/sessions/${CLAUDE_SESSION_ID}/session.json`
2. Set `active: false`
3. If there's a team running, use `TeamDelete` to clean up
4. Confirm cancellation to the user

The Stop hook will detect `active: false` and allow Claude to exit normally on the next turn.
