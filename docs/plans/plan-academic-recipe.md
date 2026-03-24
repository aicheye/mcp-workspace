# Plan: Academic Recipe Integration

> Status: complete
> Created: 2026-03-23

## Goal

Create a shareable Poke recipe that lets any university student quickly connect to the StudyMCP server and use it through Poke.

## What Was Done

1. **Poke Recipe created**: `https://poke.com/r/mSlfi8zFlEY`
   - Name: Academic Assistant (StudyMCP)
   - Provides onboarding context, tool inventory, and setup instructions for new users
   - Covers D2L, Piazza, tasks, notes, and weekly planning tools

2. **`ecosystem.config.cjs` fixed**: Removed stale `study-mcp` entry that referenced a non-existent `./study-mcp` directory. The correct entry is `mcp-d2l` pointing to `./d2l-mcp`.

3. **`package.json` scripts expanded**: Added `install-all`, `build-all`, `start-all`, `status`, and `sync-sessions` to match the commands documented in AGENTS.md.

## Recipe Share Link

```
https://poke.com/r/mSlfi8zFlEY
```

Share this link with any student who wants to set up their own StudyMCP + Poke integration.

## Next Steps

- None required. Students can use the recipe link to onboard themselves.
- If the MCP server URL changes (e.g., new ngrok tunnel), update the Poke integration under Settings > Connections.
