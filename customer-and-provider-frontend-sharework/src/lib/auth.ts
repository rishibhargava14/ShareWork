import { api } from "./api";
import { clearTokens, getAccessToken, setTokens } from "./token";
import type { PublicUser } from "@/models/User";

export type Role = PublicUser["role"];

export type SessionUser = PublicUser;

export interface Session {
  user: SessionUser;
}

export interface SignUpInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "customer" | "provider";
}

type BackendUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  isVerified?: boolean;
  isOnline?: boolean;
  createdAt?: string;
};

type BackendWeeklyDay = {
  day?: string;
  enabled?: boolean;
};

type BackendProfile = {
  title?: string;
  bio?: string;
  skills?: string[];
  rating?: number;
  reviewsCount?: number;
  completedProjects?: number;
  totalEarnings?: number;
  startingPrice?: number;
  country?: string;
  companyName?: string;
  availability?: {
    onlineStatus?: string;
    weeklySchedule?: BackendWeeklyDay[];
  } | null;
} | null;

type AuthPayload = {
  user: BackendUser;
  profile?: BackendProfile;
  token?: string;
  refreshToken?: string;
  message?: string;
  requiresVerification?: boolean;
  retryAfterSeconds?: number;
  verified?: boolean;
};

type Listener = () => void;

// undefined = not loaded yet
let cache: Session | null | undefined;
const listeners = new Set<Listener>();

export function getSession(): Session | null {
  return cache ?? null;
}

export function subscribeToSession(callback: Listener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function emit() {
  for (const listener of [...listeners]) listener();
}

function mapUser(user: BackendUser, profile?: BackendProfile): PublicUser {
  const schedule = profile?.availability?.weeklySchedule ?? [];
  const availabilityDays = schedule.filter((d) => d.enabled && d.day).map((d) => String(d.day));
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: "active",
    title: profile?.title,
    bio: profile?.bio,
    skills: profile?.skills ?? [],
    location: profile?.country,
    rating: typeof profile?.rating === "number" ? profile.rating : 0,
    reviews: typeof profile?.reviewsCount === "number" ? profile.reviewsCount : 0,
    online: !!user.isOnline || profile?.availability?.onlineStatus === "online",
    availabilityDays,
    isVerified: user.isVerified,
    createdAt: user.createdAt ?? "",
  };
}

function storeAuth(data: AuthPayload): PublicUser {
  if (data.token) {
    setTokens(data.token, data.refreshToken);
  }
  const user = mapUser(data.user, data.profile);
  cache = { user };
  emit();
  return user;
}

/** Fetches the current session from Express and updates the client store. */
export async function refreshSession(): Promise<Session | null> {
  if (!getAccessToken()) {
    cache = null;
    emit();
    return cache;
  }
  try {
    const data = await api<AuthPayload>("/api/users/me");
    cache = { user: mapUser(data.user, data.profile) };
  } catch {
    clearTokens();
    cache = null;
  }
  emit();
  return cache;
}

export function getSessionSnapshot(): Session | null | undefined {
  return cache;
}

export interface AuthChallenge {
  user: PublicUser;
  requiresVerification?: boolean;
  retryAfterSeconds?: number;
}

export async function signIn(input: {
  email: string;
  password: string;
  role: "customer" | "provider";
}): Promise<AuthChallenge> {
  const data = await api<AuthPayload>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return {
    user: storeAuth(data),
    requiresVerification: Boolean(data.requiresVerification || data.user?.isVerified === false),
    retryAfterSeconds: data.retryAfterSeconds,
  };
}

export async function signUp(input: SignUpInput): Promise<AuthChallenge> {
  const data = await api<AuthPayload>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return {
    user: storeAuth(data),
    requiresVerification: Boolean(data.requiresVerification || data.user?.isVerified === false),
    retryAfterSeconds: data.retryAfterSeconds,
  };
}

export async function verifyEmailOtp(input: { email: string; otp: string }): Promise<PublicUser> {
  const data = await api<AuthPayload>("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (data.token && data.user) {
    return storeAuth(data);
  }
  const session = await refreshSession();
  if (!session?.user) {
    throw new Error("Verification succeeded but session is missing.");
  }
  return session.user;
}

export async function resendEmailOtp(input: {
  email: string;
  purpose?: "verify" | "reset";
}): Promise<{ message?: string; retryAfterSeconds?: number }> {
  return api("/api/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email: input.email, purpose: input.purpose ?? "verify" }),
  });
}

export async function forgotPassword(email: string): Promise<{ message?: string }> {
  return api("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<{ message?: string }> {
  return api("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword }),
  });
}

export async function resendResetOtp(email: string): Promise<{ message?: string; retryAfterSeconds?: number }> {
  return resendEmailOtp({ email, purpose: "reset" });
}

export async function logout(): Promise<void> {
  clearTokens();
  cache = null;
  emit();
}
