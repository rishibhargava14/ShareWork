"use client";

import { io, type Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/token";

let socket: Socket | null = null;

export function getChatSocket(): Socket | null {
  return socket;
}

export function connectChatSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) {
    disconnectChatSocket();
    return null;
  }

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(getApiBaseUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
  });

  socket.on("connect_error", () => {
    /* REST remains the source of truth. UI must not crash. */
  });

  return socket;
}

export function disconnectChatSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export function joinConversationRoom(conversationId: string): void {
  if (!socket?.connected || !conversationId) return;
  socket.emit("join_conversation", { conversationId });
}
