import { Server } from 'socket.io';
import { corsOrigins } from './env.js';
import { getIoOrNull, setIo } from './socketRegistry.js';
import { registerChatHandlers } from '../sockets/chat.socket.js';

export { emitToConversation, getIo, getIoOrNull } from './socketRegistry.js';

export const initSocket = (httpServer) => {
  const existing = getIoOrNull();
  if (existing) {
    return existing;
  }

  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  setIo(io);
  registerChatHandlers(io);
  return io;
};

export const closeSocket = () =>
  new Promise((resolve) => {
    const io = getIoOrNull();
    if (!io) {
      resolve();
      return;
    }

    try {
      io.disconnectSockets(true);
    } catch {
      // Disconnect must not throw during shutdown.
    }

    try {
      io.removeAllListeners();
      io.engine?.close();
    } catch {
      // Engine close must not throw during shutdown.
    }

    setIo(undefined);
    resolve();
  });
