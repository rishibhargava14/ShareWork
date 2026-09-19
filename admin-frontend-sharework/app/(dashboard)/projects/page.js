"use client";

import { useEffect, useState } from "react";
import ProjectFilter from "@/components/projects/ProjectFilter";
import ProjectTable from "@/components/projects/ProjectTable";
import ProjectChatModal from "@/components/projects/ProjectChatModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { escrowLabel, formatDay, formatInr } from "@/lib/format";

function mapProject(project) {
  const price = project.fixedPrice ?? 0;
  return {
    id: project.id,
    title: project.title,
    client: project.customerName || "Customer",
    freelancer: project.providerName || "Provider",
    price,
    fee: project.escrow?.fee ?? Math.round(price * 0.1),
    escrow: project.status === "disputed" ? "Disputed" : escrowLabel(project.escrow?.status),
    date: formatDay(project.createdAt),
    status: project.status,
    conversationId: project.conversationId,
    scope: project.scope,
    escrowStatus: project.escrow?.status,
  };
}

export default function ProjectsPage() {
  const [query, setQuery] = useState("");
  const [chatProject, setChatProject] = useState(null);
  const [detail, setDetail] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);

  const load = async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const path = params.toString() ? `/api/admin/projects?${params}` : "/api/admin/projects";
    const res = await api(path);
    setProjects((res.projects ?? []).map(mapProject));
  };

  useEffect(() => {
    let active = true;
    api("/api/admin/projects")
      .then((res) => {
        if (!active) return;
        setProjects((res.projects ?? []).map(mapProject));
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load projects.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openDetail = async (project) => {
    try {
      const res = await api(`/api/admin/projects/${project.id}`);
      setDetail(res);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load project.");
    }
  };

  const forceRelease = async () => {
    if (!detail?.project?.id || busy) return;
    setBusy(true);
    try {
      const res = await api(`/api/admin/projects/${detail.project.id}/force-release`, { method: "POST" });
      setSuccess(res.alreadyProcessed ? "Escrow was already released." : "Escrow force-released.");
      setError("");
      setConfirmRelease(false);
      await openDetail({ id: detail.project.id });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Force release failed.");
      setSuccess("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1400px] space-y-4">
      <ProjectFilter query={query} setQuery={setQuery} onSearch={() => load().catch((err) => setError(err.message))} />
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {success ? <p className="text-[13px] text-emerald-700">{success}</p> : null}
      {loading ? <p className="text-[13px] text-zinc-500">Loading projects…</p> : null}
      {!loading && projects.length === 0 ? <p className="text-[13px] text-zinc-500">No projects found.</p> : null}
      <ProjectTable projects={projects} onChat={setChatProject} onView={openDetail} />
      <ProjectChatModal project={chatProject} onClose={() => setChatProject(null)} />

      {detail ? (
        <div className="bg-white border border-zinc-200 rounded-[20px] p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-semibold">{detail.project.title}</h3>
              <p className="text-[12px] text-zinc-500 mt-1">
                {detail.project.customerName} → {detail.project.providerName} • {detail.project.status} • escrow {detail.escrow?.status || "none"}
              </p>
            </div>
            <button onClick={() => setDetail(null)} className="text-[12px] text-zinc-500">Close</button>
          </div>
          <p className="text-[13px] text-zinc-600">{detail.project.scope}</p>
          <div className="text-[13px] font-medium">{formatInr(detail.project.fixedPrice)}</div>
          <div>
            <h4 className="text-[12px] font-semibold mb-1">Transactions</h4>
            {(detail.transactions ?? []).length === 0 ? (
              <p className="text-[12px] text-zinc-500">No transactions.</p>
            ) : (
              (detail.transactions ?? []).map((item) => (
                <div key={item.id} className="text-[12px] flex justify-between py-1 border-b border-zinc-100">
                  <span>{item.type} • {item.status}</span>
                  <span>{formatInr(item.amount)}</span>
                </div>
              ))
            )}
          </div>
          {detail.escrow?.status === "locked" ? (
            <button
              disabled={busy}
              onClick={() => setConfirmRelease(true)}
              className="h-9 px-4 rounded-xl bg-zinc-900 text-white text-[13px] disabled:opacity-50"
            >
              Force Release
            </button>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmRelease}
        title="Force-release escrow?"
        body="This releases locked escrow to the provider immediately. It cannot be undone."
        confirmLabel="Force Release"
        danger
        busy={busy}
        onCancel={() => setConfirmRelease(false)}
        onConfirm={forceRelease}
      />
    </div>
  );
}
