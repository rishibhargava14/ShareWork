"use client";

import { formatInr } from "@/lib/format";

export default function RevenueChart({ revenue = 0 }) {
  return (
    <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-[20px] p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[14px] font-semibold">Platform revenue</h3>
          <p className="text-[12px] text-zinc-500 mt-0.5">Completed fee + GST totals. No monthly series is stored.</p>
        </div>
      </div>
      <div className="h-[260px] flex items-center justify-center rounded-[16px] bg-zinc-50 border border-zinc-100">
        <div className="text-center">
          <div className="text-[28px] font-semibold">{formatInr(revenue)}</div>
          <div className="text-[12px] text-zinc-500 mt-1">Lifetime completed platform revenue</div>
        </div>
      </div>
    </div>
  );
}
