/**
 * API base URL for the backend.
 * - In browser: uses VITE_API_URL if set (e.g. in production), otherwise "" (relative, for dev proxy).
 * - In Node/SSR: uses localhost for server-side fetch.
 */
export const API_BASE =
  typeof window !== "undefined"
    ? (import.meta.env.VITE_API_URL ?? "")
    : "http://localhost:4000";
