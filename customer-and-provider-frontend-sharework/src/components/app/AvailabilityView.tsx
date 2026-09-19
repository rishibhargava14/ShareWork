"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { ErrorNote, Loader } from "@/components/app/ui";
import { WEEKDAYS } from "@/lib/constants";
import { refreshSession } from "@/lib/auth";
import type { ExpressProviderProfile, ExpressUser, ExpressWeeklyDay } from "@/lib/express";

type MeResponse = {
  user: ExpressUser;
  profile: ExpressProviderProfile | null;
};

const DEFAULT_DAYS = [true, true, true, true, true, false, false];

export function AvailabilityView() {
  const me = useAsync<MeResponse>(() => api("/api/users/me"), []);
  const [daysOverride, setDaysOverride] = useState<boolean[] | null>(null);
  const [onlineOverride, setOnlineOverride] = useState<boolean | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const profile = me.data?.profile;
  const user = me.data?.user;
  const schedule = profile?.availability?.weeklySchedule ?? [];
  const derivedDays =
    schedule.length > 0
      ? WEEKDAYS.map((day) => Boolean(schedule.find((item: ExpressWeeklyDay) => item.day === day && item.enabled)))
      : DEFAULT_DAYS;
  const days = daysOverride ?? derivedDays;
  const online = onlineOverride ?? (profile?.availability?.onlineStatus === "online" || !!user?.isOnline);

  const saveSchedule = async (nextDays: boolean[]) => {
    if (saving) return;
    setError(null);
    setSaving(true);
    setDaysOverride(nextDays);
    try {
      await api("/api/provider/availability", {
        method: "POST",
        body: JSON.stringify({
          weeklySchedule: WEEKDAYS.map((day, i) => ({
            day,
            enabled: nextDays[i],
            ...(nextDays[i] ? { start: "09:00", end: "18:00" } : {}),
          })),
          vacationMode: { enabled: false },
        }),
      });
      await refreshSession();
      me.reload();
    } catch (err) {
      setDaysOverride(null);
      setError(err instanceof Error ? err : new Error("Could not save availability."));
    } finally {
      setSaving(false);
    }
  };

  const saveOnline = async (nextOnline: boolean) => {
    if (saving) return;
    setError(null);
    setSaving(true);
    setOnlineOverride(nextOnline);
    try {
      await api("/api/provider/availability/toggle-online", {
        method: "PUT",
        body: JSON.stringify({ onlineStatus: nextOnline ? "online" : "offline" }),
      });
      await refreshSession();
      me.reload();
    } catch (err) {
      setOnlineOverride(null);
      setError(err instanceof Error ? err : new Error("Could not update online status."));
    } finally {
      setSaving(false);
    }
  };

  if (me.loading && !me.data) return <Loader label="Loading availability…" />;
  if (me.error && !me.data) return <ErrorNote error={me.error} />;

  return (
    <div className="max-w-[600px] p-6">
      <h1 className="text-[22px] font-bold">Availability</h1>
      {error ? <ErrorNote error={error} className="mt-4" /> : null}
      {saving ? <p className="mt-3 text-[12px] text-zinc-500">Saving…</p> : null}
      <div className="mt-6 rounded-[12px] border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[13px]">Online Status</p>
            <p className="text-[12px] text-zinc-600">Show as online to customers</p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              void saveOnline(!online);
            }}
            className={`h-6 w-11 rounded-full p-0.5 transition disabled:opacity-60 ${online ? "bg-[#16A34A]" : "bg-zinc-300"}`}
          >
            <div className={`h-5 w-5 rounded-full bg-white shadow transition ${online ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <div className="mt-6">
          <p className="text-[13px] font-medium">Weekly Schedule</p>
          <div className="mt-3 space-y-2">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className="flex items-center justify-between border-b border-zinc-100 py-2 last:border-0">
                <span className="text-[13px]">{day}</span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const next = days.map((v, idx) => (idx === i ? !v : v));
                    void saveSchedule(next);
                  }}
                  className={`h-5 w-9 rounded-full p-0.5 transition disabled:opacity-60 ${days[i] ? "bg-[#16A34A]" : "bg-zinc-300"}`}
                >
                  <div className={`h-4 w-4 rounded-full bg-white shadow transition ${days[i] ? "translate-x-4" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
