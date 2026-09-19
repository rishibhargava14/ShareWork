import { api } from "@/lib/api";
import type { ExpressConversation } from "@/lib/express";

export async function startConversation(providerId: string, gigId?: string) {
  return api<{ conversation: ExpressConversation }>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      providerId,
      ...(gigId ? { gigId } : {}),
    }),
  });
}

export function otherParticipant(conversation: ExpressConversation | null | undefined, userId?: string) {
  const people = conversation?.participants ?? [];
  return people.find((p) => p.id && p.id !== userId) ?? people[0] ?? null;
}

export function unreadFor(conversation: ExpressConversation, userId?: string): number {
  if (!userId) return 0;
  return Number(conversation.unreadCount?.[userId] ?? 0);
}
