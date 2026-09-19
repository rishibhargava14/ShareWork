import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Gig from '../models/Gig.js';
import Message from '../models/Message.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { emitToConversation } from '../config/socketRegistry.js';
import { AppError } from '../utils/AppError.js';
import {
  toPublicUser,
  toSafeConversation,
  toSafeMessage,
  toSafeProjectHandoff,
} from '../utils/safeUser.js';
import { persistUploads } from './file.service.js';
import {
  applyContactLeakagePolicy,
  inspectMessageContent,
  recordLeakage,
  resolveLeakageAction,
} from './leakage.service.js';
import { notifyUsers } from './notification.service.js';
import { sendMessageSchema } from '../validations/conversation.validation.js';

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const participantIds = (conversation) =>
  (conversation.participants ?? []).map((item) => String(item._id ?? item));

const assertParticipant = (conversation, userId) => {
  if (!participantIds(conversation).includes(String(userId))) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }
};

const loadConversation = async (conversationId) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new AppError('Conversation not found', HTTP_STATUS.NOT_FOUND);
  }

  return conversation;
};

export const getConversationForParticipant = async (conversationId, userId) => {
  const conversation = await loadConversation(conversationId);
  assertParticipant(conversation, userId);
  return conversation;
};

const findExistingConversation = async (customerId, providerId, gigId) => {
  const query = {
    participants: { $all: [toObjectId(customerId), toObjectId(providerId)], $size: 2 },
  };

  if (gigId) {
    query.gigId = toObjectId(gigId);
  } else {
    query.$or = [{ gigId: { $exists: false } }, { gigId: null }];
  }

  return Conversation.findOne(query);
};

const otherParticipantIds = (conversation, userId) =>
  participantIds(conversation).filter((id) => id !== String(userId));

const incrementUnread = (conversationId, recipientIds) => {
  if (recipientIds.length === 0) {
    return {};
  }

  const inc = {};
  for (const id of recipientIds) {
    inc[`unreadCount.${id}`] = 1;
  }

  return Conversation.updateOne({ _id: conversationId }, { $inc: inc });
};

export const listConversations = async (userId) => {
  const conversations = await Conversation.find({ participants: toObjectId(userId) })
    .populate({ path: 'participants', select: 'name avatar role isVerified isOnline' })
    .sort({ lastMessageAt: -1, _id: -1 })
    .lean();

  return {
    conversations: conversations.map(toSafeConversation),
  };
};

export const createConversation = async (requester, { providerId, gigId }) => {
  if (requester.role !== 'customer') {
    throw new AppError('Only a customer can start a conversation', HTTP_STATUS.FORBIDDEN);
  }

  if (String(requester.id) === String(providerId)) {
    throw new AppError('Invalid provider', HTTP_STATUS.BAD_REQUEST);
  }

  const provider = await User.findById(providerId);

  if (!provider || provider.role !== 'provider' || provider.isBanned) {
    throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND);
  }

  if (gigId) {
    const gig = await Gig.findById(gigId);
    if (!gig || String(gig.providerId) !== String(providerId)) {
      throw new AppError('Gig does not belong to this provider', HTTP_STATUS.BAD_REQUEST);
    }
  }

  const existing = await findExistingConversation(requester.id, providerId, gigId);
  if (existing) {
    const populated = await Conversation.findById(existing._id)
      .populate({ path: 'participants', select: 'name avatar role isVerified isOnline' })
      .lean();
    return { conversation: toSafeConversation(populated) };
  }

  const created = await Conversation.create({
    participants: [requester.id, providerId],
    ...(gigId ? { gigId } : {}),
    lastMessageAt: new Date(),
    unreadCount: {},
  });

  const populated = await Conversation.findById(created._id)
    .populate({ path: 'participants', select: 'name avatar role isVerified isOnline' })
    .lean();

  return { conversation: toSafeConversation(populated) };
};

export const listMessages = async (userId, conversationId, { page = 1, limit = 50 } = {}) => {
  await getConversationForParticipant(conversationId, userId);

  const filter = { conversationId: toObjectId(conversationId) };
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find(filter).sort({ createdAt: 1, _id: 1 }).skip(skip).limit(limit).lean(),
    Message.countDocuments(filter),
  ]);

  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { [`unreadCount.${userId}`]: 0 } },
  );

  return {
    messages: messages.map(toSafeMessage),
    page,
    total,
  };
};

export const sendMessage = async (userId, conversationId, payload, uploadedFile) => {
  const { type, content } = sendMessageSchema.parse(payload);
  const conversation = await getConversationForParticipant(conversationId, userId);

  if (conversation.isBlocked) {
    throw new AppError('Conversation is blocked', HTTP_STATUS.FORBIDDEN);
  }

  if (type === 'file' && !uploadedFile) {
    throw new AppError('File messages require an uploaded file', HTTP_STATUS.BAD_REQUEST);
  }

  if (type === 'text' && uploadedFile) {
    throw new AppError('Text messages cannot include a file', HTTP_STATUS.BAD_REQUEST);
  }

  let fileRef = null;
  if (uploadedFile) {
    const stored = await persistUploads({
      files: [uploadedFile],
      ownerId: userId,
      kind: 'attachment',
      conversationId: conversation._id,
    });
    fileRef = stored[0];
  }

  const blocked = await applyContactLeakagePolicy({
    conversationId,
    senderId: userId,
    content,
  });

  if (blocked) {
    throw new AppError(
      `Sharing ${blocked.detectedType} is not allowed. Keep transactions on ShareWork.`,
      HTTP_STATUS.BAD_REQUEST,
      {
        code: 'LEAKAGE_BLOCKED',
        detectedType: blocked.detectedType,
        maskedContent: blocked.maskedContent,
      },
    );
  }

  const leakage = inspectMessageContent(content);
  const fileFields = fileRef
    ? {
        fileId: fileRef.fileId,
        fileName: fileRef.originalName,
        fileMimeType: fileRef.mimeType,
        fileSize: fileRef.size,
      }
    : {};

  if (leakage) {
    const action = resolveLeakageAction(leakage.detectedType);
    await recordLeakage({
      conversationId,
      senderId: userId,
      detectedType: leakage.detectedType,
      content,
      maskedContent: leakage.maskedContent,
      action,
    });

    if (action === 'blocked') {
      conversation.isBlocked = true;
      conversation.blockedReason = `Sharing ${leakage.detectedType} is not allowed`;
      await conversation.save();
      throw new AppError(
        `Sharing ${leakage.detectedType} is not allowed. Keep transactions on ShareWork.`,
        HTTP_STATUS.BAD_REQUEST,
        {
          code: 'LEAKAGE_BLOCKED',
          detectedType: leakage.detectedType,
          maskedContent: leakage.maskedContent,
        },
      );
    }

    const message = await Message.create({
      conversationId,
      senderId: userId,
      type,
      content: leakage.maskedContent,
      isMasked: true,
      ...fileFields,
    });

    conversation.lastMessage = leakage.maskedContent;
    conversation.lastMessageAt = new Date();
    await conversation.save();
    await incrementUnread(conversation._id, otherParticipantIds(conversation, userId));

    const safeMessage = toSafeMessage(message);
    emitToConversation(conversationId, 'new_message', safeMessage);
    return { message: safeMessage };
  }

  const message = await Message.create({
    conversationId,
    senderId: userId,
    type,
    content,
    ...fileFields,
  });

  conversation.lastMessage = content;
  conversation.lastMessageAt = new Date();
  await conversation.save();
  await incrementUnread(conversation._id, otherParticipantIds(conversation, userId));

  const safeMessage = toSafeMessage(message);
  emitToConversation(conversationId, 'new_message', safeMessage);
  return { message: safeMessage };
};

export const createAgreement = async (user, conversationId, payload) => {
  if (user.role !== 'provider') {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }

  const conversation = await getConversationForParticipant(conversationId, user.id);

  if (conversation.isBlocked) {
    throw new AppError('Conversation is blocked', HTTP_STATUS.FORBIDDEN);
  }

  const message = await Message.create({
    conversationId,
    senderId: user.id,
    type: 'system_agreement',
    content: `Agreement: ${payload.title} - ₹${payload.fixedPrice}`,
    agreementData: {
      title: payload.title,
      scope: payload.scope,
      deliverables: payload.deliverables,
      fixedPrice: payload.fixedPrice,
      timelineDays: payload.timelineDays,
      revisions: payload.revisions,
      terms: payload.terms,
      status: 'pending',
    },
  });

  conversation.lastMessage = message.content;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  const safeMessage = toSafeMessage(message);
  emitToConversation(conversationId, 'agreement_created', safeMessage);
  await notifyUsers(otherParticipantIds(conversation, user.id), {
    type: 'agreement',
    title: 'New agreement',
    message: `Agreement proposed: ${payload.title}`,
    link: `/conversations/${conversationId}`,
  });
  return { message: safeMessage };
};

const loadAgreementMessage = async (conversationId, agreementId) => {
  const message = await Message.findById(agreementId);

  if (
    !message ||
    String(message.conversationId) !== String(conversationId) ||
    message.type !== 'system_agreement'
  ) {
    throw new AppError('Agreement not found', HTTP_STATUS.NOT_FOUND);
  }

  return message;
};

export const approveAgreement = async (user, conversationId, agreementId) => {
  if (user.role !== 'customer') {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }

  const conversation = await getConversationForParticipant(conversationId, user.id);
  const message = await loadAgreementMessage(conversationId, agreementId);

  if (message.agreementData?.status !== 'pending') {
    throw new AppError('Agreement is already finalized', HTTP_STATUS.BAD_REQUEST);
  }

  const providerId = otherParticipantIds(conversation, user.id)[0];
  if (!providerId || String(message.senderId) !== String(providerId)) {
    throw new AppError('Agreement not found', HTTP_STATUS.NOT_FOUND);
  }

  message.agreementData.status = 'approved';
  message.agreementData.approvedAt = new Date();
  await message.save();

  const timelineDays = message.agreementData.timelineDays;
  const project = await Project.create({
    customerId: user.id,
    providerId,
    gigId: conversation.gigId,
    conversationId,
    title: message.agreementData.title,
    scope: message.agreementData.scope,
    deliverables: message.agreementData.deliverables,
    fixedPrice: message.agreementData.fixedPrice,
    timelineDays,
    revisionsAllowed: message.agreementData.revisions,
    status: 'agreement_pending',
    deadline: new Date(Date.now() + timelineDays * 24 * 60 * 60 * 1000),
    escrow: {
      amount: message.agreementData.fixedPrice,
      status: 'pending',
    },
  });

  conversation.escrowStatus = 'pending';
  await conversation.save();

  const safeMessage = toSafeMessage(message);
  emitToConversation(conversationId, 'new_message', safeMessage);
  await notifyUsers([providerId, user.id], {
    type: 'agreement',
    title: 'Project created',
    message: `Agreement approved: ${project.title}`,
    link: `/projects/${project._id}`,
  });

  return {
    project: toSafeProjectHandoff(project),
    message: safeMessage,
  };
};

export const rejectAgreement = async (user, conversationId, agreementId, { reason }) => {
  if (user.role !== 'customer') {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }

  const conversation = await getConversationForParticipant(conversationId, user.id);
  const message = await loadAgreementMessage(conversationId, agreementId);

  if (message.agreementData?.status !== 'pending') {
    throw new AppError('Agreement is already finalized', HTTP_STATUS.BAD_REQUEST);
  }

  message.agreementData.status = 'rejected';
  message.agreementData.rejectedAt = new Date();
  await message.save();

  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessage: `Agreement rejected: ${reason}`,
        lastMessageAt: new Date(),
      },
    },
  );

  const safeMessage = toSafeMessage(message);
  emitToConversation(conversationId, 'new_message', safeMessage);
  await notifyUsers(otherParticipantIds(conversation, user.id), {
    type: 'agreement',
    title: 'Agreement rejected',
    message: reason,
    link: `/conversations/${conversationId}`,
  });

  return {
    message: safeMessage,
    reason,
  };
};

export const toPublicParticipant = toPublicUser;
