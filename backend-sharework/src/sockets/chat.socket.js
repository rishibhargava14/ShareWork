import User from '../models/User.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { ONLINE_STATUSES } from '../constants/schemaEnums.js';
import * as conversationService from '../services/conversation.service.js';
import * as providerService from '../services/provider.service.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { maskAllLeakage } from '../utils/leakageDetection.js';
import { objectIdSchema } from '../validations/user.validation.js';

export const CHAT_CLIENT_EVENTS = Object.freeze([
  'join_conversation',
  'send_message',
  'typing',
  'update_online_status',
]);

export const CHAT_SERVER_EVENTS = Object.freeze([
  'new_message',
  'agreement_created',
  'escrow_funded',
  'deliverable_submitted',
  'payment_released',
  'online_status',
  'typing',
]);

export const parseConversationId = (payload) => {
  const conversationId = typeof payload === 'string' || payload == null ? payload : payload.conversationId;
  const parsed = objectIdSchema.safeParse(conversationId);

  if (!parsed.success) {
    throw new AppError('Invalid identifier', HTTP_STATUS.BAD_REQUEST);
  }

  return parsed.data;
};

export const toSafeSocketError = (error) => ({
  message: maskAllLeakage(error?.message || 'Request failed'),
});

const authenticateSocket = async (socket, next) => {
  const headerToken = socket.handshake.headers?.authorization;
  const authToken = socket.handshake.auth?.token;
  const token =
    authToken ||
    (typeof headerToken === 'string' && headerToken.startsWith('Bearer ')
      ? headerToken.slice(7)
      : null);

  if (!token) {
    next(new Error('Authentication required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (!payload?.userId) {
      next(new Error('Authentication required'));
      return;
    }

    const user = await User.findById(payload.userId);
    if (!user || user.isBanned) {
      next(new Error('Authentication required'));
      return;
    }

    if (!user.isVerified) {
      next(new Error('Email verification required'));
      return;
    }

    socket.userId = String(user._id);
    socket.userRole = user.role;
    next();
  } catch {
    next(new Error('Authentication required'));
  }
};

export const handleJoinConversation = async (socket, payload) => {
  const conversationId = parseConversationId(payload);
  await conversationService.getConversationForParticipant(conversationId, socket.userId);
  socket.join(String(conversationId));
  return conversationId;
};

export const handleSendMessage = async (socket, payload = {}) => {
  const conversationId = parseConversationId(payload);
  if (payload.type === 'file' || payload.fileUrl) {
    throw new AppError('File messages must be uploaded over HTTP', HTTP_STATUS.BAD_REQUEST);
  }

  return conversationService.sendMessage(socket.userId, conversationId, {
    type: payload.type ?? 'text',
    content: payload.content,
  });
};

export const handleTyping = async (socket, payload = {}) => {
  const conversationId = parseConversationId(payload);
  await conversationService.getConversationForParticipant(conversationId, socket.userId);
  return {
    conversationId,
    userId: socket.userId,
    isTyping: Boolean(payload.isTyping),
  };
};

export const handleUpdateOnlineStatus = async (socket, payload = {}) => {
  const status = payload.status ?? payload.onlineStatus;

  if (!ONLINE_STATUSES.includes(status)) {
    throw new AppError('Invalid online status', HTTP_STATUS.BAD_REQUEST);
  }

  if (socket.userRole !== 'provider') {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }

  return providerService.toggleOnlineStatus(socket.userId, { onlineStatus: status });
};

export const registerChatHandlers = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    socket.on('join_conversation', async (payload) => {
      try {
        await handleJoinConversation(socket, payload);
      } catch (error) {
        socket.emit('error', toSafeSocketError(error));
      }
    });

    socket.on('send_message', async (payload = {}) => {
      try {
        await handleSendMessage(socket, payload);
      } catch (error) {
        socket.emit('error', toSafeSocketError(error));
      }
    });

    socket.on('typing', async (payload = {}) => {
      try {
        const typing = await handleTyping(socket, payload);
        socket.to(typing.conversationId).emit('typing', {
          userId: typing.userId,
          isTyping: typing.isTyping,
        });
      } catch (error) {
        socket.emit('error', toSafeSocketError(error));
      }
    });

    socket.on('update_online_status', async (payload = {}) => {
      try {
        const result = await handleUpdateOnlineStatus(socket, payload);
        io.emit('online_status', {
          userId: socket.userId,
          status: result.onlineStatus,
        });
      } catch (error) {
        socket.emit('error', toSafeSocketError(error));
      }
    });

    socket.on('disconnect', async () => {
      if (socket.userRole !== 'provider' || !socket.userId) {
        return;
      }

      try {
        await providerService.toggleOnlineStatus(socket.userId, { onlineStatus: 'offline' });
        io.emit('online_status', { userId: socket.userId, status: 'offline' });
      } catch {
        io.emit('online_status', { userId: socket.userId, status: 'offline' });
      }
    });
  });
};
