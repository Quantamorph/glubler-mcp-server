#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GlublerApiClient } from './glubler-client.js';
import { loadStoredAuth, clearStoredAuth, startAuthServer } from './auth.js';

// Auto-load stored auth token if present
const storedAuth = loadStoredAuth();
const apiClient = new GlublerApiClient({
  token: process.env.GLUBLER_AUTH_TOKEN || storedAuth?.token
});

// Create the MCP server instance
const server = new Server(
  {
    name: 'glubler-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Available MCP Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'glubler_login',
        description: 'Start browser authentication only if GLUBLER_AUTH_TOKEN is not configured and no saved or active token is available. Token-based connections do not need this tool; use Glubler tools directly. If the API returns 401, ask the user to generate a new token in Glubler Settings > MCP Server, update GLUBLER_AUTH_TOKEN locally, and restart the MCP connection. Never ask the user to paste a token into chat.',
        inputSchema: {
          type: 'object',
          properties: {
            authUrl: {
              type: 'string',
              description: 'Optional Glubler auth host URL (default is https://glubler.com or http://localhost:3000)',
            },
          },
        },
      },
      {
        name: 'glubler_logout',
        description: 'Disconnect the authenticated Glubler account and remove saved local credentials.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'glubler_whoami',
        description: 'Check connection status and return details of the currently authenticated Glubler user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_glubler_catalog',
        description: 'Search for existing websites and games/tools/news already cataloged in Glublers gDatabase.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (e.g. "games", "news", "crypto", "design")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of suggestions to return (default 7, max 7)',
              default: 7,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_my_glublers',
        description: 'Retrieve the authenticated users Glublers (bookmark collections/lists), including child subglublers and website count.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_glubler_details',
        description: 'Get details of a specific Glubler including all glued websites and subglublers inside it.',
        inputSchema: {
          type: 'object',
          properties: {
            glublerId: {
              type: 'string',
              description: 'The unique Glubler ID string (e.g. uuid or client id)',
            },
          },
          required: ['glublerId'],
        },
      },
      {
        name: 'get_public_glubler',
        description: 'Get a public Glublers contents by username and slug (no authentication required).',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The Glubler username of the owner',
            },
            slugName: {
              type: 'string',
              description: 'The URL slug of the Glubler (e.g. "gaming-news")',
            },
          },
          required: ['username', 'slugName'],
        },
      },
      {
        name: 'create_glubler',
        description: 'Create a new Glubler (website list/collection) on the authenticated users profile.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title/name of the Glubler collection (e.g. "Gaming News", "Top Design Tools")',
            },
            slugName: {
              type: 'string',
              description: 'Optional custom URL-friendly slug name (e.g. "gaming-news"). Auto-generated if omitted.',
            },
            parentGlublerId: {
              type: 'number',
              description: 'Optional parent Glubler database ID if creating a nested subglubler (up to 7 levels deep).',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'glue_website',
        description: 'Glue/save a single website to a specific Glubler. If the website does not exist in Glubler yet, Glubler automatically scrapes metadata and fetches the authentic favicon.',
        inputSchema: {
          type: 'object',
          properties: {
            glublerId: {
              type: 'string',
              description: 'The unique Glubler ID string to save this website into.',
            },
            url: {
              type: 'string',
              description: 'The website domain or URL (e.g. "ign.com", "https://polygon.com").',
            },
            title: {
              type: 'string',
              description: 'Optional custom title override for this website.',
            },
          },
          required: ['glublerId', 'url'],
        },
      },
      {
        name: 'glue_websites_batch',
        description: 'Glue/save multiple websites to a Glubler at once. For each URL, Glubler checks gDatabase or scrapes & fetches missing metadata/favicons automatically.',
        inputSchema: {
          type: 'object',
          properties: {
            glublerId: {
              type: 'string',
              description: 'The unique Glubler ID string to save the websites into.',
            },
            urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of website URLs or domains (e.g. ["ign.com", "gamespot.com", "polygon.com"]).',
            },
          },
          required: ['glublerId', 'urls'],
        },
      },
      {
        name: 'delete_glubler',
        description: 'Delete a Glubler collection and its child items permanently.',
        inputSchema: {
          type: 'object',
          properties: {
            glublerId: {
              type: 'string',
              description: 'The unique Glubler ID string to delete.',
            },
          },
          required: ['glublerId'],
        },
      },
      {
        name: 'rename_glubler',
        description: 'Rename a Glubler or subglubler (nested collection). Updates its display title and/or URL slug. Works for both top-level glublers and subglublers.',
        inputSchema: {
          type: 'object',
          properties: {
            glublerId: {
              type: 'string',
              description: 'The unique Glubler ID string of the glubler or subglubler to rename.',
            },
            title: {
              type: 'string',
              description: 'New display title for the Glubler (e.g. "Indie Games Spotlight").',
            },
            slugName: {
              type: 'string',
              description: 'Optional new URL slug (e.g. "indie-games"). Auto-uniquified if already taken by another of your glublers.',
            },
          },
          required: ['glublerId'],
        },
      },
      {
        name: 'unglue_website',
        description: 'Remove a website from a specific Glubler collection.',
        inputSchema: {
          type: 'object',
          properties: {
            glublerId: {
              type: 'string',
              description: 'The unique Glubler ID string.',
            },
            url: {
              type: 'string',
              description: 'The website domain/URL to remove.',
            },
          },
          required: ['glublerId', 'url'],
        },
      },
    ],
  };
});

// Handle Tool Invocations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'glubler_whoami': {
        const stored = loadStoredAuth();
        const hasToken = apiClient.hasToken();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  connected: hasToken,
                  message: hasToken
                    ? 'Connected to Glubler!'
                    : 'Not connected. Run tool `glubler_login` to authenticate with Glubler.',
                  user: stored?.user || (hasToken ? { note: 'Connected via GLUBLER_AUTH_TOKEN' } : null),
                  savedAt: stored?.savedAt,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'glubler_logout': {
        clearStoredAuth();
        apiClient.setToken('');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Successfully logged out. Stored Glubler credentials cleared.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'glubler_login': {
        if (apiClient.hasToken()) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    actionRequired: 'NONE',
                    tokenConfigured: true,
                    tokenValidated: false,
                    message: 'A Glubler token is already configured. Browser login was skipped; use Glubler tools directly. If the API returns 401, replace GLUBLER_AUTH_TOKEN with a fresh token and restart the MCP connection, or use glubler_logout before browser login.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const defaultHost = process.env.GLUBLER_WEB_URL || 'https://glubler.com';
        const host = String(args?.authUrl || defaultHost).replace(/\/+$/, '');
        const port = 47823;
        const redirectUri = `http://localhost:${port}/callback`;
        const loginUrl = `${host}/auth?redirect_uri=${encodeURIComponent(redirectUri)}`;

        // Start local listener in background
        startAuthServer(port, 180000)
          .then(({ token }) => {
            apiClient.setToken(token);
          })
          .catch((err) => {
            console.error('Auth server stopped:', err.message);
          });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  actionRequired: 'OPEN_BROWSER_LOGIN',
                  instructions: 'Please open the URL below in your browser to sign in or register on Glubler. Once logged in, your account will connect automatically.',
                  loginUrl,
                  redirectUri,
                  timeoutSeconds: 180,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'search_glubler_catalog': {
        const query = String(args?.query || '');
        const limit = typeof args?.limit === 'number' ? args.limit : 7;
        const results = await apiClient.suggestWebsites(query, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: results.length,
                  query,
                  websites: results.map((site) => ({
                    id: site.id,
                    url: site.url,
                    title: site.title,
                    glueCount: site.glueCount,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'list_my_glublers': {
        const glublers = await apiClient.getMyGlublers();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: glublers.length,
                  glublers: glublers.map((g) => ({
                    id: g.id,
                    glublerId: g.glublerId,
                    title: g.title,
                    slugName: g.slugName,
                    itemCount: g.items?.length ?? 0,
                    subglublerCount: g.subGlublers?.length ?? 0,
                    nestingLevel: g.nestingLevel,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_glubler_details': {
        const glublerId = String(args?.glublerId || '');
        if (!glublerId) {
          throw new Error('glublerId parameter is required.');
        }
        const glubler = await apiClient.getGlublerById(glublerId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  title: glubler.title,
                  slugName: glubler.slugName,
                  glublerId: glubler.glublerId,
                  websites: glubler.items.map((item) => ({
                    url: item.website.url,
                    title: item.website.title,
                    gluedAt: item.gluedAt,
                    category: item.website.categoryName,
                  })),
                  subGlublers: glubler.subGlublers.map((sg) => ({
                    glublerId: sg.glublerId,
                    title: sg.title,
                    slugName: sg.slugName,
                    itemCount: sg.items?.length ?? 0,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_public_glubler': {
        const username = String(args?.username || '');
        const slugName = String(args?.slugName || '');
        if (!username || !slugName) {
          throw new Error('Both username and slugName are required.');
        }
        const glubler = await apiClient.getGlublerBySlug(username, slugName);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  title: glubler.title,
                  slugName: glubler.slugName,
                  url: `https://glubler.com/${username}/${glubler.slugName}`,
                  websites: glubler.items.map((item) => ({
                    url: item.website.url,
                    title: item.website.title,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'create_glubler': {
        const title = String(args?.title || '').trim();
        if (!title) {
          throw new Error('title parameter is required.');
        }
        const slugName = args?.slugName ? String(args.slugName).trim() : undefined;
        const parentGlublerId = typeof args?.parentGlublerId === 'number' ? args.parentGlublerId : undefined;

        // Generate client-side glublerId (consistent with Glubler web format)
        const glublerId = 'mcp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

        const created = await apiClient.createGlubler({
          glublerId,
          title,
          slugName,
          parentGlublerId
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Glubler '${created.title}' created successfully!`,
                  glubler: {
                    id: created.id,
                    glublerId: created.glublerId,
                    title: created.title,
                    slugName: created.slugName,
                    parentGlublerId: created.parentGlublerId,
                    nestingLevel: created.nestingLevel
                  }
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'glue_website': {
        const glublerId = String(args?.glublerId || '').trim();
        const url = String(args?.url || '').trim();
        const title = args?.title ? String(args.title).trim() : undefined;

        if (!glublerId || !url) {
          throw new Error('Both glublerId and url are required.');
        }

        const gluedItem = await apiClient.glueWebsite({
          glublerId,
          url,
          title,
          addToFeed: false
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Website '${gluedItem.website?.title || url}' glued successfully!`,
                  glublerId,
                  website: {
                    id: gluedItem.website?.id,
                    url: gluedItem.website?.url,
                    title: gluedItem.website?.title,
                    glueCount: gluedItem.website?.glueCount
                  }
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'glue_websites_batch': {
        const glublerId = String(args?.glublerId || '').trim();
        const urls = Array.isArray(args?.urls) ? (args.urls as string[]) : [];

        if (!glublerId || urls.length === 0) {
          throw new Error('glublerId and a non-empty array of urls are required.');
        }

        const result = await apiClient.glueWebsitesBatch(glublerId, urls, false);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: result.addedCount > 0,
                  summary: result.summary,
                  glublerId,
                  totalRequested: result.totalRequested,
                  addedCount: result.addedCount,
                  rejectedCount: result.rejectedCount,
                  addedWebsites: result.added,
                  rejectedWebsites: result.rejected
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'delete_glubler': {
        const glublerId = String(args?.glublerId || '').trim();
        if (!glublerId) {
          throw new Error('glublerId parameter is required.');
        }

        await apiClient.deleteGlubler(glublerId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Glubler '${glublerId}' deleted successfully.`
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'rename_glubler': {
        const glublerId = String(args?.glublerId || '').trim();
        if (!glublerId) {
          throw new Error('glublerId parameter is required.');
        }

        const title = args?.title ? String(args.title).trim() : undefined;
        const slugName = args?.slugName ? String(args.slugName).trim() : undefined;

        if (!title && !slugName) {
          throw new Error('Provide at least one of: title or slugName to rename.');
        }

        const updated = await apiClient.updateGlubler(glublerId, { title, slugName });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Glubler renamed successfully!`,
                  glubler: {
                    id: updated.id,
                    glublerId: updated.glublerId,
                    title: updated.title,
                    slugName: updated.slugName,
                    parentGlublerId: updated.parentGlublerId,
                    nestingLevel: updated.nestingLevel
                  }
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'unglue_website': {
        const glublerId = String(args?.glublerId || '').trim();
        const url = String(args?.url || '').trim();

        if (!glublerId || !url) {
          throw new Error('Both glublerId and url are required.');
        }

        await apiClient.unglueWebsite(glublerId, url);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Website '${url}' removed from Glubler '${glublerId}'.`
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing tool '${name}': ${err.message}`,
        },
      ],
    };
  }
});

// Start Server with Stdio Transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Glubler MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error starting Glubler MCP Server:', error);
  process.exit(1);
});
