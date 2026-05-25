#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { allTools, toolByName } from './tools/registry.js';

function ok(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const MAX = 60000;
  if (text.length > MAX) return { content: [{ type: 'text', text: text.slice(0, MAX) + `\n\n... [truncated ${text.length - MAX} chars]` }] };
  return { content: [{ type: 'text', text }] };
}
function bad(err) {
  return { isError: true, content: [{ type: 'text', text: 'GA4 MCP error:\n' + JSON.stringify({ message: err?.message, status: err?.status, code: err?.code, body: err?.body }, null, 2) }] };
}

const server = new Server({ name: 'was-ga4-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
}));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = toolByName(req.params.name);
  if (!tool) return bad({ message: `Unknown tool: ${req.params.name}` });
  try { return ok(await tool.handler(req.params.arguments || {})); }
  catch (err) { return bad(err); }
});

await server.connect(new StdioServerTransport());
console.error(`was-ga4-mcp v1.0.0 ready — ${allTools.length} tools loaded`);
