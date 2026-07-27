#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { CONFIG_FILE } from './config-paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cmd = (process.argv[2] || '').toLowerCase();

if (cmd === 'auth') {
  const { runAuthFlow } = await import(pathToFileURL(join(__dirname, 'auth.js')).href);
  try { await runAuthFlow(); process.exit(0); }
  catch (err) { console.error('\nAuth failed:', err?.message || err); process.exit(1); }
} else if (cmd === 'logout') {
  const { deleteConfigFile } = await import(pathToFileURL(join(__dirname, 'auth.js')).href);
  const deleted = await deleteConfigFile();
  console.log(deleted ? `Removed ${CONFIG_FILE}` : 'No saved credentials to remove.');
  process.exit(0);
} else if (cmd === 'status') {
  const { readConfigFile } = await import(pathToFileURL(join(__dirname, 'auth.js')).href);
  const cfg = await readConfigFile();
  if (!cfg) console.log('Not configured. Run `npx -y github:mnsmasum62786/was-ga4-mcp auth` to connect.');
  else {
    console.log(`Config: ${CONFIG_FILE}`);
    console.log(`Saved:  ${cfg.saved_at}`);
    console.log(`Client: ${cfg.client_id}`);
    console.log(`Scopes: ${cfg.scope}`);
  }
  process.exit(0);
} else if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(`
was-ga4-mcp — GA4 MCP server for Claude Desktop / Cursor / any MCP client

Usage:
  was-ga4-mcp           Start the MCP server (used by Claude Desktop via stdio)
  was-ga4-mcp auth      Connect with your Google OAuth client + browser sign-in
  was-ga4-mcp logout    Delete the saved credentials
  was-ga4-mcp status    Show config status

Quick start:
  1. Create a Google Cloud OAuth Desktop client (5 min, README has steps).
  2. Run:   npx -y github:mnsmasum62786/was-ga4-mcp auth
  3. Add to Claude Desktop config:
       {
         "mcpServers": {
           "WAS GA4 MCP": { "command": "npx", "args": ["-y", "github:mnsmasum62786/was-ga4-mcp"] }
         }
       }

Docs: https://github.com/mnsmasum62786/was-ga4-mcp
`);
  process.exit(0);
} else if (!cmd) {
  await import(pathToFileURL(join(__dirname, 'server.js')).href);
} else {
  console.error(`Unknown command: "${cmd}". Run "was-ga4-mcp help".`);
  process.exit(1);
}
