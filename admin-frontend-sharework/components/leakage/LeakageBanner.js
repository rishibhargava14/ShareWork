import { ShieldAlert } from "lucide-react";

export default function LeakageBanner({ count = 0 }) {
  return (
    <div className="bg-[#0A0A0B] rounded-[20px] p-6 text-white relative overflow-hidden">
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/20 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold">Anti-Leakage Monitoring</h3>
            <p className="text-[12px] text-zinc-400 mt-1 max-w-[560px]">
              System auto-detects phone numbers, emails, UPI IDs and external URLs. Blocked messages are masked and logged here.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-center">
            <div className="text-[18px] font-semibold">{count}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-400">Logged</div>
          </div>
        </div>
      </div>
    </div>
  );
}
