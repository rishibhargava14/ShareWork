"use client";

import { useState } from "react";
import { ShieldCheck, Users, Store, FolderKanban, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import type { PublicUser } from "@/models/User";
import type { PublicService } from "@/models/Service";
import { useAsync } from "@/lib/use-async";
import { Tabs, Panel, Loader, EmptyState, StatusChip, Button } from "@/components/app/ui";
import { formatMoney, formatDate } from "@/lib/constants";

interface AdminStats {
  users: number;
  services: number;
  projects: number;
  withdrawals: number;
  activeProjects: number;
  completedProjects: number;
  totalEscrowReleased: number;
}

interface AdminProjectRow {
  id: string;
  title: string;
  status: string;
  price: number;
  customer: string;
  provider: string;
  createdAt: string;
}

interface AdminWithdrawalRow {
  id: string;
  provider: PublicUser;
  amount: number;
  status: string;
  requestedAt: string;
  resolvedAt?: string;
}

const WITHDRAWAL_CHIP: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "services", label: "Services" },
  { id: "projects", label: "Projects" },
  { id: "withdrawals", label: "Withdrawals" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("overview");
  const stats = useAsync<{ stats: AdminStats }>(() => api("/api/admin/stats"), []);
  const users = useAsync<{ users: PublicUser[] }>(() => api("/api/admin/users"), []);
  const services = useAsync<{ services: PublicService[] }>(() => api("/api/admin/services"), []);
  const projects = useAsync<{ projects: AdminProjectRow[] }>(() => api("/api/admin/projects"), []);
  const withdrawals = useAsync<{ withdrawals: AdminWithdrawalRow[] }>(() => api("/api/admin/withdrawals"), []);

  const s = stats.data?.stats;

  const suspendUser = async (id: string, status: "active" | "suspended") => {
    await api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    users.reload();
  };

  const toggleService = async (svc: PublicService) => {
    await api(`/api/admin/services/${svc.id}`, { method: "PATCH", body: JSON.stringify({ active: !svc.active }) });
    services.reload();
  };

  const setWithdrawal = async (id: string, status: string) => {
    await api(`/api/admin/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    withdrawals.reload();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-ink" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Admin console</h1>
          <p className="text-sm text-muted">Manage users, services, projects, and withdrawals.</p>
        </div>
      </div>

      <div className="mt-8">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="mt-8">
        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { icon: Users, label: "Users", value: String(s?.users ?? "…") },
              { icon: Store, label: "Services", value: String(s?.services ?? "…") },
              { icon: FolderKanban, label: "Projects", value: String(s?.projects ?? "…"), sub: `${s?.activeProjects ?? "…"} active` },
              { icon: Wallet, label: "Escrow released", value: formatMoney(s?.totalEscrowReleased ?? 0) },
            ].map((card) => (
              <Panel key={card.label} className="!p-5">
                <card.icon className="h-5 w-5 text-muted" aria-hidden="true" />
                <p className="mt-3 text-2xl font-bold text-ink">{card.value}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{card.label}</p>
                {card.sub && <p className="mt-1 text-xs text-muted">{card.sub}</p>}
              </Panel>
            ))}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-2">
            {users.loading ? <Loader label="Loading users…" /> : null}
            {(users.data?.users ?? []).map((u) => (
              <Panel key={u.id} className="flex items-center justify-between gap-4 !py-4">
                <div>
                  <p className="font-semibold text-ink">{u.name}</p>
                  <p className="text-xs text-muted">
                    {u.email} · <span className="capitalize">{u.role}</span> · {u.id.slice(-6)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {u.status}
                  </span>
                  {u.role !== "admin" && (
                    <Button variant={u.status === "active" ? "secondary" : "danger"} onClick={() => suspendUser(u.id, u.status === "active" ? "suspended" : "active")}>
                      {u.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )}

        {tab === "services" && (
          <div className="space-y-2">
            {services.loading ? <Loader label="Loading services…" /> : null}
            {(services.data?.services ?? []).map((svc) => (
              <Panel key={svc.id} className="flex items-center justify-between gap-4 !py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{svc.title}</p>
                  <p className="text-xs text-muted">
                    {svc.provider.name} · {formatMoney(svc.price)} · {svc.category}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${svc.active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {svc.active ? "Active" : "Hidden"}
                  </span>
                  <Button variant="secondary" onClick={() => toggleService(svc)}>
                    {svc.active ? "Hide" : "Show"}
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        )}

        {tab === "projects" && (
          <div className="space-y-2">
            {projects.loading ? <Loader label="Loading projects…" /> : null}
            {(projects.data?.projects ?? []).length === 0 && !projects.loading ? (
              <EmptyState icon={<FolderKanban className="h-8 w-8" />} title="No projects" />
            ) : null}
            {(projects.data?.projects ?? []).map((p) => (
              <Panel key={p.id} className="flex items-center justify-between gap-4 !py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{p.title}</p>
                  <p className="text-xs text-muted">
                    {p.customer} → {p.provider} · {formatMoney(p.price)} · {formatDate(p.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusChip status={p.status as never} />
                  {(p.status === "DISPUTED" || (!["CANCELLED", "COMPLETED"].includes(p.status))) && (
                    <>
                      <Button variant="secondary" onClick={() => closeProject(p.id, "COMPLETED", projects)}>
                        Complete
                      </Button>
                      <Button variant="secondary" onClick={() => closeProject(p.id, "CANCELLED", projects)}>
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )}

        {tab === "withdrawals" && (
          <div className="space-y-2">
            {withdrawals.loading ? <Loader label="Loading withdrawals…" /> : null}
            {(withdrawals.data?.withdrawals ?? []).length === 0 && !withdrawals.loading ? (
              <EmptyState icon={<Wallet className="h-8 w-8" />} title="No withdrawal requests" />
            ) : null}
            {(withdrawals.data?.withdrawals ?? []).map((w) => (
              <Panel key={w.id} className="flex flex-wrap items-center justify-between gap-4 !py-4">
                <div>
                  <p className="font-semibold text-ink">
                    {w.provider.name} · {formatMoney(w.amount)}
                  </p>
                  <p className="text-xs text-muted">
                    requested {formatDate(w.requestedAt)} {w.resolvedAt ? `· resolved ${formatDate(w.resolvedAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${WITHDRAWAL_CHIP[w.status] ?? "bg-zinc-100 text-zinc-600"}`}>{w.status}</span>
                  {w.status === "pending" && (
                    <Button variant="secondary" onClick={() => setWithdrawal(w.id, "processing")}>Process</Button>
                  )}
                  {["pending", "processing"].includes(w.status) && (
                    <>
                      <Button variant="secondary" onClick={() => setWithdrawal(w.id, "completed")}>Complete</Button>
                      <Button variant="danger" onClick={() => setWithdrawal(w.id, "failed")}>Fail</Button>
                    </>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function closeProject(
  id: string,
  status: "COMPLETED" | "CANCELLED",
  box: { reload: () => void }
) {
  void api(`/api/admin/projects/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }).then(box.reload);
}