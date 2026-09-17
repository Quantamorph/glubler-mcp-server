import process from 'node:process';
import { GlublerDto, WebsiteSuggestionDto, WebsiteDto, CreateGlublerDto, UpdateGlublerDto, GlueWebsiteDto, GlublerItemDto } from './types.js';

export interface GlublerClientConfig {
  baseUrl?: string;
  token?: string;
}

export class GlublerApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(config: GlublerClientConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.GLUBLER_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
    this.token = config.token || process.env.GLUBLER_AUTH_TOKEN || null;
  }

  setToken(token: string) {
    this.token = token;
  }

  hasToken(): boolean {
    return !!this.token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Connection': 'close'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private normalizeUrl(input: string): string {
    let url = input.trim();
    if (!url) return '';
    // Strip protocol
    if (url.startsWith('https://')) url = url.substring(8);
    else if (url.startsWith('http://')) url = url.substring(7);
    // Strip trailing slashes
    url = url.replace(/\/+$/, '');
    // Strip www.
    if (url.startsWith('www.')) url = url.substring(4);
    // Strip internal subdomains matching dash.glubler.com logic
    const subdomainsToRemove = [
      'auth.', 'auth0.', 'account.', 'accounts.', 'login.', 'secure.',
      'api.', 'app.', 'dashboard.', 'id.', 'identity.', 'oauth.', 'mail.',
      'my.', 'portal.', 'web.', 'm.', 'mobile.', 'ads.', 'admin.', 'blog.',
      'news.', 'help.', 'support.', 'chat.', 'meet.', 'docs.', 'drive.'
    ];
    for (const sub of subdomainsToRemove) {
      if (url.startsWith(sub)) {
        url = url.substring(sub.length);
        break;
      }
    }
    // Remove query string or path if AI passed a subpage
    const slashIndex = url.indexOf('/');
    if (slashIndex > 0) url = url.substring(0, slashIndex);
    const questionIndex = url.indexOf('?');
    if (questionIndex > 0) url = url.substring(0, questionIndex);

    return url.toLowerCase();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, timeoutMs: number = 30000): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = { ...this.getHeaders(), ...(options.headers as Record<string, string> || {}) };

    // Explicit AbortSignal timeout to prevent hanging fetch calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      if (!res.ok) {
        let errorBody = '';
        try {
          errorBody = await res.text();
        } catch {
          // ignore error parsing
        }
        throw new Error(`Glubler API Error [${res.status} ${res.statusText}] at ${endpoint}: ${errorBody}`);
      }

      if (res.status === 204) {
        return null as unknown as T;
      }

      return await res.json() as T;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        throw new Error(`Connection timed out after ${timeoutMs / 1000}s while contacting Glubler backend.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // --- Websites / Catalog ---
  async suggestWebsites(query: string, limit: number = 7): Promise<WebsiteSuggestionDto[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return this.request<WebsiteSuggestionDto[]>(`/api/websites/suggest?${params.toString()}`);
  }

  async getWebsiteByUrl(url: string): Promise<WebsiteDto | null> {
    try {
      return await this.request<WebsiteDto>(`/api/websites/${encodeURIComponent(url)}`);
    } catch (err: any) {
      if (err.message.includes('404')) return null;
      throw err;
    }
  }

  // --- Glublers (Collections) ---
  async getMyGlublers(): Promise<GlublerDto[]> {
    if (!this.token) {
      throw new Error('Authentication required to get user glublers. Please configure GLUBLER_AUTH_TOKEN.');
    }
    return this.request<GlublerDto[]>('/api/glublers');
  }

  async getGlublerById(glublerId: string): Promise<GlublerDto> {
    if (!this.token) {
      throw new Error('Authentication required. Please configure GLUBLER_AUTH_TOKEN.');
    }
    return this.request<GlublerDto>(`/api/glublers/${encodeURIComponent(glublerId)}`);
  }

  async getGlublerBySlug(username: string, slugName: string): Promise<GlublerDto> {
    return this.request<GlublerDto>(`/api/glublers/by-slug/${encodeURIComponent(username)}/${encodeURIComponent(slugName)}`);
  }

  async createGlubler(dto: CreateGlublerDto): Promise<GlublerDto> {
    if (!this.token) {
      throw new Error('Authentication required to create a glubler. Please configure GLUBLER_AUTH_TOKEN.');
    }
    return this.request<GlublerDto>('/api/glublers', {
      method: 'POST',
      body: JSON.stringify(dto)
    });
  }

  async deleteGlubler(glublerId: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required to delete a glubler. Please configure GLUBLER_AUTH_TOKEN.');
    }
    await this.request<void>(`/api/glublers/${encodeURIComponent(glublerId)}`, {
      method: 'DELETE'
    });
  }

  async updateGlubler(glublerId: string, dto: UpdateGlublerDto): Promise<GlublerDto> {
    if (!this.token) {
      throw new Error('Authentication required to rename a glubler. Please configure GLUBLER_AUTH_TOKEN.');
    }
    if (!dto.title && !dto.slugName) {
      throw new Error('Provide at least one of: title or slugName.');
    }
    return this.request<GlublerDto>(`/api/glublers/${encodeURIComponent(glublerId)}`, {
      method: 'PUT',
      body: JSON.stringify(dto)
    });
  }

  async glueWebsite(dto: GlueWebsiteDto, timeoutMs: number = 35000): Promise<GlublerItemDto> {
    if (!this.token) {
      throw new Error('Authentication required to glue a website. Please configure GLUBLER_AUTH_TOKEN.');
    }
    const cleanUrl = this.normalizeUrl(dto.url);
    return this.request<GlublerItemDto>('/api/glublers/glue', {
      method: 'POST',
      body: JSON.stringify({
        ...dto,
        url: cleanUrl || dto.url,
        addToFeed: dto.addToFeed ?? false
      })
    }, timeoutMs);
  }

  async glueWebsitesBatch(
    glublerId: string,
    urls: string[],
    addToFeed: boolean = false
  ): Promise<{
    totalRequested: number;
    addedCount: number;
    rejectedCount: number;
    summary: string;
    added: Array<{ url: string; title?: string; category?: string }>;
    rejected: Array<{ url: string; reason: string; policyViolation: boolean }>;
  }> {
    const added: Array<{ url: string; title?: string; category?: string }> = [];
    const rejected: Array<{ url: string; reason: string; policyViolation: boolean }> = [];

    // Helper sleep function to avoid saturating backend connection sockets
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < urls.length; i++) {
      const rawUrl = urls[i];
      const cleanUrl = this.normalizeUrl(rawUrl);
      if (!cleanUrl) continue;

      // Small pause between items to let Kestrel sockets and image workers recover
      if (i > 0) {
        await sleep(350);
      }

      try {
        const item = await this.glueWebsite({
          glublerId,
          url: cleanUrl,
          addToFeed
        }, 40000); // 40s total client timeout per site

        added.push({
          url: cleanUrl,
          title: item.website?.title || cleanUrl,
          category: item.website?.categoryName
        });
      } catch (err: any) {
        const errMsg = err.message || '';
        let userFriendlyReason = errMsg;
        let isPolicy = false;

        if (errMsg.includes('Glubler Policy') || errMsg.includes('favicon')) {
          userFriendlyReason = 'Rejected: Missing authentic favicon or valid site title (Glubler Quality Policy)';
          isPolicy = true;
        } else if (errMsg.includes('timed out') || errMsg.includes('AbortError')) {
          userFriendlyReason = 'Connection timed out while fetching website';
        } else if (errMsg.includes('400') || errMsg.includes('Failed to glue')) {
          userFriendlyReason = 'Invalid URL or site was unreachable';
        }

        rejected.push({
          url: cleanUrl,
          reason: userFriendlyReason,
          policyViolation: isPolicy
        });
      }
    }

    const summary = `${added.length} of ${urls.length} websites were successfully fetched and added.${
      rejected.length > 0 ? ` ${rejected.length} website(s) were rejected or unreachable.` : ''
    }`;

    return {
      totalRequested: urls.length,
      addedCount: added.length,
      rejectedCount: rejected.length,
      summary,
      added,
      rejected
    };
  }

  async unglueWebsite(glublerId: string, url: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required to unglue a website. Please configure GLUBLER_AUTH_TOKEN.');
    }
    const params = new URLSearchParams({ url });
    await this.request<void>(`/api/glublers/${encodeURIComponent(glublerId)}/items?${params.toString()}`, {
      method: 'DELETE'
    });
  }
}
