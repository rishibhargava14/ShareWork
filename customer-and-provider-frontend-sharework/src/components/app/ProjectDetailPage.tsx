"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { openStoredFile, validateUploadFile } from "@/lib/files";
import { useAsync } from "@/lib/use-async";
import { Loader, ErrorNote } from "@/components/app/ui";
import { feeBreakdown } from "@/lib/constants";
import { useSession } from "@/components/session/use-session";
import {
  apiProjectStatusLabel,
  compactInr,
  type ExpressProject,
  type ExpressReview,
} from "@/lib/express";
import { fundProjectEscrow } from "@/lib/payments";

export default function ProjectDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const session = useSession();
  const accent = session?.user.role === "provider" ? "#16A34A" : "#2563EB";
  const { data, loading, error, reload } = useAsync<{ project: ExpressProject; review?: ExpressReview | null }>(
    () => api(`/api/projects/${id}`),
    [id],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [revisionNote, setRevisionNote] = useState("Please revise the latest delivery.");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const project = data?.project ?? null;
  const isCustomer = Boolean(project && session?.user.id === project.customerId);
  const isProvider = Boolean(project && session?.user.id === project.providerId);

  const act = async (path: string, extra?: Record<string, unknown>) => {
    if (busy) return;
    setBusy(path);
    setActionError(null);
    try {
      await api(`/api/projects/${id}/${path}`, {
        method: "POST",
        body: extra ? JSON.stringify(extra) : undefined,
      });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err : new Error("Request failed."));
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loader label="Loading project…" />;
  if (error) {
    return (
      <div className="p-6">
        <ErrorNote error={error} />
      </div>
    );
  }
  if (!project) return <div className="p-6 text-[13px] text-zinc-500">Project not found.</div>;

  const status = project.status;
  const lastDelivery = project.deliverablesHistory?.[project.deliverablesHistory.length - 1] ?? null;
  const fees = feeBreakdown(project.fixedPrice);
  const revisions = `${project.revisionsUsed ?? 0}/${project.revisionsAllowed ?? 0}`;
  const deliverables = (project.deliverables ?? []).join(", ");
  const canSubmit = isProvider && (status === "in_progress" || status === "agreement_pending" || status === "escrow_funded");
  const canReviewDelivery = isCustomer && status === "delivered";
  const canDispute = (isCustomer || isProvider) && (status === "in_progress" || status === "delivered");
  const canFund = isCustomer && status === "agreement_pending";
  const canRelease = isCustomer && status === "delivered" && project.escrow?.status === "locked";
  const existingReview = data?.review ?? null;
  const canReview = isCustomer && status === "completed" && !existingReview;

  const fundEscrow = async () => {
    if (busy || !canFund) return;
    setBusy("fund-escrow");
    setActionError(null);
    try {
      await fundProjectEscrow(id, { name: session?.user.name, email: session?.user.email });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err : new Error("Could not fund escrow."));
    } finally {
      setBusy(null);
    }
  };

  const releaseEscrow = async () => {
    if (busy || !canRelease) return;
    setBusy("release-escrow");
    setActionError(null);
    try {
      await api("/api/escrow/release", {
        method: "POST",
        body: JSON.stringify({ projectId: id }),
      });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err : new Error("Could not release escrow."));
    } finally {
      setBusy(null);
    }
  };

  const submitDeliverable = async (e: FormEvent) => {
    e.preventDefault();
    if (!deliveryNote.trim() || deliveryFiles.length === 0 || busy) return;
    setBusy("submit-deliverable");
    setActionError(null);
    try {
      deliveryFiles.forEach(validateUploadFile);
      const form = new FormData();
      form.append("message", deliveryNote.trim());
      deliveryFiles.forEach((file) => form.append("files", file));
      await api(`/api/projects/${id}/submit-deliverable`, { method: "POST", body: form });
      setDeliveryNote("");
      setDeliveryFiles([]);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err : new Error("Could not submit deliverable."));
    } finally {
      setBusy(null);
    }
  };

  const submitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!canReview || busy) return;
    setBusy("review");
    setActionError(null);
    try {
      await api(`/api/projects/${id}/review`, {
        method: "POST",
        body: JSON.stringify({
          rating: reviewRating,
          ...(reviewComment.trim() ? { comment: reviewComment.trim() } : {}),
        }),
      });
      setReviewComment("");
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err : new Error("Could not submit review."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6">
      <button type="button" onClick={onBack} className="mb-4 inline-block text-[12px] text-zinc-600 hover:text-zinc-900">
        ← Back to projects
      </button>
      <h1 className="text-[22px] font-bold">{project.title}</h1>
      <p className="mt-1 text-[13px] text-zinc-500">
        {compactInr(project.fixedPrice)} • {project.timelineDays} days • {apiProjectStatusLabel(status)}
      </p>
      {actionError ? <ErrorNote error={actionError} className="mt-4" /> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
            <div className="text-[13px] font-semibold">Final Agreement • {project.title}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <span className="text-zinc-500">Price:</span> ₹{project.fixedPrice}
              </div>
              <div>
                <span className="text-zinc-500">Timeline:</span> {project.timelineDays} days
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500">Scope:</span> {project.scope}
              </div>
              <div>
                <span className="text-zinc-500">Revisions</span>
                <span className="ml-2">{revisions}</span>
              </div>
            </div>
          </div>

          {status === "completed" && (
            <div className="rounded-[12px] border border-green-200 bg-green-50 p-3 text-center">
              <div className="text-[13px] font-semibold text-green-800">Delivery approved ✓</div>
              <div className="mt-1 text-[11px] text-green-700">₹{project.fixedPrice} work is complete. Escrow release follows customer approval.</div>
            </div>
          )}

          {status === "disputed" && (
            <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">This project is in dispute.</div>
          )}

          {lastDelivery && (
            <div className="rounded-[12px] border border-zinc-200 bg-white p-4">
              <div className="text-[13px] font-semibold">Latest deliverable</div>
              <p className="mt-2 text-[12px] text-zinc-600">{lastDelivery.message}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{lastDelivery.status}</p>
              <div className="mt-3 space-y-1">
                {(lastDelivery.files ?? []).map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => void openStoredFile(file).catch((err) => setActionError(err instanceof Error ? err : new Error("Could not open file.")))}
                    className="block text-left text-[12px] text-blue-700 underline"
                  >
                    {file.originalName || "Download file"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {canSubmit && (
            <form onSubmit={(e) => void submitDeliverable(e)} className="rounded-[12px] border border-zinc-200 bg-white p-4">
              <div className="text-[13px] font-semibold">Submit Deliverable</div>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.zip,application/pdf,application/zip"
                onChange={(e) => {
                  const next = Array.from(e.target.files ?? []);
                  try {
                    next.forEach(validateUploadFile);
                    setDeliveryFiles(next);
                    setActionError(null);
                  } catch (err) {
                    setDeliveryFiles([]);
                    setActionError(err instanceof Error ? err : new Error("Invalid file."));
                  }
                }}
                className="mt-3 block w-full text-[12px]"
              />
              {deliveryFiles.length > 0 ? (
                <p className="mt-1 text-[11px] text-zinc-500">{deliveryFiles.length} file(s) selected</p>
              ) : (
                <p className="mt-1 text-[11px] text-zinc-500">PDF, ZIP, or images. Max 25MB each.</p>
              )}
              <textarea
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Delivery notes"
                className="mt-3 h-20 w-full rounded-[8px] border border-zinc-200 px-3 py-2 text-[13px]"
              />
              <button
                type="submit"
                disabled={busy !== null || !deliveryNote.trim() || deliveryFiles.length === 0}
                className="mt-3 h-9 w-full rounded-[8px] text-[12px] font-medium text-white disabled:opacity-60"
                style={{ background: accent }}
              >
                {busy === "submit-deliverable" ? "Uploading…" : "Submit Deliverable"}
              </button>
            </form>
          )}
        </div>

        <div className="rounded-[12px] border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-4">
            <div className="text-[13px] font-semibold">Project Details</div>
            <div className="mt-3 space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">Fixed Price</span>
                <span className="font-semibold">₹{project.fixedPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Escrow</span>
                <span className="rounded px-2 py-0.5 text-[10px] text-white" style={{ background: project.escrow?.status === "locked" || project.escrow?.status === "released" ? accent : "#aaa" }}>
                  {project.escrow?.status === "locked" ? "Funded Locked" : project.escrow?.status === "released" ? "Released" : "Not funded"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Timeline</span>
                <span>{project.timelineDays} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Revisions</span>
                <span>{revisions}</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {status === "agreement_pending" && isProvider && <div className="rounded-[8px] border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-600">Waiting for the customer to fund escrow. You can still prepare the deliverable.</div>}
              {canFund && (
                <button type="button" onClick={() => void fundEscrow()} disabled={busy !== null} className="h-9 w-full rounded-[8px] text-[12px] font-medium text-white disabled:opacity-60" style={{ background: accent }}>
                  {busy === "fund-escrow" ? "Opening checkout…" : "Fund escrow"}
                </button>
              )}
              {canRelease && (
                <button type="button" onClick={() => void releaseEscrow()} disabled={busy !== null} className="h-9 w-full rounded-[8px] border border-zinc-200 text-[12px] disabled:opacity-60">
                  {busy === "release-escrow" ? "Releasing…" : "Release escrow"}
                </button>
              )}
              {canReviewDelivery && (
                <>
                  <button type="button" onClick={() => void act("approve-deliverable")} disabled={busy !== null} className="h-9 w-full rounded-[8px] text-[12px] font-medium text-white disabled:opacity-60" style={{ background: "#16A34A" }}>
                    {busy === "approve-deliverable" ? "Approving…" : "Approve delivery"}
                  </button>
                  <textarea
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    className="h-16 w-full rounded-[8px] border border-zinc-200 px-2 py-1 text-[11px]"
                  />
                  <button
                    type="button"
                    disabled={busy !== null || !revisionNote.trim()}
                    onClick={() => void act("request-revision", { message: revisionNote.trim() })}
                    className="h-9 w-full rounded-[8px] border border-zinc-200 text-[12px] disabled:opacity-60"
                  >
                    {busy === "request-revision" ? "Requesting…" : "Request revision"}
                  </button>
                </>
              )}
              {canDispute && (
                <div className="space-y-2 rounded-[8px] border border-zinc-200 p-2">
                  <input value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Dispute reason" className="h-8 w-full rounded border border-zinc-200 px-2 text-[11px]" />
                  <textarea value={disputeDescription} onChange={(e) => setDisputeDescription(e.target.value)} placeholder="Describe the issue" className="h-16 w-full rounded border border-zinc-200 px-2 py-1 text-[11px]" />
                  <button
                    type="button"
                    disabled={busy !== null || disputeReason.trim().length < 3 || disputeDescription.trim().length < 10}
                    onClick={() => void act("dispute", { reason: disputeReason.trim(), description: disputeDescription.trim() })}
                    className="h-9 w-full rounded-[8px] border border-red-200 text-[12px] text-red-700 disabled:opacity-60"
                  >
                    {busy === "dispute" ? "Opening…" : "Open dispute"}
                  </button>
                </div>
              )}
              {existingReview ? (
                <div className="rounded-[8px] border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-600">
                  Review: {existingReview.rating}/5{existingReview.comment ? ` — ${existingReview.comment}` : ""}
                </div>
              ) : null}
              {canReview ? (
                <form onSubmit={(e) => void submitReview(e)} className="space-y-2 rounded-[8px] border border-zinc-200 p-2">
                  <div className="text-[12px] font-medium">Review this project</div>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="h-8 w-full rounded border border-zinc-200 px-2 text-[11px]"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value} star{value === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Comment (optional)"
                    className="h-16 w-full rounded border border-zinc-200 px-2 py-1 text-[11px]"
                  />
                  <button
                    type="submit"
                    disabled={busy !== null}
                    className="h-9 w-full rounded-[8px] text-[12px] font-medium text-white disabled:opacity-60"
                    style={{ background: accent }}
                  >
                    {busy === "review" ? "Submitting…" : "Submit review"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
          <div className="p-4">
            <div className="text-[12px] font-semibold">Deliverables</div>
            <div className="mt-2 text-[11px] leading-relaxed text-zinc-600">{deliverables}</div>
            <div className="mt-4 rounded-[8px] border border-zinc-200 bg-zinc-50 p-2.5 text-[11px]">
              <div className="font-medium">Fee Breakdown</div>
              <div className="mt-1 flex justify-between">
                <span>Fixed price</span>
                <span>₹{project.fixedPrice}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Platform 10%</span>
                <span>₹{fees.platformFee}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>GST 18% on fee</span>
                <span>₹{fees.gst}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
