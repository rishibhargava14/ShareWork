"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  FolderKanban,
  Package,
  CreditCard,
  Clock,
  DollarSign,
  Menu,
  Search,
  Bell,
  Shield,
  Briefcase,
} from "@/components/icons/HtmlIcons";
import Logo from "@/components/Logo";
import { useSessionState } from "@/components/session/use-session";
import { Spinner } from "@/components/app/ui";
import { useSpaNav, type SpaView } from "@/components/app/SpaNav";
import { api } from "@/lib/api";
import { unreadFor } from "@/lib/chat";
import { useAsync } from "@/lib/use-async";
import { connectChatSocket } from "@/lib/socket";
import type { ExpressConversation } from "@/lib/express";

const ESCROW_STEPS = ["Chat", "Agreement", "Escrow Locked", "Delivery", "Payment"] as const;

export function AppShell({
  children,
  requireAuth = true,
}: {
  children: ReactNode;
  requireAuth?: boolean;
}) {
  const spa = useSpaNav();
  const goAuth = spa.goAuth;
  const goLanding = spa.goLanding;
  const session = useSessionState();
  const [open, setOpen] = useState(false);
  const [bellNote, setBellNote] = useState(false);
  const inbox = useAsync<{ conversations: ExpressConversation[] }>(
    () => (session?.user.id ? api("/api/conversations") : Promise.resolve({ conversations: [] })),
    [session?.user.id],
  );
  const notes = useAsync<{
    notifications: Array<{ id: string; title: string; message: string; isRead: boolean; createdAt?: string }>;
    unreadCount: number;
  }>(
    () =>
      session?.user.id
        ? api("/api/notifications?page=1")
        : Promise.resolve({ notifications: [], unreadCount: 0 }),
    [session?.user.id],
  );
  const unreadTotal = (inbox.data?.conversations ?? []).reduce((sum, item) => sum + unreadFor(item, session?.user.id), 0);
  const reloadInbox = inbox.reload;

  useEffect(() => {
    if (!requireAuth) return;
    if (session === undefined) return;
    if (!session) goAuth("login");
    else if (session.user.role === "admin") goLanding();
  }, [requireAuth, session, goAuth, goLanding]);

  useEffect(() => {
    const socket = connectChatSocket();
    if (!socket) return undefined;
    socket.on("new_message", reloadInbox);
    socket.on("connect", reloadInbox);
    return () => {
      socket.off("new_message", reloadInbox);
      socket.off("connect", reloadInbox);
    };
  }, [session?.user.id, reloadInbox]);

  if (requireAuth && (session === undefined || !session || session.user.role === "admin")) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-white text-[13px] text-zinc-500">
        <Spinner className="h-5 w-5" />
        Checking your session…
      </div>
    );
  }

  if (!session) return null;

  const isCustomer = session.user.role === "customer";
  const accent = isCustomer ? "blue" : "green";
  const accentHex = isCustomer ? "#2563EB" : "#16A34A";

  const nav: { label: string; view: SpaView; icon: typeof Search }[] = isCustomer
    ? [
        { label: "Discover", view: "discover", icon: Search },
        { label: "Messages", view: "messages", icon: MessageSquare },
        { label: "My Projects", view: "projects", icon: FolderKanban },
        { label: "Requirements", view: "requirements", icon: Briefcase },
        { label: "Payments", view: "payments", icon: CreditCard },
      ]
    : [
        { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
        { label: "My Gigs", view: "gigs", icon: Package },
        { label: "Messages", view: "messages", icon: MessageSquare },
        { label: "Projects", view: "projects", icon: FolderKanban },
        { label: "Earnings", view: "earnings", icon: DollarSign },
        { label: "Availability", view: "availability", icon: Clock },
      ];

  const crumb =
    spa.view === "freelancer"
      ? "discover"
      : spa.view === "gigs"
        ? "gigs"
        : spa.view;

  const sidebar = (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-r border-zinc-200 bg-[#FAFAFA]">
      <div className="flex h-[56px] items-center justify-between border-b border-zinc-200 px-5">
        <button
          type="button"
          onClick={() => spa.setView(isCustomer ? "discover" : "dashboard")}
          className="flex items-center gap-2 font-bold"
        >
          <Logo accent={accent} />
        </button>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: accentHex }}
        >
          {isCustomer ? "CUSTOMER" : "PROVIDER"}
        </span>
      </div>

      <div className="flex-1 overflow-auto px-3 py-3">
        <p className="mb-2 px-2 text-[11px] font-semibold tracking-widest text-zinc-500">WORKSPACE</p>
        <nav aria-label="Workspace" className="space-y-1">
          {nav.map((item) => {
            const active =
              spa.view === item.view || (item.view === "discover" && spa.view === "freelancer") || (item.view === "messages" && spa.view === "messages");
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => {
                  spa.setView(item.view);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] font-medium ${
                  active ? "border border-zinc-200 bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                }`}
              >
                <item.icon size={16} />
                {item.label}
                {item.view === "messages" && unreadTotal > 0 && (
                  <span className="ml-auto rounded-full px-1.5 text-[10px] font-bold text-white" style={{ background: accentHex }}>
                    {unreadTotal}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-4 rounded-[8px] border border-zinc-200 bg-white p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-900">
            <Shield size={14} /> Escrow Flow
          </p>
          <div className="mt-2 space-y-1.5">
            {ESCROW_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2 text-[11px]">
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                    i <= 2 ? "text-white" : "bg-zinc-200 text-zinc-600"
                  }`}
                  style={i <= 2 ? { background: accentHex } : undefined}
                >
                  {i + 1}
                </div>
                <span className={i <= 2 ? "font-medium text-zinc-900" : "text-zinc-500"}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 p-3">
        <button
          type="button"
          onClick={() => {
            spa.setView("profile");
            setOpen(false);
          }}
          className="flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left hover:border-zinc-200 hover:bg-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
            {session.user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-zinc-900">{session.user.name || "You"}</span>
            <span className="block truncate text-[11px] text-zinc-500">{session.user.email || "Signed in"}</span>
          </span>
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={spa.goLanding}
            className="flex h-8 items-center justify-center gap-1 rounded-[6px] border border-zinc-200 text-[12px] hover:bg-white"
          >
            Exit
          </button>
          <button
            type="button"
            disabled
            title="Role is set at signup. Customer and Provider are separate accounts."
            className="flex h-8 items-center justify-center gap-1 rounded-[6px] text-[12px] text-white opacity-60"
            style={{ background: isCustomer ? "#16A34A" : "#2563EB" }}
          >
            Switch to {isCustomer ? "Provider" : "Customer"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden relative bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <aside className={`${open ? "" : "-translate-x-full md:translate-x-0"} z-50 transition absolute h-full md:static`}>{sidebar}</aside>

      {open && (
        <button type="button" className="fixed inset-0 z-40 transition duration-300 bg-black/30 md:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded border border-zinc-200 p-1.5 md:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={16} />
            </button>
            <div className="hidden items-center gap-2 text-[13px] text-zinc-500 md:flex">
              <span className="font-medium text-zinc-900">{crumb}</span>
              <span>/</span>
              <span>fixed-price only</span>
            </div>
            <div className="font-semibold text-[14px] md:hidden">{crumb}</div>
          </div>
          <div className="relative flex items-center gap-2">
            {isCustomer ? (
              <button
                type="button"
                onClick={() => spa.setView("discover")}
                className="hidden h-8 items-center gap-2 rounded-[8px] border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-500 md:flex"
              >
                <Search size={14} /> Search experts
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setBellNote((value) => !value)}
              className="relative flex h-8 w-8 items-center justify-center rounded-[8px] border border-zinc-200 hover:bg-zinc-50"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {(notes.data?.unreadCount ?? 0) > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[14px] rounded-full bg-red-600 px-1 text-[9px] text-white">
                  {notes.data?.unreadCount}
                </span>
              ) : null}
            </button>
            {bellNote ? (
              <div className="absolute right-10 top-10 z-20 w-72 rounded-[8px] border border-zinc-200 bg-white p-3 text-[11px] text-zinc-600 shadow-sm">
                {notes.loading ? <p>Loading…</p> : null}
                {notes.error ? <p className="text-red-600">{notes.error.message}</p> : null}
                {(notes.data?.notifications ?? []).length === 0 && !notes.loading ? <p>No notifications.</p> : null}
                <div className="max-h-64 space-y-2 overflow-auto">
                  {(notes.data?.notifications ?? []).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="block w-full rounded border border-zinc-100 p-2 text-left"
                      onClick={async () => {
                        if (!item.isRead) {
                          await api(`/api/notifications/${item.id}/read`, { method: "PATCH" });
                          notes.reload();
                        }
                      }}
                    >
                      <div className="font-medium text-zinc-900">{item.title}</div>
                      <div>{item.message}</div>
                      <div className="text-zinc-400">{item.isRead ? "Read" : "Unread"}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: accentHex }}>
              {session.user.name.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-[#FCFCFC]">{children}</div>
      </div>
    </div>
  );
}

export function MarketplaceFrame({ children }: { children: ReactNode }) {
  return <AppShell requireAuth>{children}</AppShell>;
}
