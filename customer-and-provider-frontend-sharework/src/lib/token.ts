const ACCESS_KEY = "sw_access_token";
const REFRESH_KEY = "sw_refresh_token";

const canUseStorage = () => typeof window !== "undefined";

export function getAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string | null): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function clearTokens(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}
