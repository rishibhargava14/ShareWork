"use client";

import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { ErrorNote, Loader } from "@/components/app/ui";
import { compactInr, type ExpressProject, type ExpressTransaction } from "@/lib/express";
import { formatDate, formatMoney } from "@/lib/constants";
import { useSpaNav } from "@/components/app/SpaNav";

export function PaymentsView() {
  const spa = useSpaNav();
  const tx = useAsync<{ transactions: ExpressTransaction[] }>(() => api("/api/transactions/me"), []);
  const projects = useAsync<{ projects: ExpressProject[] }>(() => api("/api/projects?role=customer"), []);
  const transactions = tx.data?.transactions ?? [];
  const list = projects.data?.projects ?? [];

  const spent = transactions
    .filter((item) => item.type === "escrow_fund" && item.status === "completed")
    .reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const inEscrow = list
    .filter((item) => item.escrow?.status === "locked")
    .reduce((sum, item) => sum + (item.escrow?.amount ?? item.fixedPrice ?? 0), 0);
  const completed = list.filter((item) => item.status === "completed").length;

  if (tx.loading && !tx.data) return <Loader label="Loading payments…" />;

  return (
    <div className="p-6">
      <h1 className="text-[22px] font-bold">Payments</h1>
      {tx.error ? <ErrorNote error={tx.error} className="mt-4" /> : null}
      {projects.error ? <ErrorNote error={projects.error} className="mt-4" /> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
          <div className="text-[11px] text-zinc-500">Total Spent</div>
          <div className="mt-1 text-[18px] font-bold">{compactInr(spent)}</div>
        </div>
        <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
          <div className="text-[11px] text-zinc-500">In Escrow</div>
          <div className="mt-1 text-[18px] font-bold">{compactInr(inEscrow)}</div>
        </div>
        <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
          <div className="text-[11px] text-zinc-500">Completed projects</div>
          <div className="mt-1 text-[18px] font-bold">{completed}</div>
        </div>
      </div>
      <div className="mt-6 rounded-[12px] border border-zinc-200 bg-white p-4">
        <div className="text-[13px] font-medium">Transactions</div>
        {transactions.length === 0 ? (
          <p className="mt-3 text-[12px] text-zinc-500">No payment transactions yet. Fund escrow from a project after agreement approval.</p>
        ) : (
          <div className="mt-3 space-y-2 text-[12px]">
            {transactions.map((item) => (
              <div key={item.id} className="flex justify-between border-b border-zinc-100 py-2 last:border-0">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => item.projectId && spa.setView("projects", { projectId: item.projectId })}
                >
                  <span className="capitalize">{item.type.replace(/_/g, " ")}</span>
                  <span className="ml-2 text-zinc-400">{item.status}</span>
                  {item.createdAt ? <span className="ml-2 text-zinc-400">{formatDate(item.createdAt)}</span> : null}
                </button>
                <span className="font-medium">{formatMoney(item.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
