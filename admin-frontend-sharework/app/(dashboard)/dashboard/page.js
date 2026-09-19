"use client";

import { useEffect, useState } from "react";
import StatsCard from "@/components/dashboard/StatsCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import ProjectStatus from "@/components/dashboard/ProjectStatus";
import LeakageBlocks from "@/components/dashboard/LeakageBlocks";
import EscrowOverview from "@/components/dashboard/EscrowOverview";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/format";
import { Users, Briefcase, Lock, IndianRupee, Flag, ShieldAlert, UserRound, Wallet } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api("/api/admin/stats"),
      api("/api/admin/projects"),
      api("/api/admin/leakage-logs"),
    ])
      .then(([nextStats, nextProjects, nextLogs]) => {
        if (!active) return;
        setStats(nextStats);
        setProjects(nextProjects.projects ?? []);
        setLogs(nextLogs.logs ?? []);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    { label: "Total Users", value: loading ? "…" : String(stats?.users ?? 0), delta: "Live", icon: Users, color: "text-zinc-900", bg: "bg-white" },
    { label: "Customers", value: loading ? "…" : String(stats?.customers ?? 0), delta: "Live", icon: UserRound, color: "text-zinc-900", bg: "bg-white" },
    { label: "Providers", value: loading ? "…" : String(stats?.providers ?? 0), delta: "Live", icon: Users, color: "text-zinc-900", bg: "bg-white" },
    { label: "Active Projects", value: loading ? "…" : String(stats?.activeProjects ?? 0), delta: `${stats?.completedProjects ?? 0} done`, icon: Briefcase, color: "text-zinc-900", bg: "bg-white" },
    { label: "Escrow Locked", value: loading ? "…" : formatInr(stats?.escrowLockedAmount ?? 0), delta: `${stats?.escrowLocked ?? 0} open`, icon: Lock, color: "text-zinc-900", bg: "bg-white" },
    { label: "Platform Revenue", value: loading ? "…" : formatInr(stats?.revenue ?? 0), delta: "Fees + GST", icon: IndianRupee, color: "text-white", bg: "bg-zinc-900" },
    { label: "Open Disputes", value: loading ? "…" : String(stats?.disputesOpen ?? 0), delta: "Live", icon: Flag, color: "text-red-600", bg: "bg-white" },
    { label: "Pending Withdrawals", value: loading ? "…" : formatInr(stats?.pendingWithdrawalsAmount ?? 0), delta: `${stats?.pendingWithdrawals ?? 0} pending`, icon: Wallet, color: "text-amber-600", bg: "bg-white" },
    { label: "Leakage Attempts", value: loading ? "…" : String(stats?.leakageCount ?? 0), delta: "Logged", icon: ShieldAlert, color: "text-amber-600", bg: "bg-white" },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RevenueChart revenue={stats?.revenue ?? 0} />
        <ProjectStatus projects={projects} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LeakageBlocks logs={logs} />
        <EscrowOverview stats={stats} />
      </div>
    </div>
  );
}
