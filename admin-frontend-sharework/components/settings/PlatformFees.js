"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

export default function PlatformFees() {
  const showToast = useToast();
  const [feePercent, setFeePercent] = useState("10");
  const [gstPercent, setGstPercent] = useState("18");
  const [maintenance, setMaintenance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/api/admin/settings")
      .then((res) => {
        if (!active) return;
        setFeePercent(String(res.settings?.feePercent ?? 10));
        setGstPercent(String(res.settings?.gstPercent ?? 18));
        setMaintenance(Boolean(res.settings?.maintenance));
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load settings.");
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          feePercent: Number(feePercent),
          gstPercent: Number(gstPercent),
          maintenance,
        }),
      });
      showToast("Fee settings saved");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-[20px] p-6">
      <h3 className="text-[14px] font-semibold">Platform Fees</h3>
      {error ? <p className="mt-3 text-[12px] text-red-600">{error}</p> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div>
          <label className="text-[11px] uppercase tracking-widest text-zinc-500">Platform Fee %</label>
          <div className="mt-2 flex">
            <input value={feePercent} onChange={(e) => setFeePercent(e.target.value)} className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-l-xl text-[14px]" />
            <span className="h-10 px-3 bg-zinc-100 border border-l-0 border-zinc-200 rounded-r-xl flex items-center text-[12px]">%</span>
          </div>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-zinc-500">GST %</label>
          <div className="mt-2 flex">
            <input value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-l-xl text-[14px]" />
            <span className="h-10 px-3 bg-zinc-100 border border-l-0 border-zinc-200 rounded-r-xl flex items-center text-[12px]">%</span>
          </div>
        </div>
      </div>

      <label className="mt-5 flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} />
        Maintenance mode
      </label>

      <div className="mt-6 flex gap-2">
        <button
          disabled={saving}
          onClick={() => void save()}
          className="h-10 px-5 rounded-xl bg-zinc-900 text-white text-[13px] font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button onClick={() => void load()} className="h-10 px-5 rounded-xl bg-zinc-100 text-[13px]">
          Reset
        </button>
      </div>
    </div>
  );
}
