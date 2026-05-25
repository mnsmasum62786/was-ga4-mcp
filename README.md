# WAS GA4 MCP

Query and manage Google Analytics 4 from Claude Desktop, Cursor, or any MCP-compatible client using natural language. 31 tools cover the full GA4 Data API (reports, real-time, pivots) + Admin API (properties, streams, conversions, custom dimensions/metrics, audiences, BigQuery links, user management).

100 percent local. Your credentials stay on your machine. Built by [Abdullah Al Masum](https://webanalyticssolution.com) — Web Analytics Solution (WAS). MIT licensed.

## Prerequisites

| | Required | How to install |
|---|---|---|
| **Node.js 18+** | running `npx` | Mac: `brew install node` · Windows: https://nodejs.org · Linux: `apt install nodejs npm` |
| **Git** | letting `npx` clone from GitHub | Mac: `brew install git` (or first `git --version` triggers Xcode tools) · Windows: https://git-scm.com · Linux: `apt install git` |
| **A Google account** | with access to at least one GA4 property | — |
| **5 min Google Cloud setup** | one-time per student | Walked through below |

## Quick start — 3 steps

### Step 1 — Create your Google Cloud OAuth client (5 min, one-time)

1. Open https://console.cloud.google.com → create new project (or pick one)
2. **Bulk-enable APIs** — open this single link, select your project, click Enable:
   ```
   https://console.cloud.google.com/flows/enableapi?apiid=analyticsdata.googleapis.com,analyticsadmin.googleapis.com
   ```
3. https://console.cloud.google.com/apis/credentials/consent
   - User type: **External** → fill app name + your email → Save
   - Under **Test users**, click **Add Users** → add your Google account
4. https://console.cloud.google.com/apis/credentials
   - **Create credentials → OAuth client ID**
   - Application type: **Desktop app**
   - Name: anything (e.g. "WAS GA4 MCP")
   - **Create** → copy the **Client ID** and **Client secret** from the dialog

### Step 2 — Connect with one terminal command

```bash
npx -y github:mnsmasum62786/was-ga4-mcp auth
```

The tool will:
1. Ask you to paste your **Client ID**
2. Ask you to paste your **Client Secret**
3. Open your browser to Google sign-in
4. After you click **Allow**, save everything to `~/.was-ga4-mcp/config.json`

### Step 3 — Add 4 lines to Claude Desktop config

Open the config file:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Paste (merge with any existing `mcpServers`):

```json
{
  "mcpServers": {
    "WAS GA4 MCP": {
      "command": "npx",
      "args": ["-y", "github:mnsmasum62786/was-ga4-mcp"]
    }
  }
}
```

Fully quit Claude (Cmd+Q on Mac, fully exit on Windows) and reopen. In a new chat:

> "Run ga4_quick_overview."

Returns a snapshot of all GA4 accounts + properties you can access.

## Useful commands

```bash
npx -y github:mnsmasum62786/was-ga4-mcp           # Start MCP (Claude calls this)
npx -y github:mnsmasum62786/was-ga4-mcp auth      # Connect / re-connect
npx -y github:mnsmasum62786/was-ga4-mcp logout    # Delete saved credentials
npx -y github:mnsmasum62786/was-ga4-mcp status    # Show config
npx -y github:mnsmasum62786/was-ga4-mcp help      # Usage
```

## What you can ask Claude

**Discovery**
- "List my GA4 accounts and properties"
- "Find the property for [client name]"
- "Show me the property settings for 320448620"

**Reporting (Data API)**
- "Run a report on property 320448620: last 30 days, sessions + active users by country"
- "Show real-time active users for property X grouped by country"
- "Compare yesterday vs same day last week for property X — sessions, conversions, revenue"
- "Show top 20 landing pages on property X by sessions for last 7 days"
- "Pivot users by deviceCategory × country for last 30 days"
- "What dimensions are available for property X?"

**Admin (Admin API)**
- "List conversion events on property X"
- "Mark `form_submit` as a key event on property X"
- "Create a custom dimension `user_role` on property X scoped EVENT"
- "List custom dimensions on property X"
- "List data streams + measurement IDs on property X"
- "List BigQuery export links on property X"
- "Create a BigQuery link from property X to my-gcp-project"

**Health check**
- "Run a property health check on 320448620"

## All 31 tools

| Category | Tools |
|---|---|
| **Data API** (6) | run_report, run_realtime_report, run_pivot_report, batch_run_reports, get_metadata, check_compatibility |
| **Admin API** (21) | list_account_summaries, list_accounts, get_account, list_properties, get_property, update_property, list_data_streams, get_data_stream, list_conversion_events, create_conversion_event, list_custom_dimensions, create_custom_dimension, list_custom_metrics, create_custom_metric, list_audiences, list_google_ads_links, list_bigquery_links, create_bigquery_link, list_users, get_attribution_settings, get_data_retention_settings |
| **Helpers** (4) | quick_overview, find_property, property_health_check, universal_call (escape hatch) |

## How it works

The MCP runs as a local Node.js process spawned by Claude Desktop via stdio. It talks directly from your computer to Google's GA4 APIs using your refresh token. Nothing routes through any third-party server.

```
Claude Desktop  →  local Node process (your machine)  →  analyticsdata.googleapis.com + analyticsadmin.googleapis.com
```

Each user has their own Google Cloud project + OAuth client. Your API quota is your own.

## Security notes

- Credentials live only in `~/.was-ga4-mcp/config.json` on your machine with `0600` permissions
- stdio transport — no inbound HTTP port, no network exposure
- Refresh token never expires if you're admin of your own OAuth app
- Revoke at https://myaccount.google.com/permissions any time
- Remove local copy: `npx -y github:mnsmasum62786/was-ga4-mcp logout`

## Multi-account setup

If you manage GA4 for multiple Google accounts, generate a token per account and put each as a separate `mcpServers` entry with env-var overrides:

```json
{
  "mcpServers": {
    "GA4 — My Agency": {
      "command": "npx",
      "args": ["-y", "github:mnsmasum62786/was-ga4-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "shared-client.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "shared-secret",
        "GOOGLE_REFRESH_TOKEN": "token-A"
      }
    },
    "GA4 — Client 1": {
      "command": "npx",
      "args": ["-y", "github:mnsmasum62786/was-ga4-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "shared-client.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "shared-secret",
        "GOOGLE_REFRESH_TOKEN": "token-B"
      }
    }
  }
}
```

## Troubleshooting

**"App isn't verified" warning during sign-in** — expected for personal OAuth clients. Click **Advanced → Go to <your project> (unsafe)**. Safe because it's your own app.

**"Permission denied" on a specific property** — your Google account doesn't have access to that GA4 property. Check at https://analytics.google.com → Admin → User management.

**"Token expired" / `invalid_grant`** — refresh token revoked. Run `logout` then `auth` again.

**Want to switch Google accounts** — `logout` then `auth` again. Sign in with the new account in the browser.

## License

MIT. Built by [Abdullah Al Masum](https://webanalyticssolution.com).
