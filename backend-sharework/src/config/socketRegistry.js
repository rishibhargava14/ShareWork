let io;

export const setIo = (instance) => {
  io = instance;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }

  return io;
};

export const getIoOrNull = () => io ?? null;

export const emitToConversation = (conversationId, event, payload) => {
  if (!io || !conversationId) {
    return;
  }

  io.to(String(conversationId)).emit(event, payload);
};
