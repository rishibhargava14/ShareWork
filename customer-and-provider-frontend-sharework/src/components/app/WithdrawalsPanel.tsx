"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button, EmptyState, Field } from "@/components/app/ui";
import { formatMoney, formatDate, WITHDRAWAL_STATUS_LABELS } from "@/lib/constants";
import type { EarningsPayload } from "@/lib/express";
import { Wallet } from "lucide-react";

const STATUS_CHIP: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

export default function WithdrawalsPanel({
  earnings,
  onChanged,
}: {
  earnings: EarningsPayload | null;
  onChanged?: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const available = earnings?.available ?? Math.max(0, (earnings?.total ?? 0) - (earnings?.withdrawn ?? 0));
  const withdrawals = earnings?.withdrawals ?? earnings?.transactions?.filter((item) => item.type === "withdrawal") ?? [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setFeedback({ type: "error", text: "Enter a valid amount." });
      return;
    }
    if (!/^\S+@\S+$/.test(upiId.trim())) {
      setFeedback({ type: "error", text: "Enter a valid UPI ID." });
      return;
    }
    setFeedback(null);
    setSending(true);
    try {
      const res = await api<{ message?: string }>("/api/provider/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: value, upiId: upiId.trim() }),
      });
      setAmount("");
      setUpiId("");
      setFeedback({
        type: "ok",
        text: res.message || "Withdrawal request recorded. Funds have not been transferred.",
      });
      onChanged?.();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Could not request withdrawal." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[12px] border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-[13px] font-semibold">Request a withdrawal</h3>
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Amount (₹)"
            name="amount"
            type="number"
            value={amount}
            placeholder="e.g. 500"
            onChange={setAmount}
          />
          <Field
            label="UPI ID"
            name="upiId"
            value={upiId}
            placeholder="name@upi"
            onChange={setUpiId}
          />
          <div className="sm:col-span-2">
            {feedback && (
              <div
                role={feedback.type === "ok" ? "status" : "alert"}
                className={`mb-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  feedback.type === "ok"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {feedback.text}
              </div>
            )}
            <Button type="submit" variant="primary" disabled={sending || available <= 0}>
              {sending ? "Requesting…" : "Withdraw"}
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-zinc-500">Creates a pending withdrawal record. Bank payout is not transferred automatically.</p>
      </div>

      <div>
        <h3 className="mb-3 text-[13px] font-semibold">Withdrawal history</h3>
        {withdrawals.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-8 w-8" />}
            title="No withdrawals yet"
            description="After escrow is released, you can request a withdrawal against completed earnings."
          />
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{formatMoney(w.amount)}</p>
                  <p className="text-xs text-zinc-500">{w.createdAt ? formatDate(w.createdAt) : ""} {w.upiId ? `• ${w.upiId}` : ""}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[w.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                  {(WITHDRAWAL_STATUS_LABELS as Record<string, string>)[w.status] ?? w.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
