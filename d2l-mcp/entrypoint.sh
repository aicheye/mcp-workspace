#!/bin/sh
echo ""
echo "========================================="
echo " Horizon MCP — Local Mode"
echo " Endpoint : http://localhost:${MCP_PORT:-4100}/mcp"
echo " Token    : ${STUDY_MCP_TOKEN}"
echo ""
echo " Add to your MCP client config:"
echo "   url   = http://localhost:${MCP_PORT:-4100}/mcp"
echo "   token = ${STUDY_MCP_TOKEN}"
echo "========================================="
echo ""
exec node dist/index.js
