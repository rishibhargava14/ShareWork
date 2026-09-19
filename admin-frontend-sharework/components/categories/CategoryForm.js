"use client";

export default function CategoryForm({ value, setValue, onAdd, busy }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-[16px] p-4 flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="New category name..."
        className="flex-1 h-9 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] focus:outline-none"
      />
      <button disabled={busy} onClick={onAdd} className="h-9 px-4 rounded-xl bg-zinc-900 text-white text-[13px] disabled:opacity-50">
        {busy ? "Saving…" : "Add Category"}
      </button>
    </div>
  );
}
