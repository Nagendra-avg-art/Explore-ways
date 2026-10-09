/**
 * Smart Travel Companion - Production API Configuration
 *
 * In local development and monolithic deployments, API calls use relative paths ('/api/...').
 * In distributed static hosting (e.g. Vercel client + Render backend), VITE_API_BASE_URL
 * can be defined to route calls directly to the backend origin.
 */

function resolveBaseUrl(): string {
  // Check Vite environment variable (available in browser client)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) {
      return String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/$/, '');
    }
  } catch {
    // ignore
  }

  // Check Node environment (available during automated test runners)
  try {
    if (typeof process !== 'undefined' && process.env?.TEST_SERVER_URL) {
      return String(process.env.TEST_SERVER_URL).replace(/\/$/, '');
    }
  } catch {
    // ignore
  }

  return '';
}

export const API_BASE_URL: string = resolveBaseUrl();

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
