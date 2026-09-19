import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { Role } from "@/lib/constants";

export const SESSION_COOKIE = "sw_session";
const JWT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "suspended";
}

function secret(): string {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production.");
    }
    return "sharework-dev-secret-change-me";
  }
  return process.env.JWT_SECRET;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: "7d" });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, secret()) as SessionPayload;
    if (!decoded || typeof decoded.sub !== "string" || typeof decoded.role !== "string") {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: JWT_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const payload = verifySessionToken(token);
    if (!payload) return null;
    const { connectDB } = await import("@/lib/db");
    await connectDB();
    const { default: User } = await import("@/models/User");
    const user = await User.findById(payload.sub).select("status role name").lean();
    if (!user || user.status !== "active") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: user.name ?? payload.name,
      role: user.role ?? payload.role,
      status: "active",
    };
  } catch {
    return null;
  }
}