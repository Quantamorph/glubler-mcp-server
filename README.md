# @glubler/mcp-server

Official Model Context Protocol (MCP) Server for **[Glubler.com](https://glubler.com)**.

Enables AI models (Claude Desktop, Cursor, GitHub Copilot, Zed, and custom LLM agents) to:
- **Search Glubler's catalog** of registered websites, games, tools, and news.
- **Manage Glubler collections & subglublers** (nested up to 7 levels deep).
- **Collect & Glue websites**: When an AI suggests sites that don't exist in Glubler's database yet, Glubler automatically fetches, scrapes metadata, retrieves authentic PNG favicons, and auto-categorizes them.
- **Canva-Style Web Login**: Log in or register through Glubler's web interface without copying tokens manually.

---

## Available Tools

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

## Setup & Usage

### 1. Requirements

- Node.js 20 or 22 LTS
- npm, included with Node.js
- A Glubler account
- A Glubler MCP/API token

Verify that Node.js and npm are available:

```powershell
node -v
npm -v
```

### 2. Download and install

Download the repository ZIP from GitHub and extract it to a folder that is easy to remember, for example:

```text
D:\glubler-mcp-server
```

Open PowerShell and run:

```powershell
cd "D:\glubler-mcp-server"
npm install
npm run build
```

`npm install` installs the dependencies. `npm run build` compiles the TypeScript source into the `dist` folder.

The MCP server entry point will be:

```text
D:\glubler-mcp-server\dist\index.js
```

You can test the server directly with:

```powershell
npm start
```

The server stays connected to its MCP client, so press `Ctrl+C` to stop a manual test.

### 3. Generate a Glubler API token

1. Sign in at [glubler.com](https://glubler.com).
2. Open **Settings**.
3. Open **MCP Server**.
4. Select **Generate MCP / API Token**.
5. Copy the generated token.

Keep the token private. Never commit it to GitHub or paste it into a public issue or chat. The token expires after 30 days; generate a new one and restart the MCP connection when needed.

### 4. Configure OpenCowork

OpenCowork should start the MCP server as a local **stdio** process.

1. Open OpenCowork settings.
2. Go to the MCP server or integrations section.
3. Add a new **local stdio MCP server**.
4. Use these values, replacing the example path with your actual extraction path:

| Setting | Value |
|---|---|
| Name | `Glubler` |
| Type | STDIO |
| Command | `node` |
| Arguments | `D:\glubler-mcp-server\dist\index.js` | put you path
| Environment Variables
| NOTION TOKEN | GLUBLER_AUTH_TOKEN |
| ENTER VALUE | Your Glubler MCP/API token |

If OpenCowork asks for a single command line, use:

```powershell
node "D:\glubler-mcp-server\dist\index.js"
```

If OpenCowork asks for a JSON configuration, use:

```json
{
  "mcpServers": {
    "glubler": {
      "command": "node",
      "args": ["D:\\glubler-mcp-server\\dist\\index.js"],
      "env": {
        "GLUBLER_API_URL": "https://glubler.com",
        "GLUBLER_AUTH_TOKEN": "PASTE_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Save the configuration and restart the Glubler MCP connection. Then ask OpenCowork:

> List my Glublers.

A successful response confirms that the server and token are working.

`GLUBLER_AUTH_TOKEN` is the recommended authentication method for OpenCowork. The `glubler_login` tool is only needed when no token is configured. If OpenCowork returns `401 Unauthorized`, generate a fresh token in **Settings → MCP Server**, update `GLUBLER_AUTH_TOKEN`, and restart the connection.

### 5. Configure Claude Desktop

Add the following to your `claude_desktop_config.json`. Replace the path and token with your own values:

```json
{
  "mcpServers": {
    "glubler": {
      "command": "node",
      "args": ["D:\\glubler-mcp-server\\dist\\index.js"],
      "env": {
        "GLUBLER_API_URL": "https://glubler.com",
        "GLUBLER_AUTH_TOKEN": "PASTE_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Restart Claude Desktop after saving the configuration.

The browser login flow remains available as a fallback. It stores local credentials in `~/.glubler/auth.json`, but a static token is recommended for unattended clients.

### 6. Configure other MCP clients

Use the same local stdio settings shown above. The important values are:

- **Command:** `node`
- **Arguments:** the absolute path to `dist/index.js`
- **Environment:** `GLUBLER_API_URL=https://glubler.com`
- **Environment:** `GLUBLER_AUTH_TOKEN=<your token>`

For local backend development only, set `GLUBLER_API_URL` to `http://localhost:5000` and use a token issued by that local backend.

---

## Example Prompt for AI

> Find 10 game news websites. Check Glubler first for ones already cataloged, choose popular gaming sites for the rest, create a Glubler collection named "Gaming Hub", and glue all 10 into it.

Glubler's backend will automatically fetch, scrape titles and favicons, auto-categorize new sites, and glue the accepted websites into your profile.

---

## Troubleshooting

### `node` or `npm` is not recognized

Install Node.js 20 or 22 LTS from [nodejs.org](https://nodejs.org/), close and reopen PowerShell, then run:

```powershell
node -v
npm -v
```

### `npm run build` fails

Run the commands from the folder containing `package.json`:

```powershell
cd "D:\glubler-mcp-server"
npm install
npm run build
```

Do not copy `node_modules` from another computer. Install dependencies on the machine that will run the server.

### OpenCowork cannot find the server

Check that `dist/index.js` exists and that the path is absolute. Use double backslashes in JSON configuration.

### Glubler returns `401 Unauthorized`

The token is missing, expired, or incorrect. Generate a new token in **Settings → MCP Server**, update `GLUBLER_AUTH_TOKEN`, and restart the MCP connection.

### Websites are rejected

Some sites are rejected because they are unreachable, time out, lack an authentic favicon, or do not meet Glubler's quality policy. Review the rejection reason returned by the batch tool.

---

## Project Layout

```text
src/              TypeScript source code
dist/             Generated JavaScript, created by npm run build
package.json      Dependencies and npm scripts
package-lock.json Reproducible dependency versions
tsconfig.json     TypeScript compiler settings
README.md         Setup and usage documentation
```

Do not commit or distribute `node_modules`, personal tokens, `.env` files, or local authentication files.

---

## License

MIT License.

