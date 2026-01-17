# Study MCP – Setup

This MCP runs locally and exposes an HTTP MCP endpoint:

- URL: http://localhost:3000/mcp

## Start the server
```bash
cd d2l-mcp
npm run mcp:launch
```

## VS Code
Uses: .vscode/mcp.json

## Poke
See: setup/poke.md

## Claude Desktop / Raycast
If your client supports HTTP MCP directly, use:
http://localhost:3000/mcp

Otherwise use the stdio bridge:
npm run mcp:bridge
(see setup/claude_desktop.md and setup/raycast.md)
