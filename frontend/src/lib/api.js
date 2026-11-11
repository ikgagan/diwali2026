/** Backend client: cold-start aware fetch, XHR uploads with progress, small local storage helpers. */

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

export const absUrl = (path) => (path.startsWith("http") ? path : `${API_BASE}${path}`);

export class ApiError extends Error {
  constructor(message, status = 0, retryable = false) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

const RETRYABLE_STATUS = new Set([0, 408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch() with timeouts and exponential backoff. Render's free tier sleeps, so the first call
 * after idle may take ~60 s; `onRetry(attempt)` lets the UI show a "waking up" message.
 */
export async function apiFetch(path, { retries = 7, timeoutMs = 25000, onRetry, ...init } = {}) {
  let attempt = 0;
  for (;;) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(absUrl(path), { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res.status === 204 ? null : res.json();
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail || body.error || detail;
      } catch {
        /* non-JSON error body */
      }
      const retryable = RETRYABLE_STATUS.has(res.status);
      if (!retryable || attempt >= retries) throw new ApiError(detail, res.status, retryable);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ApiError) throw err;
      if (attempt >= retries) throw new ApiError("Could not reach the server", 0, true);
    }
    attempt += 1;
    onRetry?.(attempt);
    await sleep(Math.min(12000, 1500 * 2 ** (attempt - 1)));
  }
}

export const getConfig = (opts) => apiFetch("/api/config", opts);
export const getGallery = (opts) => apiFetch("/api/gallery", { ...opts, cache: "no-store" });

export const verifyPasscode = (passcode) =>
  apiFetch("/api/passcode/verify", {
    method: "POST",
    headers: { "X-Event-Passcode": passcode },
    retries: 3,
  });

/** Upload one file via XMLHttpRequest so we get progress events. Resolves with the JSON body. */
export function uploadFile(file, { passcode, onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", absUrl("/api/upload"));
    xhr.timeout = 180000;
    if (passcode) xhr.setRequestHeader("X-Event-Passcode", passcode);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new ApiError(body.detail || `Upload failed (${xhr.status})`, xhr.status, RETRYABLE_STATUS.has(xhr.status)));
    };
    xhr.onerror = () => reject(new ApiError("Network error during upload", 0, true));
    xhr.ontimeout = () => reject(new ApiError("Upload timed out", 408, true));
    xhr.onabort = () => reject(new ApiError("Upload cancelled", 499, false));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    const form = new FormData();
    form.append("file", file, file.name);
    xhr.send(form);
  });
}

// ----- admin -----------------------------------------------------------
const adminHeaders = (token) => ({ "X-Admin-Token": token });
export const adminVerify = (token) => apiFetch("/api/admin/verify", { headers: adminHeaders(token), retries: 2 });
export const adminList = (token) => apiFetch("/api/admin/photos", { headers: adminHeaders(token), retries: 2, cache: "no-store" });
export const adminDelete = (token, id) =>
  apiFetch(`/api/admin/photos/${id}`, { method: "DELETE", headers: adminHeaders(token), retries: 1 });
export const adminReindex = (token) =>
  apiFetch("/api/admin/reindex", { method: "POST", headers: adminHeaders(token), retries: 1, timeoutMs: 60000 });

// ----- tiny storage helpers (per device, convenience only) -----------------
const safeStorage = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};
export const storage = {
  get: (key) => safeStorage(() => window.localStorage.getItem(key)),
  set: (key, value) => safeStorage(() => window.localStorage.setItem(key, value)),
  remove: (key) => safeStorage(() => window.localStorage.removeItem(key)),
};
export const PASSCODE_KEY = "diwali.passcode";
export const ADMIN_KEY = "diwali.adminToken";
