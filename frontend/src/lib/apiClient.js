import { API_BASE_URL } from "./apiBase";

/**
 * Thin wrapper around fetch that attaches the bearer token and normalizes
 * error handling. Dashboard data modules (analysisApi, consultationApi)
 * build on this rather than each reimplementing auth headers + error
 * parsing.
 */
export async function apiRequest(path, { token, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // e.g. 204 No Content — nothing to parse
  }

  if (!response.ok) {
    const message = payload?.message || payload?.detail || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}
