"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MessageSquarePlus } from "lucide-react";
import { api } from "@/lib/api";
import type { PublicService } from "@/models/Service";
import { useAsync } from "@/lib/use-async";
import { useSession } from "@/components/session/use-session";
import { Panel, Loader, ErrorNote, Ava, Button } from "@/components/app/ui";
import { feeBreakdown, formatMoney, packagesForService } from "@/lib/constants";

export default function ServiceDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const session = useSession();
  const { data, loading, error } = useAsync<{ service: PublicService }>(() => api(`/api/services/${id}`), [id]);
  const [starting, setStarting] = useState(false);

  const svc = data?.service ?? null;
  const packages = svc ? packagesForService(svc) : [];
  const [pkgName, setPkgName] = useState<string>("");
  const selected = packages.find((p) => p.name === pkgName) ?? packages[0];
  const isOwnService = svc ? svc.provider.id === session?.user.id : false;
  const fees = selected ? feeBreakdown(selected.price) : null;

  const startConversation = async () => {
    if (!svc) return;
    setStarting(true);
    try {
      const res = await api<{ conversationId: string }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ toUserId: svc.provider.id, serviceId: svc.id }),
      });
      router.push(`/conversations/${res.conversationId}`);
    } catch (err) {
      if (err instanceof Error && "status" in err && (err as { status: number }).status === 401) {
        router.push(`/auth?mode=login&next=${encodeURIComponent(`/services/${id}`)}`);
      } else {
        setStarting(false);
      }
    }
  };

  if (loading) return <Loader label="Loading service…" />;
  if (error) return <ErrorNote error={error} />;
  if (!svc) return <div className="px-4 py-16 text-center text-sm text-muted">Service not found.</div>;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel>
          <Link href="/browse" className="mb-4 inline-block text-[12px] text-zinc-600 hover:text-zinc-900">
            ← Back to Discover
          </Link>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">{svc.category}</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">{svc.title}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{svc.description}</p>

          {svc.skills.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Skills & tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...svc.skills, ...svc.tags.slice(0, 3)].map((s) => (
                  <span key={s} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Fixed Packages</p>
            <div className="mt-3 grid gap-2">
              {packages.map((pkg) => {
                const on = (selected?.name ?? "") === pkg.name;
                return (
                  <button
                    key={pkg.name}
                    type="button"
                    onClick={() => setPkgName(pkg.name)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      on ? "border-ink bg-zinc-50" : "border-line hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{pkg.name}</p>
                      <p className="text-sm font-bold text-ink">{formatMoney(pkg.price)}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted">{pkg.deliveryDays} day delivery{pkg.description ? ` · ${pkg.description}` : ""}</p>
                  </button>
                );
              })}
            </div>
            {selected && fees && (
              <div className="mt-4 rounded-lg bg-zinc-50 px-3 py-3 text-xs text-muted">
                <p className="flex items-center gap-1.5 text-sm text-ink">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> {formatMoney(selected.price)} · {selected.deliveryDays} day delivery
                </p>
                <p className="mt-2">You pay {formatMoney(fees.gross)} into escrow.</p>
                <p className="mt-2 font-medium text-ink">10% fee + 18% GST on success</p>
                <p>Platform 10%: {formatMoney(fees.platformFee)}</p>
                <p>GST 18% on fee: {formatMoney(fees.gst)}</p>
                <p>Provider receives {formatMoney(fees.netToProvider)} after approval.</p>
              </div>
            )}
            {isOwnService ? (
              <Link
                href="/dashboard/provider"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-zinc-50"
              >
                This is your service — manage it
              </Link>
            ) : session && session.user.role === "customer" ? (
              <Button className="mt-4 w-full" onClick={startConversation} disabled={starting}>
                <MessageSquarePlus className="h-4 w-4" />
                {starting ? "Starting…" : "Chat"}
              </Button>
            ) : session ? (
              <p className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-center text-xs text-muted">
                Only customers can message a provider.
              </p>
            ) : (
              <Link
                href={`/auth?mode=login&next=${encodeURIComponent(`/services/${id}`)}`}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
              >
                Sign in to message provider
              </Link>
            )}
          </Panel>

          <Panel className="flex items-center gap-3">
            <Ava name={svc.provider.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{svc.provider.name}</p>
              <p className="truncate text-xs text-muted">{svc.provider.title || "Freelance provider"}</p>
              <Link href={`/providers/${svc.provider.id}`} className="mt-1 inline-block text-xs font-semibold text-accent-blue hover:underline">
                View provider profile →
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}