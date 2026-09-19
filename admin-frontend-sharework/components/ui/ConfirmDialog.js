"use client";

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onCancel} />
      <div className="relative w-full max-w-[420px] bg-white rounded-[20px] p-5 shadow-2xl">
        <h3 className="text-[16px] font-semibold">{title}</h3>
        <p className="text-[13px] text-zinc-600 mt-2">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-9 px-4 rounded-xl border border-zinc-200 text-[13px] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`h-9 px-4 rounded-xl text-[13px] font-medium text-white disabled:opacity-50 ${
              danger ? "bg-red-600" : "bg-zinc-900"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
