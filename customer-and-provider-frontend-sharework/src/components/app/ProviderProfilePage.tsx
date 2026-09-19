"use client";

import { Star } from "@/components/icons/HtmlIcons";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { useSession } from "@/components/session/use-session";
import { ErrorNote, Loader } from "@/components/app/ui";
import { compactInr, initials, isObjectId, type ExpressGig, type ExpressProviderProfile, type ExpressUser } from "@/lib/express";
import { useSpaNav } from "@/components/app/SpaNav";
import { startConversation } from "@/lib/chat";
import { fileHref } from "@/lib/files";
import { useState } from "react";

type PublicProfileResponse = {
  user: ExpressUser;
  profile: ExpressProviderProfile | null;
  rating?: number;
  gigs?: ExpressGig[];
};

export default function ProviderProfilePage({ id }: { id: string }) {
  const spa = useSpaNav();
  const session = useSession();
  const providerId = decodeURIComponent(id);
  const [chatError, setChatError] = useState<Error | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const remote = useAsync<PublicProfileResponse>(() => api(`/api/users/${providerId}/profile`), [providerId]);
  const gigsFeed = useAsync<{ gigs: ExpressGig[] }>(
    () => api(`/api/providers/${providerId}/gigs`),
    [providerId],
  );

  const user = remote.data?.user;
  const profile = remote.data?.profile;
  const gigs = gigsFeed.data?.gigs ?? remote.data?.gigs ?? [];
  const packages = gigs[0]?.packages ?? [];
  const name = user?.name ?? "Provider";
  const title = profile?.title ?? "Fixed price expert";
  const rating = profile?.rating ?? remote.data?.rating ?? 0;
  const reviews = profile?.reviewsCount ?? 0;
  const projects = profile?.completedProjects ?? 0;
  const about = profile?.bio?.trim() || "No bio yet.";
  const shots = gigs
    .flatMap((gig) => gig.portfolioImages ?? [])
    .map((file) => ({ file, href: fileHref(file) }))
    .filter((item): item is { file: NonNullable<(typeof gigs)[number]["portfolioImages"]>[number]; href: string } => Boolean(item.href))
    .slice(0, 6);

  if (remote.loading) return <Loader label="Loading provider…" />;
  if (remote.error) {
    return (
      <div className="p-6">
        <ErrorNote error={remote.error} />
      </div>
    );
  }
  if (!user) return <div className="p-6 text-[13px] text-zinc-500">Provider not found.</div>;

  return (
    <div className="mx-auto max-w-[1100px] p-5 md:p-6">
      <button type="button" onClick={() => spa.setView("discover")} className="mb-4 flex items-center gap-1 text-[12px] text-zinc-600 hover:text-zinc-900">
        ← Back to Discover
      </button>
      <div className="grid gap-6 md:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-[12px] border border-zinc-200 bg-white p-5">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 font-bold text-white">{initials(name)}</div>
            <div>
              <div className="text-[18px] font-bold">{name}</div>
              <div className="text-[13px] text-zinc-600">
                {title}
                {profile?.categories?.[0] ? ` • ${profile.categories[0]}` : ""}
              </div>
              <div className="mt-2 flex gap-2 text-[11px]">
                <span className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5">
                  <Star size={10} /> {rating} ({reviews})
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5">{projects} projects</span>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="text-[13px] font-semibold">Portfolio</div>
            {shots.length === 0 ? (
              <p className="mt-2 text-[13px] text-zinc-500">No portfolio images yet.</p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {shots.map((shot) => (
                  <div key={shot.file.id} className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[8px] border border-zinc-200 bg-zinc-100 text-[11px] text-zinc-500">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot.href} alt={shot.file.originalName || "Portfolio"} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6">
            <div className="text-[13px] font-semibold">About</div>
            <div className="mt-2 text-[13px] leading-relaxed text-zinc-600">{about}</div>
          </div>
          <div className="mt-6">
            <div className="text-[13px] font-semibold">Gigs</div>
            {gigsFeed.error ? <ErrorNote error={gigsFeed.error} className="mt-2" /> : null}
            {gigsFeed.loading && gigs.length === 0 ? <p className="mt-2 text-[13px] text-zinc-500">Loading gigs…</p> : null}
            {gigs.length === 0 && !gigsFeed.loading ? <p className="mt-2 text-[13px] text-zinc-500">No active gigs yet.</p> : null}
            <div className="mt-2 space-y-2">
              {gigs.map((gig) => (
                <div key={gig.id} className="rounded-[10px] border border-zinc-200 p-3">
                  <div className="text-[13px] font-medium">{gig.title}</div>
                  <div className="mt-1 text-[11px] text-zinc-500">
                    {gig.category} • {gig.orders ?? 0} orders
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
            <div className="text-[13px] font-semibold">Fixed Packages</div>
            <div className="mt-3 space-y-2">
              {packages.length === 0 ? (
                <p className="text-[12px] text-zinc-500">No packages listed.</p>
              ) : (
                packages.map((pkg) => (
                  <div key={pkg.name} className="rounded-[10px] border border-zinc-200 p-3">
                    <div className="flex justify-between">
                      <span className="text-[12px] font-medium">{pkg.name}</span>
                      <span className="text-[13px] font-bold">{compactInr(pkg.fixedPrice)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">{pkg.description || `${pkg.deliveryDays} days`}</p>
                  </div>
                ))
              )}
            </div>
            {session?.user.role === "customer" && (
              <>
                {chatError ? <ErrorNote error={chatError} className="mt-3" /> : null}
                <button
                  type="button"
                  disabled={startingChat || !isObjectId(providerId)}
                  onClick={() => {
                    void (async () => {
                      setChatError(null);
                      setStartingChat(true);
                      try {
                        const res = await startConversation(providerId, gigs[0]?.id);
                        spa.setView("messages", { inboxName: res.conversation.id });
                      } catch (err) {
                        setChatError(err instanceof Error ? err : new Error("Could not start chat."));
                      } finally {
                        setStartingChat(false);
                      }
                    })();
                  }}
                  className="mt-4 h-9 w-full rounded-[8px] text-[12px] font-medium text-white disabled:opacity-60"
                  style={{ background: "#2563EB" }}
                >
                  {startingChat ? "Opening…" : "Chat"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
