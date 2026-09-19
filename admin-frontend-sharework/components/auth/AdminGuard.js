"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentAdmin, logoutAdmin } from "@/lib/auth";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await getCurrentAdmin();
        if (!cancelled) setReady(true);
      } catch {
        logoutAdmin();
        router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F6F6F7] flex items-center justify-center text-[13px] text-zinc-500">
        Checking admin session…
      </div>
    );
  }

  return children;
}
