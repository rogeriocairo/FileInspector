/// <reference types="vite/client" />

interface GoogleTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  requestAccessToken(options?: { prompt?: string }): void
}

interface GoogleAccountsOAuth2 {
  initTokenClient(options: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback: (error: { type: string; message?: string }) => void
  }): GoogleTokenClient
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: GoogleAccountsOAuth2
      }
    }
  }
}

export {}
