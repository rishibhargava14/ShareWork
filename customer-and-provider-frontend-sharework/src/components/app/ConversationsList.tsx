"use client";

import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { useSession } from "@/components/session/use-session";
import { useSpaNav } from "@/components/app/SpaNav";
import { otherParticipant, unreadFor } from "@/lib/chat";
import { ErrorNote, Loader } from "@/components/app/ui";
import { initials, type ExpressConversation } from "@/lib/express";
import { formatDateTime } from "@/lib/constants";

export default function ConversationsList() {
  const spa = useSpaNav();
  const session = useSession();
  const inbox = useAsync<{ conversations: ExpressConversation[] }>(() => api("/api/conversations"), []);
  const conversations = inbox.data?.conversations ?? [];

  if (inbox.loading && conversations.length === 0) return <Loader label="Loading conversations…" />;
  if (inbox.error && conversations.length === 0) return <ErrorNote error={inbox.error} />;

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <div className="flex w-full max-w-[260px] shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="flex h-12 items-center border-b border-zinc-200 px-3 text-[13px] font-medium">Messages</div>
        <div className="flex-1 overflow-auto">
          {conversations.length === 0 ? (
            <p className="p-3 text-[12px] text-zinc-500">No conversations yet.</p>
          ) : (
            conversations.map((item) => {
              const other = otherParticipant(item, session?.user.id);
              const unread = unreadFor(item, session?.user.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => spa.setView("messages", { inboxName: item.id })}
                  className="flex w-full gap-2.5 border-b border-zinc-100 p-3 text-left hover:bg-zinc-50"
                >
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                      {initials(other?.name || "SW")}
                    </div>
                    {other?.isOnline ? (
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-[13px] font-medium">
                      <span className="truncate">{other?.name || "Conversation"}</span>
                      <span className="text-[10px] text-zinc-400">
                        {item.lastMessageAt ? formatDateTime(item.lastMessageAt) : ""}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-zinc-500">{item.lastMessage || "No messages yet"}</p>
                  </div>
                  {unread > 0 ? (
                    <span className="mt-1 h-fit rounded-full bg-zinc-900 px-1.5 text-[10px] font-bold text-white">{unread}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
      <div className="hidden flex-1 items-center justify-center text-[13px] text-zinc-400 lg:flex">
        Select a conversation
      </div>
    </div>
  );
}
