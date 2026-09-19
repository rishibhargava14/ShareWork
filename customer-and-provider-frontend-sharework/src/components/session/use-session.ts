"use client";

import { useSyncExternalStore } from "react";
import { getSession, getSessionSnapshot, subscribeToSession } from "@/lib/auth";
import type { Session } from "@/lib/auth";

export function useSession(): Session | null {
  return useSyncExternalStore(subscribeToSession, getSession, () => null);
}

/** undefined = session not hydrated yet (avoid flashing Sign in). */
export function useSessionState(): Session | null | undefined {
  return useSyncExternalStore(subscribeToSession, getSessionSnapshot, () => undefined);
}