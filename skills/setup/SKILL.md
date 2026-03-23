---
name: setup
description: configure external model authentication for Codex CLI and Gemini CLI
argument-hint: [provider]
disable-model-invocation: true
---

Help the user set up external model access for orc.

## Check Current Status

First, call the MCP tool `orc_status` to see which providers are configured.

## Providers

### OpenRouter (recommended — single key for all models)
1. Get an API key at https://openrouter.ai/keys
2. Add to your shell profile:
   ```bash
   export OPENROUTER_API_KEY="sk-or-..."
   ```
3. Restart Claude Code

### OpenAI / Codex CLI
1. Install: `npm i -g @openai/codex`
2. Authenticate: `codex auth`
3. Or set API key: `export OPENAI_API_KEY="sk-..."`

### Google Gemini CLI
1. Install: `npm i -g @anthropic-ai/gemini-cli` or `brew install gemini`
2. Authenticate: `gemini auth login`
3. Or set API key: `export GEMINI_API_KEY="AI..."`

## Verification

After setup, run `/setup` again to verify all providers show as connected.

## Minimum Setup

At minimum, set `OPENROUTER_API_KEY` — this enables all external models through a single API key. The Codex and Gemini CLIs are optional but provide better integration (sandbox execution, native auth).
