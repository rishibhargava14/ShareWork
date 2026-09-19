"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Paperclip, Send, X } from "@/components/icons/HtmlIcons";
import { useSpaNav } from "@/components/app/SpaNav";
import { api } from "@/lib/api";
import { openStoredFile, validateUploadFile } from "@/lib/files";
import { useAsync } from "@/lib/use-async";
import { feeBreakdown, formatDateTime } from "@/lib/constants";
import { useSession } from "@/components/session/use-session";
import { ErrorNote, Loader } from "@/components/app/ui";
import { otherParticipant, unreadFor } from "@/lib/chat";
import { connectChatSocket, joinConversationRoom } from "@/lib/socket";
import { fundProjectEscrow } from "@/lib/payments";
import {
  AGREEMENT_PRICES,
  compactInr,
  initials,
  isObjectId,
  type ExpressAgreement,
  type ExpressConversation,
  type ExpressMessage,
  type ExpressProject,
} from "@/lib/express";

function asError(err: unknown, fallback: string) {
  return err instanceof Error ? err : new Error(fallback);
}

function AgreementModal({
  conversationId,
  onClose,
  onCreated,
}: {
  conversationId: string;
  onClose: () => void;
  onCreated: (message: ExpressMessage) => void;
}) {
  const session = useSession();
  const accent = session?.user.role === "provider" ? "#16A34A" : "#2563EB";
  const [form, setForm] = useState({
    title: "SaaS Dashboard Build",
    scope: "Build responsive dashboard with analytics, auth, billing.",
    deliverables: "Source code, Figma, Deployment",
    price: "15000",
    timeline: "7",
    revisions: "2",
  });
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    if (creating) return;
    setError(null);
    setCreating(true);
    try {
      const deliverables = form.deliverables
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (form.title.trim().length < 5) throw new Error("Title must be at least 5 characters.");
      if (form.scope.trim().length < 20) throw new Error("Scope must be at least 20 characters.");
      if (deliverables.length === 0) throw new Error("Add at least one deliverable.");
      const res = await api<{ message: ExpressMessage }>(`/api/conversations/${conversationId}/agreement`, {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          scope: form.scope.trim(),
          deliverables,
          fixedPrice: Number(form.price),
          timelineDays: parseInt(form.timeline, 10) || 7,
          revisions: parseInt(form.revisions, 10) || 0,
        }),
      });
      onCreated(res.message);
      onClose();
    } catch (err) {
      setError(asError(err, "Could not create the agreement.").message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[560px] overflow-hidden rounded-[16px] border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 p-5">
          <div className="font-semibold">Create Final Agreement</div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <label className="text-[11px] font-medium">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 h-9 w-full rounded-[8px] border border-zinc-200 px-3 text-[13px]" />
          </div>
          <div>
            <label className="text-[11px] font-medium">Scope</label>
            <textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="mt-1 h-16 w-full rounded-[8px] border border-zinc-200 px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="text-[11px] font-medium">Deliverables</label>
            <input value={form.deliverables} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} className="mt-1 h-9 w-full rounded-[8px] border border-zinc-200 px-3 text-[13px]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium">Fixed Price ₹</label>
              <select value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1 h-9 w-full rounded-[8px] border border-zinc-200 px-2 text-[13px]">
                {AGREEMENT_PRICES.map((price) => (
                  <option key={price} value={String(price)}>
                    ₹{price.toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium">Timeline</label>
              <input value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} className="mt-1 h-9 w-full rounded-[8px] border border-zinc-200 px-3 text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] font-medium">Revisions</label>
              <input value={form.revisions} onChange={(e) => setForm({ ...form, revisions: e.target.value })} className="mt-1 h-9 w-full rounded-[8px] border border-zinc-200 px-3 text-[13px]" />
            </div>
          </div>
          <div className="rounded-[8px] border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-600">
            Fixed cost only. 10% platform fee + 18% GST on fee after success.
          </div>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-10 flex-1 rounded-[8px] border border-zinc-200 text-[13px]">
              Cancel
            </button>
            <button type="button" onClick={() => void submit()} disabled={creating} className="h-10 flex-1 rounded-[8px] text-[13px] font-medium text-white" style={{ background: accent }}>
              {creating ? "Sending…" : "Send Agreement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function upsertMessage(list: ExpressMessage[], incoming: ExpressMessage) {
  const next = list.filter((item) => item.id !== incoming.id);
  next.push(incoming);
  next.sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
  return next;
}

export default function ConversationDetailPage({ id }: { id: string }) {
  const spa = useSpaNav();
  const session = useSession();
  const accent = session?.user.role === "provider" ? "#16A34A" : "#2563EB";
  const isProvider = session?.user.role === "provider";
  const isCustomer = session?.user.role === "customer";
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showProposal, setShowProposal] = useState(false);
  const [socketMessages, setSocketMessages] = useState<ExpressMessage[]>([]);
  const [sendError, setSendError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const selectedId = isObjectId(id) ? id : "";

  const inbox = useAsync<{ conversations: ExpressConversation[] }>(() => api("/api/conversations"), []);
  const conversations = inbox.data?.conversations ?? [];
  const conv = conversations.find((item) => item.id === selectedId) ?? null;
  const other = otherParticipant(conv, session?.user.id);
  const queryRole = isProvider ? "provider" : "customer";
  const projects = useAsync<{ projects: ExpressProject[] }>(() => api(`/api/projects?role=${queryRole}`), [queryRole, selectedId]);
  const project = (projects.data?.projects ?? []).find((item) => item.conversationId === selectedId) ?? null;
  const thread = useAsync<{ messages: ExpressMessage[] }>(
    () => (selectedId ? api(`/api/conversations/${selectedId}/messages?limit=100`) : Promise.resolve({ messages: [] })),
    [selectedId],
  );
  const messages = useMemo(() => {
    const base = thread.data?.messages ?? [];
    return socketMessages
      .filter((item) => item.conversationId === selectedId)
      .reduce((acc, item) => upsertMessage(acc, item), base);
  }, [thread.data, socketMessages, selectedId]);

  const conversationIds = conversations.map((item) => item.id).join(",");
  const reloadInbox = inbox.reload;
  const reloadProjects = projects.reload;

  useEffect(() => {
    const socket = connectChatSocket();
    if (!socket) return undefined;
    const ids = conversationIds.split(",").filter(Boolean);
    for (const item of ids) joinConversationRoom(item);
    if (selectedId) joinConversationRoom(selectedId);

    const onMessage = (incoming: ExpressMessage) => {
      if (!incoming?.id) return;
      if (selectedId && incoming.conversationId === selectedId) {
        setSocketMessages((current) => upsertMessage(current, incoming));
      }
      reloadInbox();
      if (incoming.type === "system_agreement" || incoming.agreement?.status === "approved") reloadProjects();
    };
    const onProjectEvent = () => {
      reloadProjects();
      reloadInbox();
    };

    socket.on("new_message", onMessage);
    socket.on("agreement_created", onMessage);
    socket.on("escrow_funded", onProjectEvent);
    socket.on("deliverable_submitted", onProjectEvent);
    socket.on("payment_released", onProjectEvent);
    const onConnect = () => {
      for (const item of ids) joinConversationRoom(item);
      if (selectedId) joinConversationRoom(selectedId);
    };
    socket.on("connect", onConnect);
    return () => {
      socket.off("new_message", onMessage);
      socket.off("agreement_created", onMessage);
      socket.off("escrow_funded", onProjectEvent);
      socket.off("deliverable_submitted", onProjectEvent);
      socket.off("payment_released", onProjectEvent);
      socket.off("connect", onConnect);
    };
  }, [conversationIds, selectedId, reloadInbox, reloadProjects]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pendingAgreement = useMemo(() => {
    return [...messages].reverse().find((item) => item.type === "system_agreement" && item.agreement?.status === "pending") ?? null;
  }, [messages]);
  const latestAgreement: ExpressAgreement | null =
    pendingAgreement?.agreement ??
    [...messages].reverse().find((item) => item.type === "system_agreement")?.agreement ??
    null;

  const price = project?.fixedPrice ?? latestAgreement?.fixedPrice ?? 15000;
  const timeline = `${project?.timelineDays ?? latestAgreement?.timelineDays ?? 7} days`;
  const scope = project?.scope ?? latestAgreement?.scope ?? "Scope appears after the provider sends an agreement.";
  const revisions = project?.revisionsAllowed ?? latestAgreement?.revisions ?? 2;
  const deliverables = (project?.deliverables ?? latestAgreement?.deliverables ?? []).join(", ") || "Listed in the agreement.";
  const fees = feeBreakdown(price);
  const lastDelivery = project?.deliverablesHistory?.[project.deliverablesHistory.length - 1] ?? null;

  const phase =
    project?.status === "completed"
      ? "paid"
      : project?.status === "delivered"
        ? "delivered"
        : project?.status === "in_progress" || project?.status === "escrow_funded" || project?.status === "agreement_pending"
          ? "in_progress"
          : pendingAgreement
            ? "agreement_sent"
            : "chat";

  const displayName = other?.name || "Conversation";
  const displayTitle = isProvider ? "Customer" : "Fixed price expert";
  const displayAvatar = initials(displayName);

  const openConversation = (conversationId: string) => spa.setView("messages", { inboxName: conversationId });

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!selectedId || sending) return;
    if (!pendingFile && !text) return;
    setSending(true);
    setSendError(null);
    try {
      if (pendingFile) {
        validateUploadFile(pendingFile);
        const form = new FormData();
        form.append("type", "file");
        form.append("content", text || pendingFile.name);
        form.append("file", pendingFile);
        const res = await api<{ message: ExpressMessage }>(`/api/conversations/${selectedId}/messages`, {
          method: "POST",
          body: form,
        });
        setSocketMessages((current) => upsertMessage(current, res.message));
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const socket = connectChatSocket();
        if (socket?.connected) {
          socket.emit("send_message", { conversationId: selectedId, type: "text", content: text });
        } else {
          const res = await api<{ message: ExpressMessage }>(`/api/conversations/${selectedId}/messages`, {
            method: "POST",
            body: JSON.stringify({ type: "text", content: text }),
          });
          setSocketMessages((current) => upsertMessage(current, res.message));
        }
      }
      setDraft("");
      inbox.reload();
    } catch (err) {
      setSendError(asError(err, "Could not send message."));
    } finally {
      setSending(false);
    }
  };

  const pickAttachment = (file: File | undefined) => {
    if (!file) return;
    try {
      validateUploadFile(file);
      setPendingFile(file);
      setSendError(null);
    } catch (err) {
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSendError(asError(err, "Invalid file."));
    }
  };

  const approveAgreement = async (agreementId: string) => {
    if (acting) return;
    setActing("approve");
    setSendError(null);
    try {
      await api(`/api/conversations/${selectedId}/agreement/${agreementId}/approve`, { method: "POST" });
      thread.reload();
      projects.reload();
      inbox.reload();
    } catch (err) {
      setSendError(asError(err, "Could not approve agreement."));
    } finally {
      setActing(null);
    }
  };

  const rejectAgreement = async (agreementId: string) => {
    if (acting) return;
    const reason = rejectReason.trim() || "Scope does not match.";
    setActing("reject");
    setSendError(null);
    try {
      await api(`/api/conversations/${selectedId}/agreement/${agreementId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setRejectReason("");
      thread.reload();
      inbox.reload();
    } catch (err) {
      setSendError(asError(err, "Could not reject agreement."));
    } finally {
      setActing(null);
    }
  };

  const fundEscrow = async () => {
    if (acting || !project) return;
    setActing("fund");
    setSendError(null);
    try {
      await fundProjectEscrow(project.id, { name: session?.user.name, email: session?.user.email });
      projects.reload();
      inbox.reload();
    } catch (err) {
      setSendError(asError(err, "Could not fund escrow."));
    } finally {
      setActing(null);
    }
  };

  const emitTyping = (isTyping: boolean) => {
    const socket = connectChatSocket();
    if (!socket?.connected || !selectedId) return;
    socket.emit("typing", { conversationId: selectedId, isTyping });
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <div className="hidden w-[260px] shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex h-12 items-center gap-2 border-b border-zinc-200 px-3">
          <div className="flex h-8 flex-1 items-center gap-2 rounded-[8px] border border-zinc-200 bg-zinc-100 px-2 text-[12px] text-zinc-500">
            Search
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {inbox.error ? <ErrorNote error={inbox.error} className="m-3" /> : null}
          {inbox.loading && conversations.length === 0 ? <p className="p-3 text-[12px] text-zinc-500">Loading chats…</p> : null}
          {!inbox.loading && conversations.length === 0 ? <p className="p-3 text-[12px] text-zinc-500">No conversations yet.</p> : null}
          {conversations.map((item) => {
            const peer = otherParticipant(item, session?.user.id);
            const active = selectedId === item.id;
            const unread = unreadFor(item, session?.user.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openConversation(item.id)}
                className={`flex w-full gap-2.5 border-b border-zinc-100 p-3 text-left hover:bg-zinc-50 ${active ? "bg-zinc-50" : ""}`}
              >
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                    {initials(peer?.name || "SW")}
                  </div>
                  {peer?.isOnline && <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-[13px] font-medium">
                    <span className="truncate">{peer?.name || "ShareWork"}</span>
                    <span className="text-[10px] text-zinc-400">{item.lastMessageAt ? formatDateTime(item.lastMessageAt) : ""}</span>
                  </div>
                  <p className="truncate text-[11px] text-zinc-500">{item.lastMessage || "No messages yet"}</p>
                </div>
                {unread > 0 && <span className="mt-1 h-fit rounded-full bg-zinc-900 px-1.5 text-[10px] font-bold text-white">{unread}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-[#FCFCFC]">
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-zinc-500">Select a conversation</div>
        ) : thread.loading && messages.length === 0 ? (
          <Loader label="Loading messages…" />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">{displayAvatar}</div>
                <div>
                  <p className="text-[13px] font-semibold">{displayName}</p>
                  <p className="text-[11px] text-zinc-500">{displayTitle}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {isProvider && !pendingAgreement && !project && (
                  <button type="button" onClick={() => setShowProposal(true)} className="h-8 rounded-[8px] border border-zinc-200 bg-white px-3 text-[11px] font-medium hover:bg-zinc-50">
                    Create Agreement
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-amber-200 bg-[#FEF3C7] px-4 py-2 text-[11px] text-amber-900">
              Anti-leakage: No contact sharing until escrow funded. Escrow locks money. Payment released only after approval.
            </div>

            <div className="flex-1 space-y-3 overflow-auto p-4">
              {thread.error ? <ErrorNote error={thread.error} /> : null}
              {sendError ? <ErrorNote error={sendError} /> : null}
              {messages.map((m) => {
                const own = m.senderId === session?.user.id;
                if (m.type === "system_agreement") {
                  const agreement = m.agreement;
                  return (
                    <div key={m.id} className="mx-auto max-w-[85%] rounded-[12px] border border-zinc-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold">Final Agreement • {agreement?.title}</span>
                        <span className="rounded px-2 py-0.5 text-[10px] text-white" style={{ background: agreement?.status === "approved" ? accent : "#111" }}>
                          {(agreement?.status || "pending").toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-500">Price:</span> ₹{agreement?.fixedPrice}
                        </div>
                        <div>
                          <span className="text-zinc-500">Timeline:</span> {agreement?.timelineDays} days
                        </div>
                        <div className="col-span-2">
                          <span className="text-zinc-500">Scope:</span> {agreement?.scope}
                        </div>
                      </div>
                      {isCustomer && agreement?.status === "pending" && (
                        <div className="mt-3 space-y-2">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reject reason (required to reject)"
                            className="h-8 w-full rounded-[8px] border border-zinc-200 px-2 text-[11px]"
                          />
                          <div className="flex gap-2">
                            <button type="button" disabled={acting !== null} onClick={() => void approveAgreement(m.id)} className="h-8 flex-1 rounded-[8px] text-[11px] font-medium text-white" style={{ background: accent }}>
                              {acting === "approve" ? "Approving…" : "Approve"}
                            </button>
                            <button type="button" disabled={acting !== null} onClick={() => void rejectAgreement(m.id)} className="h-8 flex-1 rounded-[8px] border border-zinc-200 text-[11px]">
                              {acting === "reject" ? "Rejecting…" : "Reject"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`flex gap-2 ${own ? "justify-end" : "justify-start"}`}>
                    {!own && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">{displayAvatar}</div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-[12px] px-3 py-2 text-[13px] ${own ? "rounded-tr-[2px] text-white" : "rounded-tl-[2px] border border-zinc-200 bg-white"}`}
                      style={own ? { background: accent } : undefined}
                    >
                      {m.content}
                      {m.file || m.fileUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            void openStoredFile(m.file ?? m.fileUrl ?? "").catch((err) =>
                              setSendError(asError(err, "Could not open attachment.")),
                            )
                          }
                          className={`mt-2 block text-left text-[12px] underline ${own ? "text-white" : "text-blue-700"}`}
                        >
                          {m.file?.originalName || m.fileName || "Download attachment"}
                        </button>
                      ) : null}
                    </div>
                    {own && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: accent }}>
                        Y
                      </div>
                    )}
                  </div>
                );
              })}

              {phase === "chat" && isProvider && !pendingAgreement && (
                <div className="flex justify-center">
                  <button type="button" onClick={() => setShowProposal(true)} className="mt-4 rounded-[8px] bg-zinc-900 px-4 py-2 text-[12px] font-medium text-white">
                    Draft Final Agreement
                  </button>
                </div>
              )}

              {lastDelivery && (phase === "delivered" || phase === "in_progress" || phase === "paid") && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">P</div>
                  <div className="max-w-[70%] rounded-[12px] rounded-tl-[2px] border border-zinc-200 bg-white px-3 py-2 text-[13px]">
                    <div className="font-medium">Deliverable submitted</div>
                    <div className="mt-1 text-[11px] text-zinc-600">{lastDelivery.message}</div>
                    <div className="mt-2 space-y-1">
                      {(lastDelivery.files ?? []).map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() =>
                            void openStoredFile(file).catch((err) => setSendError(asError(err, "Could not open file.")))
                          }
                          className="block text-left text-[11px] text-blue-700 underline"
                        >
                          {file.originalName || "Download file"}
                        </button>
                      ))}
                    </div>
                    {phase === "delivered" && isCustomer && (
                      <p className="mt-2 text-[11px] text-zinc-500">Open the project to approve, request a revision, or dispute.</p>
                    )}
                  </div>
                </div>
              )}

              {phase === "paid" && (
                <div className="mx-auto max-w-[70%] rounded-[12px] border border-green-200 bg-green-50 p-3 text-center">
                  <div className="text-[13px] font-semibold text-green-800">Delivery approved ✓</div>
                  <div className="mt-1 text-[11px] text-green-700">₹{price} work is complete. Payout ships with the payments phase.</div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={(e) => void send(e)} className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 bg-white p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.zip,application/pdf,application/zip"
                className="hidden"
                onChange={(e) => {
                  pickAttachment(e.target.files?.[0]);
                }}
              />
              {pendingFile ? (
                <div className="flex items-center justify-between rounded-[8px] border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-700">
                  <span className="truncate">{pendingFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="ml-2 text-zinc-500 hover:text-zinc-900"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
                  aria-label="Attach file"
                >
                  <Paperclip size={16} />
                </button>
                <input
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    emitTyping(Boolean(e.target.value.trim()));
                  }}
                  placeholder="Type message... (fixed price discussion only)"
                  className="h-9 flex-1 rounded-[8px] border border-zinc-200 px-3 text-[13px] outline-none focus:border-zinc-900"
                />
                <button
                  type="submit"
                  disabled={(!draft.trim() && !pendingFile) || sending}
                  className="flex h-9 w-9 items-center justify-center rounded-[8px] text-white disabled:opacity-50"
                  style={{ background: accent }}
                >
                  <Send size={14} />
                </button>
              </div>
              {sending && pendingFile ? <p className="text-[11px] text-zinc-500">Uploading attachment…</p> : null}
            </form>
          </>
        )}
      </div>

      <div className="hidden w-[300px] shrink-0 flex-col border-l border-zinc-200 bg-white lg:flex">
        <div className="border-b border-zinc-200 p-4">
          <div className="text-[13px] font-semibold">Project Details</div>
          <div className="mt-3 space-y-2 text-[12px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Fixed Price</span>
              <span className="font-semibold">{compactInr(price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Escrow</span>
              <span className="rounded px-2 py-0.5 text-[10px] text-white" style={{ background: project?.escrow?.status === "locked" || project?.escrow?.status === "released" ? accent : "#aaa" }}>
                {project?.escrow?.status === "locked" ? "Funded Locked" : project?.escrow?.status === "released" ? "Released" : "Not funded"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Timeline</span>
              <span>{timeline}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Revisions</span>
              <span>{revisions}</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] leading-relaxed text-zinc-600">{scope}</div>
          <div className="mt-4 space-y-2">
            {isProvider && phase === "chat" && (
              <button type="button" onClick={() => setShowProposal(true)} className="h-9 w-full rounded-[8px] text-[12px] font-medium text-white" style={{ background: accent }}>
                Create Final Agreement
              </button>
            )}
            {isCustomer && pendingAgreement && (
              <div className="rounded-[8px] border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-600">Approve or reject the agreement in the thread. That creates the project.</div>
            )}
            {isCustomer && project?.status === "agreement_pending" && (
              <button type="button" disabled={acting !== null} onClick={() => void fundEscrow()} className="h-9 w-full rounded-[8px] text-[12px] font-medium text-white disabled:opacity-60" style={{ background: accent }}>
                {acting === "fund" ? "Opening checkout…" : "Fund escrow"}
              </button>
            )}
            {project && (
              <button type="button" onClick={() => spa.setView("projects", { projectId: project.id })} className="h-9 w-full rounded-[8px] text-[12px] font-medium text-white" style={{ background: accent }}>
                Open project
              </button>
            )}
            {phase === "in_progress" && isProvider && <div className="rounded-[8px] border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-600">Submit the deliverable from the project page.</div>}
            {phase === "in_progress" && isCustomer && <div className="rounded-[8px] border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-600">Waiting for delivery from provider.</div>}
          </div>
        </div>
        <div className="p-4">
          <div className="text-[12px] font-semibold">Deliverables</div>
          <div className="mt-2 text-[11px] leading-relaxed text-zinc-600">{deliverables}</div>
          <div className="mt-4 rounded-[8px] border border-zinc-200 bg-zinc-50 p-2.5 text-[11px]">
            <div className="font-medium">Fee Breakdown</div>
            <div className="mt-1 flex justify-between">
              <span>Fixed price</span>
              <span>₹{price}</span>
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

      {showProposal && isProvider && selectedId && (
        <AgreementModal
          conversationId={selectedId}
          onClose={() => setShowProposal(false)}
          onCreated={(message) => {
            setSocketMessages((current) => upsertMessage(current, message));
            inbox.reload();
          }}
        />
      )}
    </div>
  );
}
