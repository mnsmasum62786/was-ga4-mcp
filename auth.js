/**
 * Google OAuth browser flow with loopback redirect.
 *
 * Prompts for client_id + client_secret, spawns a local HTTP server on a random
 * port, opens browser to Google sign-in, captures the auth code, exchanges for
 * a refresh_token, saves to ~/.was-ga4-mcp/config.json (mode 0600).
 */

import { createServer } from 'node:http';
import { mkdir, writeFile, chmod, readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { SCOPES, CONFIG_DIR, CONFIG_FILE } from './config-paths.js';

function openBrowser(url) {
  const cmds = {
    darwin: { cmd: 'open', args: [url] },
    linux: { cmd: 'xdg-open', args: [url] },
    win32: { cmd: 'explorer.exe', args: [url] },
  };
  const c = cmds[process.platform];
  if (!c) {
    console.error(`Unsupported platform: ${process.platform}. Open this URL manually:\n${url}`);
    return;
  }
  try {
    const child = spawn(c.cmd, c.args, { detached: true, stdio: 'ignore' });
    child.unref();
  } catch (err) {
    console.error(`Couldn't auto-open browser (${err.message}). Open this URL manually:\n${url}`);
  }
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WAS GA4 MCP — Connected</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#1a1a1a;line-height:1.6}
h1{font-size:24px;margin:0 0 16px}.box{background:#f3f7f4;border:1px solid #c8e0d2;border-radius:10px;padding:24px}
p{margin:0 0 12px}.ok{color:#0a7f3f;font-weight:600}</style></head>
<body><div class="box"><h1>Connected to GA4</h1>
<p class="ok">Authorization successful.</p>
<p>Your credentials have been saved locally. You can close this tab and return to your terminal.</p>
</div></body></html>`;

const ERROR_HTML = (msg) => `<!DOCTYPE html><html><body><h1>Auth failed</h1><p>${msg}</p></body></html>`;

export async function runAuthFlow() {
  console.log('\n=== WAS GA4 MCP — Browser sign-in ===\n');

  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const rl = readline.createInterface({ input, output });

  if (!clientId || !clientSecret) {
    console.log('You need a Google Cloud OAuth Desktop client first. Quick setup:');
    console.log('  1. Bulk-enable APIs:');
    console.log('     https://console.cloud.google.com/flows/enableapi?apiid=analyticsdata.googleapis.com,analyticsadmin.googleapis.com');
    console.log('  2. https://console.cloud.google.com/apis/credentials/consent');
    console.log('     User type: External -> fill app info -> Save. Add yourself as test user.');
    console.log('  3. https://console.cloud.google.com/apis/credentials');
    console.log('     Create credentials -> OAuth client ID -> Desktop app -> Create.');
    console.log('     Copy Client ID + Client secret.\n');
    if (!clientId) clientId = (await rl.question('Paste your GOOGLE_CLIENT_ID: ')).trim();
    if (!clientSecret) clientSecret = (await rl.question('Paste your GOOGLE_CLIENT_SECRET: ')).trim();
  }
  rl.close();

  if (!clientId || !clientSecret) throw new Error('Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');

  // Loopback HTTP listener
  const state = randomBytes(16).toString('hex');
  let resolveCode, rejectCode;
  const codePromise = new Promise((res, rej) => { resolveCode = res; rejectCode = rej; });

  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname !== '/callback') {
      res.writeHead(404); res.end('Not found'); return;
    }
    const returnedState = u.searchParams.get('state');
    const code = u.searchParams.get('code');
    const error = u.searchParams.get('error');
    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(ERROR_HTML(`Google reported: ${error}`));
      rejectCode(new Error(`OAuth error: ${error}`));
      return;
    }
    if (returnedState !== state) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(ERROR_HTML('State mismatch'));
      rejectCode(new Error('State mismatch'));
      return;
    }
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(ERROR_HTML('No code returned by Google.'));
      rejectCode(new Error('No code'));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(SUCCESS_HTML);
    resolveCode(code);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  }).toString();

  console.log('\nOpening your browser to Google sign-in...');
  console.log('If it does not open automatically, copy and paste this URL:\n');
  console.log(authUrl + '\n');
  console.log('Waiting for you to approve in the browser...');

  openBrowser(authUrl);

  let code;
  try {
    code = await Promise.race([
      codePromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out (5 min)')), 5 * 60 * 1000)),
    ]);
  } finally {
    server.close();
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok || !tokens.refresh_token) {
    throw new Error(
      `Token exchange failed: ${JSON.stringify(tokens)}\n\n` +
      'If "refresh_token is missing": you have authorized this OAuth client before. ' +
      'Revoke at https://myaccount.google.com/permissions and re-run auth.'
    );
  }

  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const payload = {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
    saved_at: new Date().toISOString(),
  };
  await writeFile(CONFIG_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 });
  try { await chmod(CONFIG_FILE, 0o600); } catch {}

  console.log(`\nSaved credentials to ${CONFIG_FILE}`);
  console.log('\nLast step — add this to your Claude Desktop config and restart Claude:\n');
  console.log(JSON.stringify({
    mcpServers: {
      'WAS GA4 MCP': {
        command: 'npx',
        args: ['-y', 'github:mnsmasum62786/was-ga4-mcp'],
      },
    },
  }, null, 2));
  console.log('\nClaude Desktop config location:');
  console.log('  Mac:     ~/Library/Application Support/Claude/claude_desktop_config.json');
  console.log('  Windows: %APPDATA%\\Claude\\claude_desktop_config.json');
  console.log('\nAfter restarting Claude, ask: "Run ga4_quick_overview".\n');
}

export async function readConfigFile() {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

export async function deleteConfigFile() {
  try {
    await unlink(CONFIG_FILE);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') return false;
    throw e;
  }
}
