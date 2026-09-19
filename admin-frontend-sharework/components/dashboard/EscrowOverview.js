"use client";

import { formatInr } from "@/lib/format";

export default function EscrowOverview({ stats }) {
  return (
    <div className="lg:col-span-2 bg-[#0A0A0B] rounded-[20px] p-5 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/[0.04] rounded-full blur-[60px]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-medium">Escrow Overview</h3>
          <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 border border-white/10 uppercase tracking-widest">
            Live
          </span>
        </div>
        <div className="grid grid-cols-3 gap-6 mt-6">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-zinc-500">Locked</div>
            <div className="text-[20px] font-semibold mt-1">{formatInr(stats?.escrowLockedAmount ?? 0)}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{stats?.escrowLocked ?? 0} locked escrows</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-zinc-500">Released</div>
            <div className="text-[20px] font-semibold mt-1">{formatInr(stats?.escrowReleasedAmount ?? 0)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-zinc-500">Platform Fee</div>
            <div className="text-[20px] font-semibold mt-1">{formatInr(stats?.revenue ?? 0)}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Completed fee + GST</div>
          </div>
        </div>
      </div>
    </div>
  );
}
