export interface WebsiteDto {
    id: number;
    url: string;
    title: string;
    originalFaviconUrl?: string;
    metaKeywords?: string;
    metaDescription?: string;
    glueCount: number;
    categoryName?: string;
}
export interface WebsiteSuggestionDto {
    id: number;
    url: string;
    title: string;
    originalFaviconUrl?: string;
    glueCount: number;
}
export interface GlublerItemDto {
    id: number;
    website: WebsiteDto;
    gluedAt: string;
}
export interface GlublerDto {
    id: number;
    glublerId: string;
    title: string;
    slugName: string;
    parentGlublerId?: number | null;
    parentGlublerStringId?: string | null;
    parentSlugName?: string | null;
    parentTitle?: string | null;
    nestingLevel: number;
    createdAt: string;
    userId: number;
    items: GlublerItemDto[];
    subGlublers: GlublerDto[];
}
export interface CreateGlublerDto {
    glublerId: string;
    title: string;
    slugName?: string;
    parentGlublerId?: number;
}
export interface UpdateGlublerDto {
    title?: string;
    slugName?: string;
}
export interface GlueWebsiteDto {
    glublerId: string;
    url: string;
    title?: string;
    faviconUrl?: string;
    addToFeed?: boolean;
}
export interface UserDataDto {
    id: number;
    username: string;
    displayName?: string;
    email: string;
    bio?: string;
    userPlan: string;
}
