import { api, clearTokens, setTokens } from "./api";

const USER_KEY = "sw_admin_user";

export function getStoredAdmin() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeUser(user) {
  if (typeof window === "undefined") return;
  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_KEY);
  }
}

export async function loginAdmin({ email, password }) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role: "admin" }),
  });

  if (data?.requiresOtp) {
    return { requiresOtp: true, user: data.user, retryAfterSeconds: data.retryAfterSeconds };
  }

  if (!data?.token || data?.user?.role !== "admin") {
    clearTokens();
    storeUser(null);
    throw new Error("Admin access is required.");
  }

  setTokens(data.token, data.refreshToken);
  storeUser(data.user);
  return { user: data.user, requiresOtp: false };
}

export async function verifyAdminOtp({ email, otp }) {
  const data = await api("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });

  if (!data?.token || data?.user?.role !== "admin") {
    clearTokens();
    storeUser(null);
    throw new Error("Admin OTP verification failed.");
  }

  setTokens(data.token, data.refreshToken);
  storeUser(data.user);
  return data.user;
}

export async function resendAdminOtp(email) {
  return api("/api/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email, purpose: "verify" }),
  });
}

export async function getCurrentAdmin() {
  const data = await api("/api/users/me");
  if (data?.user?.role !== "admin") {
    logoutAdmin();
    throw new Error("Admin access is required.");
  }
  storeUser(data.user);
  return data.user;
}

export function logoutAdmin() {
  clearTokens();
  storeUser(null);
}

export async function forgotPassword(email) {
  return api("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email, otp, newPassword) {
  return api("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword }),
  });
}

export async function resendResetOtp(email) {
  return api("/api/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email, purpose: "reset" }),
  });
}
