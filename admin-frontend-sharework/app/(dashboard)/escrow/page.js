"use client";

import { useEffect, useState } from "react";
import EscrowStats from "@/components/escrow/EscrowStats";
import TransactionTable from "@/components/escrow/TransactionTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { formatDay, formatInr } from "@/lib/format";

export default function EscrowPage() {
  const [escrows, setEscrows] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    const [escrowRes, statsRes, txRes, wdRes] = await Promise.all([
      api("/api/admin/escrows"),
      api("/api/admin/stats"),
      api("/api/admin/transactions?page=1"),
      api("/api/admin/withdrawals?page=1"),
    ]);
    setEscrows(escrowRes.escrows ?? []);
    setStats(statsRes);
    setTransactions(txRes.transactions ?? []);
    setWithdrawals(wdRes.withdrawals ?? []);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api("/api/admin/escrows"),
      api("/api/admin/stats"),
      api("/api/admin/transactions?page=1"),
      api("/api/admin/withdrawals?page=1"),
    ])
      .then(([escrowRes, statsRes, txRes, wdRes]) => {
        if (!active) return;
        setEscrows(escrowRes.escrows ?? []);
        setStats(statsRes);
        setTransactions(txRes.transactions ?? []);
        setWithdrawals(wdRes.withdrawals ?? []);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load escrow.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const forceRelease = async () => {
    if (!confirm || busyId) return;
    setBusyId(confirm.projectId);
    try {
      const res = await api(`/api/admin/projects/${confirm.projectId}/force-release`, { method: "POST" });
      setSuccess(res.alreadyProcessed ? "Escrow was already released." : "Escrow force-released.");
      setError("");
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Force release failed.");
      setSuccess("");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-[1400px] space-y-4">
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {success ? <p className="text-[13px] text-emerald-700">{success}</p> : null}
      {loading ? <p className="text-[13px] text-zinc-500">Loading escrow…</p> : null}
      <EscrowStats stats={stats} />
      <TransactionTable
        escrows={escrows}
        busyId={busyId}
        onForceRelease={(row) => setConfirm(row)}
      />

      <div className="bg-white border border-zinc-200 rounded-[20px] overflow-hidden">
        <div className="p-4 border-b border-zinc-200">
          <h3 className="text-[14px] font-semibold">Transactions</h3>
          <p className="text-[12px] text-zinc-500">Stored transaction status. Pending is not treated as completed.</p>
        </div>
        {transactions.length === 0 ? (
          <p className="p-5 text-[13px] text-zinc-500">No transactions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-[11px] uppercase tracking-widest text-zinc-500">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Project</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {transactions.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 text-[12px]">{row.type}</td>
                    <td className="px-5 py-3 text-[12px]">{row.userName}</td>
                    <td className="px-5 py-3 text-[12px]">{row.projectTitle || "—"}</td>
                    <td className="px-5 py-3 text-[13px] font-medium">{formatInr(row.amount)}</td>
                    <td className="px-5 py-3 text-[12px]">{row.status}</td>
                    <td className="px-5 py-3 text-[12px] text-zinc-600">{formatDay(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-[20px] overflow-hidden">
        <div className="p-4 border-b border-zinc-200">
          <h3 className="text-[14px] font-semibold">Withdrawals</h3>
          <p className="text-[12px] text-zinc-500">Pending records only. No payout processor is connected.</p>
        </div>
        {withdrawals.length === 0 ? (
          <p className="p-5 text-[13px] text-zinc-500">No withdrawal records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-[11px] uppercase tracking-widest text-zinc-500">
                  <th className="px-5 py-3 font-medium">Provider</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">UPI</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {withdrawals.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 text-[12px]">{row.providerName}</td>
                    <td className="px-5 py-3 text-[13px] font-medium">{formatInr(row.amount)}</td>
                    <td className="px-5 py-3 text-[12px] font-mono">{row.upiId || "—"}</td>
                    <td className="px-5 py-3 text-[12px]">{row.status}</td>
                    <td className="px-5 py-3 text-[12px] text-zinc-600">{formatDay(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Force-release escrow?"
        body={`Release locked escrow for project ${confirm?.projectId?.slice(-8) || ""} to the provider.`}
        confirmLabel="Force Release"
        danger
        busy={Boolean(busyId)}
        onCancel={() => setConfirm(null)}
        onConfirm={forceRelease}
      />
    </div>
  );
}
