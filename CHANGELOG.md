# Changelog

## 1.0.4 — 2026-07-28

### Fixes

- **Windows browser open — final fix using rundll32.** `explorer.exe URL` worked when called manually from a shell but silently failed when spawned by Node's `child_process.spawn` (CreateProcess bypasses Windows shell URL handling). Switched to `rundll32.exe url.dll,FileProtocolHandler URL` — this is the exact function Windows itself calls when a URL is clicked, so it's bulletproof under all spawn contexts.
- **Surfacing spawn errors.** Added `child.on('error', ...)` listener so browser-open failures now print a helpful message instead of silently swallowing.


## 1.0.3 — 2026-07-24

### Fixes

- **Windows browser open — switched from `cmd /c start` to `explorer.exe`.** `cmd /c start "" URL` had persistent URL-escaping problems on Windows regardless of quoting strategy (prefixed backslash, truncation at `&`, etc.). `explorer.exe URL` natively hands off to the default browser via the Windows URL protocol handler — no shell parsing involved. Fixes "Windows cannot find '\https://...'" popup dialog during auth.


## 1.0.2 — 2026-07-24

### Fixes

- **Windows browser open — URL truncation bug.** `openBrowser()` on Windows used `cmd /c start "" URL` where `cmd` treated `&`, `?`, `=` in the OAuth URL as shell metacharacters. Result: the browser opened a truncated URL missing `response_type`, `client_id`, `scope`, etc., causing Google to return `Access blocked: Required parameter is missing: response_type`. Now the URL is wrapped in double quotes so cmd passes it through intact.


## 1.0.1 — 2026-07-24

### Fixes

- **Windows Node 24+ compatibility** — wrap dynamic `import()` calls in `pathToFileURL().href` to fix `ERR_UNSUPPORTED_ESM_URL_SCHEME` when the module path starts with a Windows drive letter (e.g. `C:\Users\...`). Node 24's strict ESM loader was interpreting `C:` as a URL protocol. No behavior change — same auth flow, just now works on Windows.


## 1.0.0 — 2026-05-24

- 31 tools: 6 Data API + 21 Admin API + 4 helpers
- Browser-based OAuth flow with loopback redirect
- BYO Google Cloud OAuth Desktop client
- Credentials saved to `~/.was-ga4-mcp/config.json` (mode 0600)
- Claude Desktop config requires only command + args
- stdio transport — 100% local
- CLI: `was-ga4-mcp auth | logout | status | help`
- Cross-platform: Mac, Linux, Windows
