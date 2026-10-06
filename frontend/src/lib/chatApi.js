import { API_BASE_URL } from "./apiBase";

/**
 * Streams one planner turn from POST /api/v1/chat/stream.
 *
 * The backend emits SSE frames shaped `event: <type>\ndata: <json>\n\n`.
 * fetch()'s streaming body reader (not EventSource, since EventSource can't
 * send a POST body) is used to consume them as they arrive, so the UI can
 * render the planner's reasoning — tool calls, tool results, streamed
 * answer text — progressively instead of waiting for the whole turn.
 *
 * @param {string} sessionId
 * @param {string} message
 * @param {(type: string, data: object) => void} onEvent
 * @param {AbortSignal} [signal]
 * @param {string} [token] - optional bearer token; when provided, the
 *   resulting report is tied to the logged-in user's account (so it shows
 *   up in their Analysis History). Omitted entirely for the anonymous
 *   landing-page demo, which must keep working without a token.
 */
export async function streamChatTurn(sessionId, message, onEvent, signal, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ session_id: sessionId, message }),
    signal,
  });

  if (!response.ok || !response.body) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.message || body.detail || detail;
    } catch {
      // response wasn't JSON — keep the status-code message
    }
    onEvent("error", { message: detail });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let frameEnd;
    while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);
      parseFrame(frame, onEvent);
    }
  }
}

function parseFrame(frame, onEvent) {
  let eventType = "message";
  let dataLine = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLine += line.slice(5).trim();
    }
  }
  if (!dataLine) return;
  try {
    onEvent(eventType, JSON.parse(dataLine));
  } catch {
    // malformed frame — skip rather than crash the stream
  }
}

export function newSessionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
