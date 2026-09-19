"use client";

import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { ErrorNote, Loader } from "@/components/app/ui";
import { compactInr, type EarningsPayload } from "@/lib/express";
import { formatMoney as formatInr, formatDate } from "@/lib/constants";
import WithdrawalsPanel from "@/components/app/WithdrawalsPanel";

export function EarningsView() {
  const { data, loading, error, reload } = useAsync<EarningsPayload>(() => api("/api/provider/earnings"), []);
  const total = data?.total ?? 0;
  const pending = data?.pending ?? 0;
  const withdrawn = data?.withdrawn ?? 0;
  const available = data?.available ?? Math.max(0, total - withdrawn);
  const transactions = data?.transactions ?? [];

  if (loading && !data) return <Loader label="Loading earnings…" />;

  return (
    <div className="max-w-[800px] p-6">
      <h1 className="text-[22px] font-bold">Earnings</h1>
      {error ? <ErrorNote error={error} className="mt-4" /> : null}
      <div className="mt-6 rounded-[12px] border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[12px] text-zinc-500">Available to withdraw</div>
            <div className="text-[28px] font-bold">{compactInr(available)}</div>
          </div>
        </div>
        <div className="mt-6 space-y-2 border-t border-zinc-200 pt-4 text-[12px]">
          <div className="flex justify-between">
            <span>Gross Earnings</span>
            <span className="font-medium">{formatInr(total)}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Pending</span>
            <span>{formatInr(pending)}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Withdrawn</span>
            <span>-{formatInr(withdrawn)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-bold">
            <span>Net</span>
            <span>{formatInr(available)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <WithdrawalsPanel earnings={data} onChanged={reload} />
      </div>
      <div className="mt-4 rounded-[12px] border border-zinc-200 bg-white p-5">
        <div className="text-[13px] font-semibold">Transactions</div>
        {transactions.length === 0 ? (
          <p className="mt-3 text-[12px] text-zinc-500">No earnings transactions yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {transactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-[12px]">
                <span className="text-zinc-600">
                  {tx.type.replace(/_/g, " ")} • {tx.createdAt ? formatDate(tx.createdAt) : ""}
                </span>
                <span className="font-medium">{formatInr(tx.netAmount ?? tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
