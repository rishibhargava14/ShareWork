"use client";

import { useEffect, useState } from "react";
import CategoryList from "@/components/categories/CategoryList";
import CategoryForm from "@/components/categories/CategoryForm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";

const ICONS = {
  "UI/UX": { icon: "🎨", color: "bg-violet-500" },
  Web: { icon: "💻", color: "bg-blue-500" },
  App: { icon: "📱", color: "bg-emerald-500" },
  Figma: { icon: "🔶", color: "bg-orange-500" },
  IT: { icon: "⚙️", color: "bg-zinc-500" },
};

function decorate(item) {
  return {
    ...item,
    ...(ICONS[item.name] || { icon: "✨", color: "bg-zinc-900" }),
  };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    const res = await api("/api/admin/categories");
    setCategories((res.categories ?? []).map(decorate));
  };

  useEffect(() => {
    let active = true;
    api("/api/admin/categories")
      .then((res) => {
        if (!active) return;
        setCategories((res.categories ?? []).map(decorate));
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load categories.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const add = async () => {
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      await api("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: value.trim() }),
      });
      setValue("");
      setSuccess("Category created.");
      setError("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create category.");
      setSuccess("");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (category) => {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      setSuccess(category.isActive ? "Category deactivated." : "Category activated.");
      setError("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update category.");
      setSuccess("");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    try {
      await api(`/api/admin/categories/${confirm.id}`, { method: "DELETE" });
      setSuccess("Category deleted.");
      setError("");
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category.");
      setSuccess("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1000px] space-y-4">
      <div className="bg-white border border-zinc-200 rounded-[16px] p-4 text-[13px] text-zinc-600">
        Categories are stored in the database. System names (`UI/UX`, `Web`, `App`, `Figma`, `IT`) can be deactivated but not deleted. Gig create rejects inactive categories.
      </div>
      <CategoryForm value={value} setValue={setValue} onAdd={add} busy={busy} />
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {success ? <p className="text-[13px] text-emerald-700">{success}</p> : null}
      {loading ? <p className="text-[13px] text-zinc-500">Loading categories…</p> : null}
      <CategoryList categories={categories} onToggle={toggle} onDelete={setConfirm} busy={busy} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete category?"
        body={`Delete ${confirm?.name}. This fails if gigs, requirements, or provider profiles still use it.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </div>
  );
}
