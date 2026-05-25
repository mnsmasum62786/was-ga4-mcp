import { homedir } from 'node:os';
import { join } from 'node:path';

export const CONFIG_DIR = join(homedir(), '.was-ga4-mcp');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// Scopes the auth flow will request
export const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/analytics.manage.users',
];
