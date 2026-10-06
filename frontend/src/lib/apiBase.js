export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "http://localhost:8000");
