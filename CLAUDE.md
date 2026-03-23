# orc

Universal AI meta-orchestrator Claude Code plugin.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | build hooks + mcp server to dist/ |
| `pnpm test` | run vitest |

## Architecture

```
hooks/src/         → hook source (.ts), tsup builds to dist/hooks/*.mjs
  env.ts           → session/prd read/write, stdin/stdout helpers, circuit breaker
  pretooluse.ts    → block dangerous bash commands (PreToolUse hook)
  stop.ts          → ralph loop via prd.json tracking (Stop hook)
  session-end.ts   → mark session inactive (SessionEnd hook)
mcp/               → MCP server source, tsup builds to dist/mcp/server.mjs
  server.ts        → entrypoint. registers 7 tools
  providers/       → OpenRouter/OpenAI/Google API + CLI wrappers
  tools/           → individual MCP tool implementations
skills/            → SKILL.md skill definitions
  orc/             → /orc main orchestration (auto mode selection + PRD)
  setup/           → /setup external model auth
  cancel/          → /cancel session cancellation
agents/            → 17 capability profiles (.md)
```

## Key Patterns

- **auto mode selection**: /orc analyzes task complexity and picks solo/ralph/team/solver. user never chooses
- **PRD-driven ralph**: Stop hook reads .orc/sessions/{id}/prd.json. blocks exit while stories remain incomplete. injects next story context
- **circuit breaker**: 3 consecutive identical errors → stop hook allows exit. prevents infinite loops
- **context limit protection**: estimates context usage from transcript. >=95% → allows exit. prevents deadlock
- **fail-open**: all hooks catch errors and allow exit. never blocks permanently
- **session isolation**: session_id must match state file. other sessions are ignored
- **staleness**: 2 hour timeout on sessions. stale sessions are ignored
- **built artifacts must be committed**: dist/ contains .mjs bundles. plugin installs via clone
- **noExternal tsup**: all dependencies inlined. plugin environment lacks node_modules
- **MCP stdout is protocol only**: console.log forbidden in MCP server. use console.error for debug
