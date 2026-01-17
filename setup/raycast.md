# Raycast setup

Raycast commonly expects a command-based MCP server (stdio). Use the bridge.

## 1) Start the HTTP server
```bash
cd d2l-mcp
npm run mcp:launch
```

## 2) Add MCP server to Raycast

Use:

command: npm
args: run mcp:bridge
working directory (cwd): <ABSOLUTE_PATH_TO_YOUR_REPO>/d2l-mcp
env: 
    MCP_HTTP_URL=http://localhost:3000/mcp