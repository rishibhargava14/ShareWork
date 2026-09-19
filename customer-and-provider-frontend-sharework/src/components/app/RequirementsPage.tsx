"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { ErrorNote, Loader } from "@/components/app/ui";
import { compactInr, GIG_CATEGORIES, type ExpressRequirement } from "@/lib/express";
import { fetchActiveCategories } from "@/lib/categories";
import { formatDate } from "@/lib/constants";

const emptyForm = {
  title: "",
  description: "",
  category: "Web",
  budget: "",
  deadline: "",
  skills: "",
};

export default function RequirementsPage() {
  const list = useAsync<{ requirements: ExpressRequirement[] }>(() => api("/api/customer/requirements"), []);
  const categories = useAsync(fetchActiveCategories, []);
  const categoryOptions = categories.data?.length ? categories.data : [...GIG_CATEGORIES];
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const requirements = list.data?.requirements ?? [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();
    const skills = form.skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const budget = Number(form.budget);
    if (title.length < 3) {
      setError(new Error("Title must be at least 3 characters."));
      return;
    }
    if (description.length < 10) {
      setError(new Error("Description must be at least 10 characters."));
      return;
    }
    if (!Number.isFinite(budget) || budget < 0) {
      setError(new Error("Enter a valid budget."));
      return;
    }
    if (!form.deadline) {
      setError(new Error("Deadline is required."));
      return;
    }
    const deadline = new Date(`${form.deadline}T23:59:59`);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      setError(new Error("Deadline must be in the future."));
      return;
    }
    if (skills.length === 0) {
      setError(new Error("Add at least one skill."));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api("/api/customer/requirements", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          category: form.category,
          budget,
          deadline: deadline.toISOString(),
          skills,
        }),
      });
      setForm(emptyForm);
      setSuccess("Requirement posted.");
      list.reload();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Could not post requirement."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[800px] p-6">
      <h1 className="text-[22px] font-bold">Requirements</h1>
      <p className="mt-1 text-[13px] text-zinc-500">Post a brief. Ownership is taken from your signed-in account.</p>

      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-3 rounded-[12px] border border-zinc-200 bg-white p-4">
        <div className="text-[13px] font-semibold">Post a requirement</div>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title"
          className="h-9 w-full rounded-[8px] border border-zinc-200 px-3 text-[13px]"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe the work"
          className="h-24 w-full rounded-[8px] border border-zinc-200 px-3 py-2 text-[13px]"
        />
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="h-9 rounded-[8px] border border-zinc-200 px-2 text-[13px]"
          >
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            placeholder="Budget ₹"
            className="h-9 rounded-[8px] border border-zinc-200 px-3 text-[13px]"
          />
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="h-9 rounded-[8px] border border-zinc-200 px-3 text-[13px]"
          />
        </div>
        <input
          value={form.skills}
          onChange={(e) => setForm({ ...form, skills: e.target.value })}
          placeholder="Skills, comma separated"
          className="h-9 w-full rounded-[8px] border border-zinc-200 px-3 text-[13px]"
        />
        {error ? <ErrorNote error={error} /> : null}
        {success ? <p className="text-[12px] text-green-700">{success}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="h-9 w-full rounded-[8px] text-[12px] font-medium text-white disabled:opacity-60"
          style={{ background: "#2563EB" }}
        >
          {saving ? "Posting…" : "Post requirement"}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {list.error ? <ErrorNote error={list.error} /> : null}
        {list.loading && requirements.length === 0 ? <Loader label="Loading requirements…" /> : null}
        {!list.loading && requirements.length === 0 && !list.error ? (
          <p className="text-[13px] text-zinc-500">No requirements yet.</p>
        ) : null}
        {requirements.map((item) => (
          <div key={item.id} className="rounded-[12px] border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[14px] font-medium">{item.title}</div>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] capitalize text-zinc-600">{item.status}</span>
            </div>
            <p className="mt-2 text-[12px] text-zinc-600">{item.description}</p>
            <p className="mt-2 text-[11px] text-zinc-500">
              {item.category} • {compactInr(item.budget)} • due {item.deadline ? formatDate(item.deadline) : "—"}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">{(item.skills ?? []).join(", ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
