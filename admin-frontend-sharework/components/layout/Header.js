"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { api } from "@/lib/api";

export default function Header({ setSidebarOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = (pathname.split("/").filter(Boolean).pop() || "dashboard").replace("-", " ");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    api("/api/notifications/unread-count")
      .then((res) => {
        if (active) setUnread(res.unreadCount ?? 0);
      })
      .catch(() => {
        if (active) setUnread(0);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <header className="h-[64px] bg-white border-b border-zinc-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight capitalize">{title}</h2>
          <p className="text-[12px] text-zinc-500 hidden sm:block">Manage and monitor ShareWork operations</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-full bg-zinc-100 border border-zinc-200 text-[12px] text-zinc-600">
          <div className="w-2 h-2 rounded-full bg-emerald-500" /> Live monitoring
        </div>
        <button
          onClick={() => router.push("/notifications")}
          className="relative h-9 w-9 rounded-xl bg-zinc-100 flex items-center justify-center"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
              {unread}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}
