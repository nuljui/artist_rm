declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

// Minimal scopes for "Sign In" - we aren't using GAPI strictly for parsing, 
// just to get an Access Token to verify identity.
// 'email' and 'profile' are standard. 
// If we used GAPI Sheets directly we'd need spreadsheets scope, 
// but here we just need to prove "Who I Am" to the script.
const SCOPES = 'https://www.googleapis.com/auth/userinfo.email';

export class GoogleAuthService {
    public static tokenClient: any;
    public static accessToken: string | null = null;
    public static isInitialized = false;

    public static async init(clientId: string): Promise<void> {
        if (this.isInitialized) return;

        return new Promise((resolve, reject) => {
            try {
                // Init GIS Token Client (New Way)
                this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPES,
                    callback: (resp: any) => {
                        if (resp.error) {
                            console.error(resp);
                            return;
                        }
                        this.accessToken = resp.access_token;
                    },
                });
                this.isInitialized = true;
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    public static async signIn(): Promise<string> {
        return new Promise((resolve) => {
            if (!this.tokenClient) return resolve('');

            this.tokenClient.callback = (resp: any) => {
                if (resp.error) {
                    resolve('');
                    return;
                }
                this.accessToken = resp.access_token;
                resolve(resp.access_token);
            };

            this.tokenClient.requestAccessToken({ prompt: '' });
        });
    }

    public static getAccessToken() {
        return this.accessToken;
    }
}
