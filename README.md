# @glubler/mcp-server

Official Model Context Protocol (MCP) Server for **[Glubler.com](https://glubler.com)**.

Enables AI models (Claude Desktop, Cursor, GitHub Copilot, Zed, and custom LLM agents) to:
- 🔍 **Search Glubler's catalog** of registered websites, games, tools, and news.
- 📁 **Manage Glubler collections & subglublers** (nested up to 7 levels deep).
- 🧩 **Collect & Glue websites**: When an AI suggests sites that don't exist in Glubler's database yet, Glubler automatically fetches, scrapes metadata, retrieves authentic PNG favicons, and auto-categorizes them.
- 🔐 **Canva-Style Web Login**: Log in or register through Glubler's web interface without copying tokens manually.

---

## 🛠 Available Tools

| Tool Name | Description | Requires Auth |
|---|---|:---:|
| `glubler_whoami` | Check connection status & profile info | No |
| `glubler_login` | Start Canva-style browser login / registration flow | No |
| `glubler_logout` | Clear saved credentials & disconnect | No |
| `search_glubler_catalog` | Search Glubler's `gDatabase` for existing websites & topics | No |
| `get_public_glubler` | Fetch contents of any public Glubler list (`/{username}/{slug}`) | No |
| `list_my_glublers` | List the authenticated user's Glubler tree & counts | Yes |
| `get_glubler_details` | View all glued websites and subglublers inside a specific list | Yes |
| `create_glubler` | Create a new Glubler collection or nested subglubler | Yes |
| `glue_website` | Glue a single website to a list (auto-scrapes if missing) | Yes |
| `glue_websites_batch` | Glue multiple websites at once (auto-scrapes & fetches missing) | Yes |
| `delete_glubler` | Permanently delete a Glubler list | Yes |
| `unglue_website` | Remove a website from a Glubler list | Yes |

---

## 🚀 Setup & Usage

### 1. Claude Desktop Configuration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "glubler": {
      "command": "node",
      "args": ["/root/glubler/mcp-server/dist/index.js"],
      "env": {
        "GLUBLER_API_URL": "http://localhost:5000"
      }
    }
  }
}
```

*(Or provide `GLUBLER_AUTH_TOKEN` in the `env` block if you prefer using a static token instead of browser login).*

### 2. Canva-Style Web Flow

When interacting with the AI:
1. Ask the AI: *"Connect to my Glubler account"*
2. The AI triggers `glubler_login` and provides a login URL.
3. Open the URL in your browser, log in (or register), and your AI assistant will be connected automatically.
4. Saved credentials persist securely in `~/.glubler/auth.json`.

---

## 💡 Example Prompt for AI

> *"Find 10 game news websites. Check Glubler first for ones already cataloged, pick another popular gaming sites for the rest, create a Glubler collection named 'Gaming Hub', and glue all 10 into it."*

Glubler's backend will automatically fetch, scrape titles & favicons, auto-categorize the new sites, and glue all 10 into your profile!
