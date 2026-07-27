# Changelog

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
