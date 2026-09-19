"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDay } from "@/lib/format";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await api("/api/notifications?page=1");
    setNotifications(res.notifications ?? []);
    setUnreadCount(res.unreadCount ?? 0);
  };

  useEffect(() => {
    let active = true;
    api("/api/notifications?page=1")
      .then((res) => {
        if (!active) return;
        setNotifications(res.notifications ?? []);
        setUnreadCount(res.unreadCount ?? 0);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load notifications.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const markOne = async (item) => {
    if (busy || item.isRead) return;
    setBusy(true);
    try {
      await api(`/api/notifications/${item.id}/read`, { method: "PATCH" });
      setSuccess("Marked read.");
      setError("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark read.");
      setSuccess("");
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api("/api/notifications/read-all", { method: "PATCH" });
      setSuccess("All notifications marked read.");
      setError("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark all read.");
      setSuccess("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[800px] space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-zinc-500">{unreadCount} unread</p>
        <button
          disabled={busy || unreadCount === 0}
          onClick={markAll}
          className="h-8 px-3 rounded-lg bg-zinc-900 text-white text-[12px] disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {success ? <p className="text-[13px] text-emerald-700">{success}</p> : null}
      {loading ? <p className="text-[13px] text-zinc-500">Loading notifications…</p> : null}
      {!loading && notifications.length === 0 ? <p className="text-[13px] text-zinc-500">No notifications.</p> : null}
      <div className="space-y-2">
        {notifications.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            onClick={() => markOne(item)}
            className={`w-full text-left bg-white border rounded-[16px] p-4 ${item.isRead ? "border-zinc-200" : "border-zinc-900"}`}
          >
            <div className="flex justify-between gap-3">
              <div className="text-[13px] font-medium">{item.title}</div>
              <div className="text-[11px] text-zinc-500">{formatDay(item.createdAt)}</div>
            </div>
            <p className="text-[12px] text-zinc-600 mt-1">{item.message}</p>
            <p className="text-[11px] text-zinc-400 mt-1">{item.isRead ? "Read" : "Unread"} • {item.type}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
