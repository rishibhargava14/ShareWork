"use client";

import { Download } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDay, formatInr } from "@/lib/format";

export default function TransactionTable({ escrows = [], onForceRelease, busyId }) {
  const showToast = useToast();

  const exportCsv = () => {
    const header = "Escrow ID,Customer,Provider,Amount,Fee,Status,Date\n";
    const rows = escrows
      .map((row) => `${row.id},${row.customerName || row.customerId},${row.providerName || row.providerId},${row.amount},${row.fee ?? ""},${row.status},${formatDay(row.createdAt)}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "escrow.csv";
    link.click();
    showToast("CSV exported");
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-[20px] overflow-hidden">
      <div className="p-4 border-b border-zinc-200 flex justify-between items-center">
        <h3 className="text-[14px] font-semibold">Escrows</h3>
        <button
          onClick={exportCsv}
          className="h-8 px-3 rounded-xl bg-zinc-900 text-white text-[12px] flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>
      {escrows.length === 0 ? (
        <p className="p-5 text-[13px] text-zinc-500">No escrow records yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-[11px] uppercase tracking-widest text-zinc-500">
                <th className="px-5 py-3 font-medium">Escrow ID</th>
                <th className="px-5 py-3 font-medium">From → To</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Fee</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {escrows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/70">
                  <td className="px-5 py-3 text-[12px] font-mono">{row.id.slice(-8)}</td>
                  <td className="px-5 py-3 text-[12px]">
                    {row.customerName || "Customer"} → {row.providerName || "Provider"}
                  </td>
                  <td className="px-5 py-3 text-[13px] font-medium">{formatInr(row.amount)}</td>
                  <td className="px-5 py-3 text-[12px]">{row.fee != null ? formatInr(row.fee) : "—"}</td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] px-2 py-1 rounded-full bg-zinc-100">{row.status}</span>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-zinc-600">{formatDay(row.createdAt || row.lockedAt)}</td>
                  <td className="px-5 py-3">
                    {row.status === "locked" ? (
                      <button
                        disabled={busyId === row.projectId}
                        onClick={() => onForceRelease?.(row)}
                        className="h-7 px-2.5 rounded-lg bg-zinc-900 text-white text-[11px] disabled:opacity-50"
                      >
                        Force Release
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
