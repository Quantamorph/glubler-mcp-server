export interface StoredAuthData {
    token: string;
    user?: {
        id: number;
        username: string;
        email: string;
    };
    savedAt: string;
}
/**
 * Loads stored token from local config file (~/.glubler/auth.json)
 */
export declare function loadStoredAuth(): StoredAuthData | null;
/**
 * Saves authenticated token locally
 */
export declare function saveStoredAuth(token: string, user?: StoredAuthData['user']): void;
/**
 * Clears stored auth credentials
 */
export declare function clearStoredAuth(): void;
/**
 * Starts a temporary local HTTP server to receive the authorization token via Canva-style browser login.
 * When the user logs into Glubler in their browser, they get redirected to http://localhost:<port>/callback?token=<jwt>
 */
export declare function startAuthServer(port?: number, timeoutMs?: number): Promise<{
    token: string;
    user?: any;
}>;
