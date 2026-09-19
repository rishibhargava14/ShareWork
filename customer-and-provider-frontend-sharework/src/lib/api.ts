import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./token";

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    code = "ERROR",
    fields?: Record<string, string>,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");

function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

type ApiJson = {
  success?: boolean;
  message?: string;
  details?: unknown;
  error?: { code?: string; message?: string; fields?: Record<string, string> };
};

function fieldsFromDetails(details: unknown): Record<string, string> | undefined {
  if (!Array.isArray(details)) return undefined;
  const fields: Record<string, string> = {};
  for (const item of details) {
    if (item && typeof item === "object" && "path" in item && "message" in item) {
      const path = String((item as { path: unknown }).path ?? "");
      const message = String((item as { message: unknown }).message ?? "");
      if (path && message && !fields[path]) fields[path] = message;
    }
  }
  return Object.keys(fields).length ? fields : undefined;
}

function retryAfterFromDetails(details: unknown): number | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
  const value = Number((details as { retryAfterSeconds?: unknown }).retryAfterSeconds);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.ceil(value);
}

function toApiError(status: number, data: ApiJson | null): ApiError {
  const nested = data?.error;
  return new ApiError(
    nested?.message ?? data?.message ?? `Request failed (${status})`,
    status,
    nested?.code ?? "ERROR",
    nested?.fields ?? fieldsFromDetails(data?.details),
    retryAfterFromDetails(data?.details),
  );
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(apiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = (await res.json().catch(() => null)) as
      | { token?: string; refreshToken?: string }
      | null;
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

function shouldAttemptRefresh(path: string, status: number): boolean {
  if (status !== 401) return false;
  return (
    !path.includes("/api/auth/login") &&
    !path.includes("/api/auth/signup") &&
    !path.includes("/api/auth/refresh") &&
    !path.includes("/api/auth/verify-otp") &&
    !path.includes("/api/auth/resend-otp") &&
    !path.includes("/api/auth/forgot-password") &&
    !path.includes("/api/auth/reset-password")
  );
}

/** All client HTTP goes to sharework-backend. Next.js `src/app/api` is frozen and unused. */
export async function api<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const headers = new Headers(init?.headers);
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (isForm) {
    headers.delete("Content-Type");
  } else if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(apiUrl(path), { ...init, headers });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (retry && res.status === 401 && shouldAttemptRefresh(path, res.status)) {
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }
    const refreshed = await refreshInFlight;
    if (refreshed) {
      return api<T>(path, init, false);
    }
  }

  if (!res.ok) {
    throw toApiError(res.status, data as ApiJson | null);
  }

  return data as T;
}

export async function apiBlob(path: string, retry = true): Promise<{ blob: Blob; filename: string; contentType: string }> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(apiUrl(path), { headers });
  if (retry && res.status === 401 && shouldAttemptRefresh(path, res.status)) {
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }
    const refreshed = await refreshInFlight;
    if (refreshed) return apiBlob(path, false);
  }

  if (!res.ok) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* not json */
    }
    throw toApiError(res.status, data as ApiJson | null);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const matched = disposition.match(/filename="([^"]+)"/i);
  return {
    blob,
    filename: matched?.[1] || "download",
    contentType: res.headers.get("content-type") || blob.type,
  };
}

export function getApiBaseUrl(): string {
  return API_BASE;
}
