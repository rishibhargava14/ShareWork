import { formatInr } from "@/lib/format";

export default function EscrowStats({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="bg-white border border-zinc-200 rounded-[16px] p-4">
        <div className="text-[11px] uppercase tracking-widest text-zinc-500">Locked Amount</div>
        <div className="text-[20px] font-semibold mt-1">{formatInr(stats?.escrowLockedAmount ?? 0)}</div>
      </div>
      <div className="bg-white border border-zinc-200 rounded-[16px] p-4">
        <div className="text-[11px] uppercase tracking-widest text-zinc-500">Released</div>
        <div className="text-[20px] font-semibold mt-1">{formatInr(stats?.escrowReleasedAmount ?? 0)}</div>
      </div>
      <div className="bg-white border border-zinc-200 rounded-[16px] p-4">
        <div className="text-[11px] uppercase tracking-widest text-zinc-500">Refunded</div>
        <div className="text-[20px] font-semibold mt-1">{formatInr(stats?.escrowRefundedAmount ?? 0)}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-[16px] p-4 text-white">
        <div className="text-[11px] uppercase tracking-widest text-zinc-400">Platform Fees</div>
        <div className="text-[20px] font-semibold mt-1">{formatInr(stats?.revenue ?? 0)}</div>
        <div className="text-[11px] text-zinc-400 mt-1">Completed fee + GST</div>
      </div>
    </div>
  );
}
