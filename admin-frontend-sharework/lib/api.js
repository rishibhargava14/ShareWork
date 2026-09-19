const ACCESS_KEY = "sw_admin_access_token";
const REFRESH_KEY = "sw_admin_refresh_token";
const COOKIE_NAME = "sw_admin_token";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

export function getApiBaseUrl() {
  return API_BASE;
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

function writeAdminCookie(token) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
}

function clearAdminCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0`;
}

export function setTokens(accessToken, refreshToken) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  }
  writeAdminCookie(accessToken);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  clearAdminCookie();
}

export class ApiError extends Error {
  constructor(message, status = 500, retryAfterSeconds, fields) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.fields = fields;
  }
}

function fieldsFromDetails(details) {
  if (!Array.isArray(details)) return undefined;
  const fields = {};
  for (const item of details) {
    if (item && typeof item === "object" && "path" in item && "message" in item) {
      const path = String(item.path ?? "");
      const message = String(item.message ?? "");
      if (path && message && !fields[path]) fields[path] = message;
    }
  }
  return Object.keys(fields).length ? fields : undefined;
}

function retryAfterFromDetails(details) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
  const value = Number(details.retryAfterSeconds);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.ceil(value);
}

function apiUrl(path) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(apiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.token) {
      clearTokens();
      return false;
    }
    setTokens(data.token, data.refreshToken ?? refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

function shouldAttemptRefresh(path, status) {
  if (status !== 401) return false;
  return (
    !path.includes("/api/auth/login") &&
    !path.includes("/api/auth/refresh") &&
    !path.includes("/api/auth/forgot-password") &&
    !path.includes("/api/auth/reset-password") &&
    !path.includes("/api/auth/verify-otp") &&
    !path.includes("/api/auth/resend-otp")
  );
}

/** Client HTTP goes to sharework-backend. */
export async function api(path, init = {}, retry = true) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(apiUrl(path), { ...init, headers });
  const data = await res.json().catch(() => null);

  if (retry && shouldAttemptRefresh(path, res.status)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return api(path, init, false);
    }
  }

  if (!res.ok) {
    throw new ApiError(
      data?.message ?? `Request failed (${res.status})`,
      res.status,
      retryAfterFromDetails(data?.details),
      fieldsFromDetails(data?.details),
    );
  }

  return data;
}
