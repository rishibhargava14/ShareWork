"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAdmin, getStoredAdmin } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Wallet,
  ShieldAlert,
  Scale,
  LayoutGrid,
  Settings,
  LogOut,
  X,
  Bell,
} from "lucide-react";

const overview = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "users", label: "User Management", href: "/users", icon: Users, countKey: "users" },
  { id: "projects", label: "Projects", href: "/projects", icon: FolderKanban, countKey: "projects" },
  { id: "escrow", label: "Escrow & Payments", href: "/escrow", icon: Wallet },
];

const riskOps = [
  { id: "leakage", label: "Leakage Monitor", href: "/leakage", icon: ShieldAlert, countKey: "leakageCount", alert: true },
  { id: "disputes", label: "Dispute Center", href: "/disputes", icon: Scale, countKey: "disputesOpen", alert: true },
  { id: "categories", label: "Categories", href: "/categories", icon: LayoutGrid },
  { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell, countKey: "unread" },
];

function navClass(active) {
  return `w-full flex items-center gap-3 px-3 h-9 rounded-xl text-[13px] transition ${
    active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60"
  }`;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      api("/api/admin/stats").catch(() => null),
      api("/api/notifications/unread-count").catch(() => null),
    ]).then(([nextStats, nextUnread]) => {
      if (!active) return;
      setStats(nextStats);
      setUnread(nextUnread?.unreadCount ?? 0);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const countFor = (key) => {
    if (!key) return null;
    if (key === "unread") return unread || null;
    return stats?.[key] ?? null;
  };

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-30 w-[268px] bg-[#0A0A0B] border-r border-zinc-900 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="h-[64px] flex items-center gap-3 px-6 border-b border-zinc-900">
        <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-[13px]">
          S
        </div>
        <div>
          <div className="text-white font-semibold text-[14px] tracking-tight leading-none">ShareWork</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">Admin</div>
        </div>
        <div className="ml-auto lg:hidden">
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-600 px-3 mb-2">Overview</div>
          <nav className="space-y-1">
            {overview.map((item) => {
              const Icon = item.icon;
              const count = countFor(item.countKey);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={navClass(isActive(item.href))}
                >
                  <Icon className="w-4 h-4" /> {item.label}
                  {count ? (
                    <span className="ml-auto text-[11px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md">
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-600 px-3 mb-2">Risk & Ops</div>
          <nav className="space-y-1">
            {riskOps.map((item) => {
              const Icon = item.icon;
              const count = countFor(item.countKey);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={navClass(isActive(item.href))}
                >
                  <Icon className="w-4 h-4" /> {item.label}
                  {item.alert && count ? (
                    <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  ) : count ? (
                    <span className="ml-auto text-[11px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md">
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-600 px-3 mb-2">System</div>
          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className={`w-full flex items-center gap-3 px-3 h-9 rounded-xl text-[13px] transition ${
              isActive("/settings") ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Settings className="w-4 h-4" /> Settings
          </Link>
        </div>
      </div>

      <div className="p-3 border-t border-zinc-900">
        <div className="bg-zinc-900/70 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-700 text-white flex items-center justify-center text-[11px] font-bold">
            {(getStoredAdmin()?.name || "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-white truncate">{getStoredAdmin()?.name || "Admin"}</div>
            <div className="text-[11px] text-zinc-500 truncate">{getStoredAdmin()?.email || ""}</div>
          </div>
          <button
            type="button"
            aria-label="Log out"
            onClick={() => {
              logoutAdmin();
              router.push("/login");
            }}
            className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
