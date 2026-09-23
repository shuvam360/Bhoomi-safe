/**
 * BhoomiSafe — Unified API Client Configuration
 * Automatically uses VITE_API_URL in production (Render / Cloud)
 * and falls back to http://localhost:8000 during local development.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('github.io')
    ? 'https://bhoomi-safe.onrender.com'
    : 'http://localhost:8000')
).replace(/\/+$/, '');

if (typeof window !== 'undefined') {
  window.__BHOOMI_API_URL__ = API_BASE_URL;
}

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
