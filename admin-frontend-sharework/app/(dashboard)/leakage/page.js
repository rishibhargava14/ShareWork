"use client";

import { useEffect, useState } from "react";
import LeakageBanner from "@/components/leakage/LeakageBanner";
import LeakageTable from "@/components/leakage/LeakageTable";
import { api } from "@/lib/api";

export default function LeakagePage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api("/api/admin/leakage-logs")
      .then((res) => {
        if (!active) return;
        setLogs(res.logs ?? []);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load leakage logs.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-[1400px] space-y-4">
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {loading ? <p className="text-[13px] text-zinc-500">Loading leakage logs…</p> : null}
      <LeakageBanner count={logs.length} />
      <LeakageTable logs={logs} />
    </div>
  );
}
