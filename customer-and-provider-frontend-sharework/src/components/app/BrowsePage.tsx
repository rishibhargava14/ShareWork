"use client";

import { useState } from "react";
import { MessageSquare, Package, Lock } from "@/components/icons/HtmlIcons";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { useSession } from "@/components/session/use-session";
import { DISCOVER_CHIPS } from "@/lib/constants";
import { fetchActiveCategories } from "@/lib/categories";
import { compactInr, initials, queryString, type DiscoveryProvider } from "@/lib/express";
import { ErrorNote, Loader } from "@/components/app/ui";
import { useSpaNav } from "@/components/app/SpaNav";
import { startConversation } from "@/lib/chat";

export default function BrowsePage() {
  const spa = useSpaNav();
  const session = useSession();
  const [chip, setChip] = useState("All");
  const [search, setSearch] = useState("");
  const [budgetOn, setBudgetOn] = useState(false);
  const [ratingOn, setRatingOn] = useState(false);
  const [onlineOn, setOnlineOn] = useState(false);
  const [chatError, setChatError] = useState<Error | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const accent = session?.user.role === "provider" ? "#16A34A" : "#2563EB";
  const categoryNames = useAsync(fetchActiveCategories, []);
  const names = categoryNames.data?.length
    ? categoryNames.data
    : DISCOVER_CHIPS.filter((item) => item.category).map((item) => item.category);
  const uniqueChips = [
    { id: "all", label: "All", category: "" },
    ...names.map((name) => ({ id: name, label: name, category: name })),
  ];
  const category = uniqueChips.find((c) => c.label === chip)?.category ?? "";

  const discover = useAsync<{ providers: DiscoveryProvider[]; total: number }>(
    () =>
      api(
        `/api/customers/discover${queryString({
          category: category || undefined,
          search: search.trim() || undefined,
          budgetMin: budgetOn ? 5000 : undefined,
          budgetMax: budgetOn ? 50000 : undefined,
          rating: ratingOn ? 4.8 : undefined,
          online: onlineOn ? "online" : undefined,
          page: 1,
        })}`,
      ),
    [category, search, budgetOn, ratingOn, onlineOn],
  );

  const cards = discover.data?.providers ?? [];

  const openProfile = (provider: DiscoveryProvider) => {
    spa.setView("freelancer", { expertName: provider.id });
  };

  const chat = async (provider: DiscoveryProvider) => {
    if (!session) {
      spa.goAuth("login");
      return;
    }
    setChatError(null);
    setStartingChat(true);
    try {
      const res = await startConversation(provider.id);
      spa.setView("messages", { inboxName: res.conversation.id });
    } catch (err) {
      setChatError(err instanceof Error ? err : new Error("Could not start chat."));
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-bold text-zinc-900">Discover Experts</h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, bio, or skills"
            className="h-9 w-full max-w-[240px] rounded-[8px] border border-zinc-200 px-3 text-[12px]"
          />
          <div className="flex gap-2">
            {uniqueChips.map((c) => {
              const active = chip === c.label;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChip(c.label)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                    active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBudgetOn((v) => !v)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${budgetOn ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}
          >
            Budget ₹5k-₹50k+
          </button>
          <button
            type="button"
            onClick={() => setRatingOn((v) => !v)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${ratingOn ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}
          >
            Rating 4.8+
          </button>
          <button
            type="button"
            onClick={() => setOnlineOn((v) => !v)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${onlineOn ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}
          >
            Online now
          </button>
        </div>

        {discover.error ? <ErrorNote error={discover.error} className="mt-6" /> : null}
        {chatError ? <ErrorNote error={chatError} className="mt-6" /> : null}
        {discover.loading && cards.length === 0 ? <Loader label="Loading experts…" /> : null}
        {!discover.loading && !discover.error && cards.length === 0 ? (
          <p className="mt-6 text-[13px] text-zinc-500">No experts match these filters.</p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((h) => (
            <article
              key={h.id}
              className="cursor-pointer rounded-[12px] border border-zinc-200 bg-white p-4"
              onClick={() => openProfile(h)}
            >
              <div className="flex gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-[12px] font-bold text-white">
                    {initials(h.name)}
                  </div>
                  {h.onlineStatus === "online" && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[14px] font-semibold">
                    {h.name}{" "}
                    {h.categories?.[0] ? (
                      <span className="rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-[10px]">{h.categories[0]}</span>
                    ) : null}
                  </div>
                  <div className="truncate text-[12px] text-zinc-600">{h.title || "Fixed price expert"}</div>
                </div>
              </div>
              <p className="mt-3 text-[12px] text-zinc-500">
                {h.rating ?? 0} · {h.reviewsCount ?? 0} reviews
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(h.skills ?? []).slice(0, 6).map((s) => (
                  <span key={s} className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-500">Starting</span>
                  <div className="text-[14px] font-semibold">{compactInr(h.startingPrice ?? 0)}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    chat(h);
                  }}
                  disabled={session?.user.role === "provider" || startingChat}
                  className="flex items-center gap-1 rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
                  style={{ background: accent }}
                >
                  <MessageSquare size={12} /> Chat
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="hidden w-[320px] shrink-0 flex-col gap-4 border-l border-zinc-200 bg-white p-5 xl:flex">
        <p className="text-[13px] font-semibold">How fixed price works</p>
        <div className="space-y-3 text-[12px]">
          <div className="rounded-[10px] border border-zinc-200 p-3">
            <p className="flex items-center gap-1 font-medium">
              <Package size={12} /> Packages
            </p>
            <p className="mt-1 text-zinc-600">Basic ₹5k / Standard ₹15k / Premium ₹35k - pick one, no hourly.</p>
          </div>
          <div className="rounded-[10px] border border-zinc-200 p-3">
            <p className="flex items-center gap-1 font-medium">
              <Lock size={12} /> Escrow
            </p>
            <p className="mt-1 text-zinc-600">Fund after agreement approval. Money locked until you approve delivery.</p>
          </div>
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-medium text-amber-800">ANTI-LEAKAGE</p>
            <p className="mt-1 leading-snug text-amber-900">
              Keep chat inside ShareWork. No phone/email sharing until escrow funded. Flat fee 10% + GST 18%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
