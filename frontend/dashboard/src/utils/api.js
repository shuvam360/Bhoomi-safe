/**
 * BhoomiSafe — Unified API Client Configuration
 * Automatically uses VITE_API_URL in production (Render / Cloud)
 * and falls back to http://localhost:8000 during local development.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000'
).replace(/\/+$/, '');

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
