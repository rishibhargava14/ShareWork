"use client";

import { useEffect, useState } from "react";
import DisputeCard from "@/components/disputes/DisputeCard";
import DisputeStats from "@/components/disputes/DisputeStats";
import AutoReleaseNotice from "@/components/disputes/AutoReleaseNotice";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const refresh = async () => {
    const res = await api("/api/admin/disputes");
    setDisputes(res.disputes ?? []);
    setError("");
  };

  useEffect(() => {
    let active = true;
    api("/api/admin/disputes")
      .then((res) => {
        if (!active) return;
        setDisputes(res.disputes ?? []);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load disputes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const resolve = async () => {
    if (!confirm || busyId) return;
    setBusyId(confirm.dispute.id);
    try {
      await api(`/api/admin/disputes/${confirm.dispute.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          resolution: confirm.resolution,
          refund: confirm.refund,
          split: confirm.split,
        }),
      });
      setSuccess("Dispute updated.");
      setConfirm(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve dispute.");
      setSuccess("");
    } finally {
      setBusyId(null);
    }
  };

  const openCount = disputes.filter((item) => item.status === "open" || item.status === "in_review").length;
  const resolvedCount = disputes.filter((item) => item.status === "resolved").length;

  return (
    <div className="max-w-[1400px] space-y-4">
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {success ? <p className="text-[13px] text-emerald-700">{success}</p> : null}
      {loading ? <p className="text-[13px] text-zinc-500">Loading disputes…</p> : null}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {!loading && disputes.length === 0 ? <p className="text-[13px] text-zinc-500">No disputes.</p> : null}
          {disputes.map((dispute) => (
            <DisputeCard
              key={dispute.id}
              dispute={dispute}
              busy={busyId === dispute.id}
              onContinue={() =>
                setConfirm({
                  dispute,
                  refund: false,
                  split: false,
                  resolution: "Dispute closed. Project returned to in progress.",
                  title: "Continue project?",
                  body: "This closes the dispute without moving money.",
                })
              }
              onRefund={() =>
                setConfirm({
                  dispute,
                  refund: true,
                  split: false,
                  resolution: "Refunded to customer",
                  title: "Refund customer?",
                  body: "This refunds the locked escrow to the customer and cancels the project.",
                })
              }
              onSplit={() =>
                setConfirm({
                  dispute,
                  refund: false,
                  split: true,
                  resolution: "Admin 50/50 split",
                  title: "Split 50/50?",
                  body: "Customer receives half. Provider receives the remaining half minus platform fee/GST.",
                })
              }
            />
          ))}
        </div>
        <div className="space-y-4">
          <DisputeStats openCount={openCount} resolvedCount={resolvedCount} />
          <AutoReleaseNotice />
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || "Resolve dispute?"}
        body={confirm?.body || ""}
        confirmLabel="Confirm"
        danger={Boolean(confirm?.refund || confirm?.split)}
        busy={Boolean(busyId)}
        onCancel={() => setConfirm(null)}
        onConfirm={resolve}
      />
    </div>
  );
}
