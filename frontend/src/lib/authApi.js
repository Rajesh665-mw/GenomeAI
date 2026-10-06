import { API_BASE_URL } from "./apiBase";

async function parseJsonOrThrow(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // non-JSON error body (e.g. a raw 500) — fall through to generic message
  }
  if (!response.ok) {
    const message = body?.message || body?.detail || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function registerUser({ fullName, email, password, role }) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: fullName, email, password, role }),
  });
  return parseJsonOrThrow(response); // { access_token, token_type, user }
}

export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonOrThrow(response); // { access_token, token_type, user }
}

export async function fetchCurrentUser(token) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow(response); // user
}
