"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { ErrorNote, Loader } from "@/components/app/ui";
import { apiProjectStatusLabel, compactInr, type ExpressProject, type ExpressUser } from "@/lib/express";
import { useSpaNav } from "@/components/app/SpaNav";

export default function ProjectsList({ role }: { role: "customer" | "provider" | "admin" }) {
  const spa = useSpaNav();
  const queryRole = role === "provider" ? "provider" : "customer";
  const { data, loading, error } = useAsync<{ projects: ExpressProject[] }>(
    () => api(`/api/projects?role=${queryRole}`),
    [queryRole],
  );
  const list = useMemo(() => data?.projects ?? [], [data]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = [...new Set(list.map((p) => (queryRole === "provider" ? p.customerId : p.providerId)))];
    if (ids.length === 0) return;
    let active = true;
    Promise.all(
      ids.map(async (id) => {
        try {
          const res = await api<{ user: ExpressUser }>(`/api/users/${id}/profile`);
          return [id, res.user?.name ?? ""] as const;
        } catch {
          return [id, ""] as const;
        }
      }),
    ).then((rows) => {
      if (!active) return;
      setNames(Object.fromEntries(rows));
    });
    return () => {
      active = false;
    };
  }, [list, queryRole]);

  return (
    <div className="max-w-[800px] p-6">
      <h1 className="text-[22px] font-bold">{role === "customer" ? "My Projects" : "Projects"}</h1>
      <div className="mt-6 space-y-3">
        {error ? <ErrorNote error={error} /> : null}
        {loading ? (
          <Loader label="Loading projects…" />
        ) : list.length === 0 && !error ? (
          <p className="text-[13px] text-zinc-500">No projects yet. Start from Messages with Draft Final Agreement.</p>
        ) : (
          list.map((p) => {
            const otherId = queryRole === "provider" ? p.customerId : p.providerId;
            const otherName = names[otherId] || (queryRole === "provider" ? "Customer" : "Provider");
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => spa.setView("projects", { projectId: p.id })}
                className="block w-full rounded-[12px] border border-zinc-200 bg-white p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[14px] font-medium">{p.title}</div>
                  <span className="text-[11px] text-zinc-500">{apiProjectStatusLabel(p.status)}</span>
                </div>
                <div className="mt-1 text-[12px] text-zinc-600">
                  {compactInr(p.fixedPrice)} • {p.timelineDays} days • {otherName}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
