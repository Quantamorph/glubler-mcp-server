import { GlublerDto, WebsiteSuggestionDto, WebsiteDto, CreateGlublerDto, UpdateGlublerDto, GlueWebsiteDto, GlublerItemDto } from './types.js';
export interface GlublerClientConfig {
    baseUrl?: string;
    token?: string;
}
export declare class GlublerApiClient {
    private baseUrl;
    private token;
    constructor(config?: GlublerClientConfig);
    setToken(token: string): void;
    hasToken(): boolean;
    private getHeaders;
    private normalizeUrl;
    private request;
    suggestWebsites(query: string, limit?: number): Promise<WebsiteSuggestionDto[]>;
    getWebsiteByUrl(url: string): Promise<WebsiteDto | null>;
    getMyGlublers(): Promise<GlublerDto[]>;
    getGlublerById(glublerId: string): Promise<GlublerDto>;
    getGlublerBySlug(username: string, slugName: string): Promise<GlublerDto>;
    createGlubler(dto: CreateGlublerDto): Promise<GlublerDto>;
    deleteGlubler(glublerId: string): Promise<void>;
    updateGlubler(glublerId: string, dto: UpdateGlublerDto): Promise<GlublerDto>;
    glueWebsite(dto: GlueWebsiteDto, timeoutMs?: number): Promise<GlublerItemDto>;
    glueWebsitesBatch(glublerId: string, urls: string[], addToFeed?: boolean): Promise<{
        totalRequested: number;
        addedCount: number;
        rejectedCount: number;
        summary: string;
        added: Array<{
            url: string;
            title?: string;
            category?: string;
        }>;
        rejected: Array<{
            url: string;
            reason: string;
            policyViolation: boolean;
        }>;
    }>;
    unglueWebsite(glublerId: string, url: string): Promise<void>;
}
