"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

function pinHomeUrl() {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/" || window.location.search || window.location.hash) {
    window.history.replaceState(null, "", "/");
  }
}

export type SpaScreen = "landing" | "auth" | "app";
export type SpaView =
  | "discover"
  | "freelancer"
  | "messages"
  | "projects"
  | "payments"
  | "dashboard"
  | "gigs"
  | "earnings"
  | "availability"
  | "requirements"
  | "profile";

export interface SpaNav {
  screen: SpaScreen;
  view: SpaView;
  authMode: "login" | "signup";
  expertName: string;
  inboxName: string;
  projectId: string;
  goLanding: () => void;
  goAuth: (mode?: "login" | "signup") => void;
  goApp: (view?: SpaView) => void;
  setView: (view: SpaView, extra?: { expertName?: string; inboxName?: string; projectId?: string }) => void;
}

const Ctx = createContext<SpaNav | null>(null);

export function useSpaNav() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SpaNav missing");
  return ctx;
}

export function SpaProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<SpaScreen>("landing");
  const [view, setViewState] = useState<SpaView>("discover");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [expertName, setExpertName] = useState("");
  const [inboxName, setInboxName] = useState("");
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    pinHomeUrl();
  }, [screen, view]);

  const goLanding = useCallback(() => setScreen("landing"), []);
  const goAuth = useCallback((mode: "login" | "signup" = "signup") => {
    setAuthMode(mode);
    setScreen("auth");
  }, []);
  const goApp = useCallback((next?: SpaView) => {
    if (next) setViewState(next);
    setScreen("app");
  }, []);
  const setView = useCallback((next: SpaView, extra?: { expertName?: string; inboxName?: string; projectId?: string }) => {
    setViewState(next);
    if (extra?.expertName !== undefined) setExpertName(extra.expertName);
    if (extra?.inboxName !== undefined) setInboxName(extra.inboxName);
    if (next === "projects") setProjectId(extra?.projectId ?? "");
    else if (extra?.projectId !== undefined) setProjectId(extra.projectId);
    setScreen("app");
  }, []);

  const value = useMemo<SpaNav>(
    () => ({
      screen,
      view,
      authMode,
      expertName,
      inboxName,
      projectId,
      goLanding,
      goAuth,
      goApp,
      setView,
    }),
    [screen, view, authMode, expertName, inboxName, projectId, goLanding, goAuth, goApp, setView]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
