"use client";

import { useState } from "react";
import { Plus } from "@/components/icons/HtmlIcons";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { HTML_PACKAGES } from "@/lib/constants";
import { useSession } from "@/components/session/use-session";
import { compactInr, padDescription, GIG_CATEGORIES, type ExpressGig } from "@/lib/express";
import { fetchActiveCategories } from "@/lib/categories";
import { ErrorNote, Loader } from "@/components/app/ui";
import { validateUploadFile } from "@/lib/files";

const DEFAULT_PACKAGES = HTML_PACKAGES.map((pkg, index) => ({
  name: pkg.name as "Basic" | "Standard" | "Premium",
  description: pkg.description || `${pkg.name} fixed-price package.`,
  fixedPrice: pkg.price,
  deliveryDays: pkg.deliveryDays,
  revisions: index === 0 ? 1 : index === 1 ? 2 : 4,
  features: pkg.features.length ? pkg.features : ["Scope as listed"],
}));

export default function ServicesManager() {
  const session = useSession();
  const providerId = session?.user.id;
  const { data, loading, error, reload } = useAsync<{ gigs: ExpressGig[] }>(
    () => {
      if (!providerId) return Promise.resolve({ gigs: [] });
      return api(`/api/providers/${providerId}/gigs`);
    },
    [providerId],
  );
  const categories = useAsync(fetchActiveCategories, []);
  const categoryOptions = categories.data?.length ? categories.data : [...GIG_CATEGORIES];
  const [creating, setCreating] = useState(false);
  const [drafts, setDrafts] = useState(HTML_PACKAGES.map((p) => ({ ...p, title: "", scope: "" })));
  const [category, setCategory] = useState("Web");
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<ExpressGig | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("Web");
  const [editDescription, setEditDescription] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const gigs = data?.gigs ?? [];
  const accent = "#16A34A";

  const createGig = async (i: number) => {
    const row = drafts[i];
    const title = row.title.trim();
    if (title.length < 10) {
      setSaveError(new Error("Gig title must be at least 10 characters."));
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      portfolioFiles.forEach(validateUploadFile);
      const form = new FormData();
      form.append("title", title);
      form.append("category", category);
      form.append("description", padDescription(row.scope || row.description || title));
      form.append("packages", JSON.stringify(DEFAULT_PACKAGES));
      portfolioFiles.forEach((file) => form.append("portfolioImages", file));
      await api("/api/gigs", {
        method: "POST",
        body: form,
      });
      setDrafts((rows) => rows.map((r, idx) => (idx === i ? { ...r, title: "", scope: "" } : r)));
      setPortfolioFiles([]);
      setCreating(false);
      setSaveSuccess("Gig created.");
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err : new Error("Could not create gig."));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (gig: ExpressGig) => {
    setEditing(gig);
    setEditTitle(gig.title);
    setEditCategory((GIG_CATEGORIES as readonly string[]).includes(gig.category) ? (gig.category as (typeof GIG_CATEGORIES)[number]) : "Web");
    setEditDescription(gig.description);
    setEditActive(gig.isActive !== false);
    setEditFiles([]);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const updateGig = async () => {
    if (!editing || saving) return;
    const title = editTitle.trim();
    if (title.length < 10) {
      setSaveError(new Error("Gig title must be at least 10 characters."));
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      editFiles.forEach(validateUploadFile);
      const form = new FormData();
      form.append("title", title);
      form.append("category", editCategory);
      form.append("description", padDescription(editDescription || title));
      form.append("isActive", editActive ? "true" : "false");
      editFiles.forEach((file) => form.append("portfolioImages", file));
      await api(`/api/gigs/${editing.id}`, { method: "PUT", body: form });
      setEditing(null);
      setEditFiles([]);
      setSaveSuccess("Gig updated.");
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err : new Error("Could not update gig."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold">My Gigs</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-[8px] px-3 py-1.5 text-[12px] text-white"
          style={{ background: accent }}
        >
          <Plus className="h-3 w-3" /> New Gig
        </button>
      </div>

      {error ? <ErrorNote error={error} className="mt-4" /> : null}
      {saveError ? <ErrorNote error={saveError} className="mt-4" /> : null}
      {saveSuccess ? <p className="mt-4 text-[12px] text-green-700">{saveSuccess}</p> : null}

      <div className="mt-6 space-y-3">
        {loading && gigs.length === 0 ? <Loader label="Loading gigs…" /> : null}
        {gigs.map((gig) => {
          const prices = (gig.packages ?? []).map((p) => p.fixedPrice);
          const min = prices.length ? Math.min(...prices) : 0;
          const max = prices.length ? Math.max(...prices) : 0;
          const priceLabel = min === max ? compactInr(min) : `${compactInr(min)}-${compactInr(max).replace("₹", "")}`;
          return (
            <div key={gig.id} className="flex justify-between gap-3 rounded-[12px] border border-zinc-200 bg-white p-4">
              <div>
                <div className="text-[14px] font-medium">{gig.title}</div>
                <div className="text-[12px] text-zinc-600">
                  {gig.category} • {priceLabel} • {gig.orders ?? 0} orders
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-fit rounded-full border border-green-200 bg-green-50 px-2 py-1 text-[11px] text-green-700">
                  {gig.isActive === false ? "Hidden" : "Active"}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(gig)}
                  className="h-7 rounded border border-zinc-200 px-2 text-[11px]"
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
        {gigs.length === 0 && !loading && !error ? (
          <p className="text-[13px] text-zinc-500">No gigs yet. Create one with the fixed packages below.</p>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-6 space-y-3 rounded-[12px] border border-zinc-200 bg-white p-4">
          <div className="text-[13px] font-medium">Edit gig</div>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="h-8 w-full rounded border border-zinc-200 px-2 text-[12px]"
          />
          <select
            value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            className="h-8 w-full rounded border border-zinc-200 px-2 text-[12px]"
          >
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="h-20 w-full rounded border border-zinc-200 px-2 py-1 text-[12px]"
          />
          <label className="flex items-center gap-2 text-[12px]">
            <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
            Active (visible to customers)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const next = Array.from(e.target.files ?? []);
              try {
                next.forEach(validateUploadFile);
                setEditFiles(next);
                setSaveError(null);
              } catch (err) {
                setEditFiles([]);
                setSaveError(err instanceof Error ? err : new Error("Invalid portfolio file."));
              }
            }}
            className="block w-full text-[12px]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void updateGig()}
              className="h-8 flex-1 rounded bg-zinc-900 text-[12px] text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="h-8 flex-1 rounded border border-zinc-200 text-[12px]">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-[12px] border border-zinc-200 bg-white p-4">
        <div className="text-[13px] font-medium">Create Gig - Fixed Packages</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-[11px] font-medium text-zinc-600">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 h-8 w-full rounded border border-zinc-200 px-2 text-[12px]"
            >
              {categoryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-medium text-zinc-600">
            Portfolio images
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                const next = Array.from(e.target.files ?? []);
                try {
                  next.forEach(validateUploadFile);
                  setPortfolioFiles(next);
                  setSaveError(null);
                } catch (err) {
                  setPortfolioFiles([]);
                  setSaveError(err instanceof Error ? err : new Error("Invalid portfolio file."));
                }
              }}
              className="mt-1 block w-full text-[12px]"
            />
            <span className="mt-1 block text-[11px] text-zinc-500">
              {portfolioFiles.length > 0 ? `${portfolioFiles.length} image(s) selected` : "Optional. Images only. Max 8, 25MB each."}
            </span>
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {drafts.map((h, i) => (
            <div key={h.name} className="rounded-[10px] border border-zinc-200 p-3">
              <div className="text-[12px] font-medium">{h.name}</div>
              <div className="text-[14px] font-bold">₹{h.price.toLocaleString("en-IN")}</div>
              <input
                placeholder="Title"
                value={h.title}
                onChange={(e) => setDrafts((rows) => rows.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)))}
                className="mt-2 h-7 w-full rounded border border-zinc-200 px-2 text-[11px]"
              />
              <textarea
                placeholder="Scope"
                value={h.scope}
                onChange={(e) => setDrafts((rows) => rows.map((r, idx) => (idx === i ? { ...r, scope: e.target.value } : r)))}
                className="mt-2 h-14 w-full resize-none rounded border border-zinc-200 px-2 py-1 text-[11px]"
              />
              {creating && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void createGig(i)}
                  className="mt-2 h-7 w-full rounded bg-zinc-900 text-[11px] text-white"
                >
                  {saving ? "Uploading…" : "Save"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
