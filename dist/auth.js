import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
const CONFIG_DIR = path.join(os.homedir(), '.glubler');
const TOKEN_FILE = path.join(CONFIG_DIR, 'auth.json');
/**
 * Loads stored token from local config file (~/.glubler/auth.json)
 */
export function loadStoredAuth() {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            const data = fs.readFileSync(TOKEN_FILE, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch {
        // ignore
    }
    return null;
}
/**
 * Saves authenticated token locally
 */
export function saveStoredAuth(token, user) {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        const data = {
            token,
            user,
            savedAt: new Date().toISOString()
        };
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }
    catch (err) {
        console.error('Failed to save auth token:', err);
    }
}
/**
 * Clears stored auth credentials
 */
export function clearStoredAuth() {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            fs.unlinkSync(TOKEN_FILE);
        }
    }
    catch {
        // ignore
    }
}
/**
 * Starts a temporary local HTTP server to receive the authorization token via Canva-style browser login.
 * When the user logs into Glubler in their browser, they get redirected to http://localhost:<port>/callback?token=<jwt>
 */
export async function startAuthServer(port = 47823, timeoutMs = 180000) {
    return new Promise((resolve, reject) => {
        let timeoutId;
        const server = http.createServer((req, res) => {
            const reqUrl = new URL(req.url || '/', `http://localhost:${port}`);
            if (reqUrl.pathname === '/callback') {
                const token = reqUrl.searchParams.get('token');
                const username = reqUrl.searchParams.get('username') || undefined;
                const email = reqUrl.searchParams.get('email') || undefined;
                const idStr = reqUrl.searchParams.get('id');
                const id = idStr ? parseInt(idStr, 10) : 0;
                if (token) {
                    saveStoredAuth(token, { id, username: username || '', email: email || '' });
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Glubler Connected</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #060912; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                  .card { background: #151928; border: 1px solid #293049; border-radius: 14px; padding: 36px 42px; text-align: center; max-width: 440px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                  h1 { color: #FFCF25; margin-bottom: 12px; font-size: 24px; }
                  p { color: #A0A5BA; line-height: 1.5; font-size: 15px; }
                  .badge { background: #1E2538; padding: 6px 14px; border-radius: 20px; font-size: 13px; color: #E0E2EC; display: inline-block; margin-top: 15px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>Successfully Connected!</h1>
                  <p>Your Glubler account is now connected to your AI assistant.</p>
                  <div class="badge">You can close this tab and return to your AI</div>
                </div>
              </body>
            </html>
          `);
                    clearTimeout(timeoutId);
                    server.close(() => {
                        resolve({ token, user: { id, username, email } });
                    });
                }
                else {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Missing authentication token.');
                }
            }
            else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not found');
            }
        });
        server.listen(port, () => {
            timeoutId = setTimeout(() => {
                server.close();
                reject(new Error('Authentication timed out after 3 minutes. Please try again.'));
            }, timeoutMs);
        });
        server.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
        });
    });
}
