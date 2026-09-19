"use client";

import { useState } from "react";
import { DollarSign } from "@/components/icons/HtmlIcons";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import ProfileForm from "@/components/app/ProfileForm";
import ServicesManager from "@/components/app/ServicesManager";
import { ErrorNote, Loader } from "@/components/app/ui";
import { useSpaNav } from "@/components/app/SpaNav";
import { refreshSession } from "@/lib/auth";
import { useSession } from "@/components/session/use-session";
import {
  apiProjectStatusLabel,
  compactInr,
  type DashboardStats,
  type ExpressProject,
  type ExpressUser,
} from "@/lib/express";

export default function ProviderDashboard({ tab = "overview" }: { tab?: string }) {
  const spa = useSpaNav();
  const session = useSession();
  const stats = useAsync<DashboardStats>(() => api("/api/provider/dashboard/stats"), []);
  const projects = useAsync<{ projects: ExpressProject[] }>(() => api("/api/projects?role=provider"), []);
  const me = useAsync<{ user: ExpressUser; profile: { reviewsCount?: number; rating?: number } | null }>(
    () => api("/api/users/me"),
    [],
  );
  const [toggleError, setToggleError] = useState<Error | null>(null);
  const [toggling, setToggling] = useState(false);

  const goOnline = async () => {
    const next = session?.user.online ? "offline" : "online";
    setToggleError(null);
    setToggling(true);
    try {
      await api("/api/provider/availability/toggle-online", {
        method: "PUT",
        body: JSON.stringify({ onlineStatus: next }),
      });
      await refreshSession();
      me.reload();
    } catch (err) {
      setToggleError(err instanceof Error ? err : new Error("Could not update online status."));
    } finally {
      setToggling(false);
    }
  };

  if (tab === "services") {
    return (
      <div className="max-w-[800px] p-6">
        <ServicesManager />
      </div>
    );
  }

  if (tab === "profile") {
    return (
      <div className="max-w-[600px] p-6">
        <h1 className="text-[22px] font-bold">Profile</h1>
        <div className="mt-6">
          <ProfileForm />
        </div>
      </div>
    );
  }

  const earningsTotal = stats.data?.earnings.total ?? 0;
  const pending = stats.data?.earnings.pending ?? 0;
  const activeCount = stats.data?.activeProjects ?? 0;
  const rating = stats.data?.rating ?? me.data?.profile?.rating ?? 0;
  const reviews = me.data?.profile?.reviewsCount ?? 0;
  const lockedProjects = (projects.data?.projects ?? []).filter((p) => p.escrow?.status === "locked");
  const lockedAmount = lockedProjects.reduce((sum, p) => sum + (p.escrow?.amount ?? p.fixedPrice ?? 0), 0);
  const activeList = (projects.data?.projects ?? []).filter((p) =>
    ["agreement_pending", "escrow_funded", "in_progress", "delivered"].includes(p.status),
  );
  const completedCount = (projects.data?.projects ?? []).filter((p) => p.status === "completed").length;

  return (
    <div className="p-6">
      <h1 className="text-[22px] font-bold">Dashboard</h1>
      {stats.error ? <ErrorNote error={stats.error} className="mt-4" /> : null}
      {toggleError ? <ErrorNote error={toggleError} className="mt-4" /> : null}
      {stats.loading && !stats.data ? <Loader label="Loading dashboard…" /> : null}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <DollarSign size={12} /> Earnings
          </div>
          <div className="mt-1 text-[20px] font-bold">{compactInr(earningsTotal)}</div>
          <div className="mt-1 text-[11px] text-zinc-500">Completed releases</div>
        </div>
        <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
          <div className="text-[11px] text-zinc-500">In Escrow</div>
          <div className="mt-1 text-[20px] font-bold">{compactInr(lockedAmount || pending)}</div>
          <div className="mt-1 text-[11px] text-zinc-500">{lockedProjects.length} projects locked</div>
        </div>
        <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
          <div className="text-[11px] text-zinc-500">Active</div>
          <div className="mt-1 text-[20px] font-bold">{activeCount}</div>
          <div className="mt-1 text-[11px] text-zinc-500">{stats.data?.views ?? 0} gig views • {completedCount} completed</div>
        </div>
        <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
          <div className="text-[11px] text-zinc-500">Rating</div>
          <div className="mt-1 text-[20px] font-bold">{rating}</div>
          <div className="mt-1 text-[11px] text-zinc-500">{reviews} reviews</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
          <p className="text-[13px] font-semibold">Active Projects</p>
          {projects.error ? <ErrorNote error={projects.error} className="mt-3" /> : null}
          {projects.loading && activeList.length === 0 ? <p className="mt-3 text-[12px] text-zinc-500">Loading projects…</p> : null}
          {activeList.length === 0 && !projects.loading ? (
            <p className="mt-3 text-[12px] text-zinc-500">No active projects.</p>
          ) : null}
          <div className="mt-3 space-y-3">
            {activeList.slice(0, 3).map((project) => (
              <div key={project.id} className="rounded-[10px] border border-zinc-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-medium">{project.title}</p>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                    {apiProjectStatusLabel(project.status)}
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-zinc-600">
                  {compactInr(project.fixedPrice)} • {project.timelineDays} days
                </div>
                <button
                  type="button"
                  onClick={() => spa.setView("projects", { projectId: project.id })}
                  className="mt-3 h-9 w-full rounded-[8px] text-[12px] font-medium text-white"
                  style={{ background: "#16A34A" }}
                >
                  View project
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2 rounded-[12px] border border-zinc-200 bg-white p-4">
          <p className="text-[13px] font-semibold">Quick Actions</p>
          <button
            type="button"
            onClick={() => spa.setView("gigs")}
            className="flex h-9 w-full items-center justify-center gap-1 rounded-[8px] border border-zinc-200 text-[12px] font-medium hover:bg-zinc-50"
          >
            Create New Gig
          </button>
          <button
            type="button"
            onClick={() => void goOnline()}
            disabled={toggling}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[8px] text-[12px] font-medium text-white disabled:opacity-60"
            style={{ background: session?.user.online ? "#16A34A" : "#71717a" }}
          >
            {toggling ? "Updating…" : session?.user.online ? "Online" : "Offline"}
          </button>
        </div>
      </div>
    </div>
  );
}
