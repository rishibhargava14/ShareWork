"use client";

import { Check, X } from "lucide-react";

export default function DisputeCard({ dispute, onContinue, onRefund, onSplit, busy }) {
  const open = dispute.status === "open" || dispute.status === "in_review";

  return (
    <div className="bg-white border border-zinc-200 rounded-[20px] p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono font-medium bg-zinc-900 text-white px-2 py-1 rounded-lg">{dispute.id.slice(-8)}</span>
            <span className="text-[11px] px-2 py-1 rounded-full bg-zinc-100">{dispute.status}</span>
          </div>
          <h4 className="text-[14px] font-semibold mt-3">{dispute.reason}</h4>
          <div className="text-[12px] text-zinc-500 mt-1">
            {dispute.projectTitle || dispute.projectId} • ₹{(dispute.amount || 0).toLocaleString()} • {dispute.customerName} vs {dispute.providerName}
          </div>
        </div>
      </div>

      <div className="mt-4 bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-[12px] text-zinc-600">
        {dispute.description}
      </div>

      {dispute.resolution ? (
        <p className="mt-3 text-[12px] text-zinc-500">Resolution: {dispute.resolution}</p>
      ) : null}

      {open ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={onContinue}
            className="h-9 px-4 rounded-xl bg-zinc-900 text-white text-[13px] font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Continue project
          </button>
          <button
            disabled={busy}
            onClick={onSplit}
            className="h-9 px-4 rounded-xl bg-white border border-zinc-200 text-[13px] font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            Split 50/50
          </button>
          <button
            disabled={busy}
            onClick={onRefund}
            className="h-9 px-4 rounded-xl bg-white border border-zinc-200 text-[13px] font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <X className="w-4 h-4" /> Refund to Client
          </button>
        </div>
      ) : null}
    </div>
  );
}
