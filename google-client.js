/**
 * Google OAuth2 token manager + GA4 API client (shareable / stdio version).
 *
 * Loads credentials from env vars first, then ~/.was-ga4-mcp/config.json
 * (created by `npx -y was-ga4-mcp auth`).
 */

import { readFileSync } from 'node:fs';
import { CONFIG_FILE } from './config-paths.js';

let saved = {};
try { saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); } catch {}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || saved.client_id;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || saved.client_secret;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || saved.refresh_token;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error(
    'WAS GA4 MCP — not configured yet.\n\n' +
    'First-time setup: open a terminal and run\n\n' +
    '    npx -y github:mnsmasum62786/was-ga4-mcp auth\n\n' +
    'You will be asked for your Google OAuth client_id + secret; then a browser\n' +
    'window opens for Google sign-in. Credentials are saved to\n' +
    CONFIG_FILE + ' and Claude can connect.'
  );
  process.exit(1);
}

let cached = { token: null, expiresAt: 0 };

async function getAccessToken() {
  if (cached.token && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`OAuth refresh failed: ${JSON.stringify(data)}`);
  cached.token = data.access_token;
  cached.expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return cached.token;
}

async function googleFetch(method, url, body) {
  const token = await getAccessToken();
  const init = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!res.ok) {
    const err = parsed?.error || { message: text };
    const e = new Error(`Google API ${res.status}: ${err.message || JSON.stringify(err)}`);
    e.status = res.status;
    e.code = err.code;
    e.body = parsed;
    throw e;
  }
  return parsed;
}

export async function ga4Get(path, query) {
  let url = 'https://analyticsadmin.googleapis.com' + path;
  if (path.includes(':runReport') || path.includes(':batchRunReports') || path.includes(':runRealtimeReport') || path.includes(':runPivotReport') || path.includes(':checkCompatibility') || path.includes(':getMetadata')) {
    url = 'https://analyticsdata.googleapis.com' + path;
  }
  if (query && Object.keys(query).length) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      qs.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    url += '?' + qs.toString();
  }
  return googleFetch('GET', url);
}

export async function ga4Post(path, body) {
  let url;
  if (path.includes(':runReport') || path.includes(':batchRunReports') || path.includes(':runRealtimeReport') || path.includes(':runPivotReport') || path.includes(':batchRunPivotReports') || path.includes(':checkCompatibility') || path.includes(':getMetadata')) {
    url = 'https://analyticsdata.googleapis.com' + path;
  } else {
    url = 'https://analyticsadmin.googleapis.com' + path;
  }
  return googleFetch('POST', url, body);
}

export async function ga4Patch(path, body) {
  const url = 'https://analyticsadmin.googleapis.com' + path;
  return googleFetch('PATCH', url, body);
}

export async function ga4Delete(path) {
  const url = 'https://analyticsadmin.googleapis.com' + path;
  return googleFetch('DELETE', url);
}

export async function ga4Raw(method, fullUrl, body) {
  return googleFetch(method, fullUrl, body);
}
