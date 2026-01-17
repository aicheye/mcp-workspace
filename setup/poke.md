# Poke setup (HTTP MCP)

## 1) Start the server
```bash
npm run mcp:launch
```

Then, run ngrok to get a public url
```bash
ngrok http 3000
```

## 2) In Poke, add MCP server

Go to Setting -> Connections
Click **Add Integration**
Click **Create**
Name your Integration, then paste the ngrok url into Server URL


