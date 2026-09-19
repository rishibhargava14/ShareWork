import Conversation from '../models/Conversation.js';
import LeakageLog from '../models/LeakageLog.js';
import User from '../models/User.js';
import { detectLeakage } from '../utils/leakageDetection.js';

const CONTACT_TYPES = new Set(['phone', 'email', 'upi']);
const AUTO_BAN_TYPES = new Set(['phone', 'email']);
const AUTO_BAN_THRESHOLD = 3;

export const inspectMessageContent = (content) => detectLeakage(content);

export const recordLeakage = async ({
  conversationId,
  senderId,
  detectedType,
  content,
  maskedContent,
  action,
}) => {
  await LeakageLog.create({
    conversationId,
    senderId,
    detectedType,
    content,
    maskedContent,
    action,
  });
};

export const resolveLeakageAction = (detectedType) =>
  CONTACT_TYPES.has(detectedType) ? 'blocked' : 'masked';

const applyAutoBan = async (senderId, detectedType) => {
  if (!senderId || !AUTO_BAN_TYPES.has(detectedType)) {
    return false;
  }

  const attempts = await LeakageLog.countDocuments({
    senderId,
    detectedType: { $in: [...AUTO_BAN_TYPES] },
  });

  if (attempts < AUTO_BAN_THRESHOLD) {
    return false;
  }

  await User.findByIdAndUpdate(senderId, {
    isBanned: true,
    bannedReason: 'Repeated leakage of contact details',
  });

  return true;
};

export const applyContactLeakagePolicy = async ({ conversationId, senderId, content }) => {
  const leakage = inspectMessageContent(content);
  if (!leakage || !CONTACT_TYPES.has(leakage.detectedType)) {
    return null;
  }

  await recordLeakage({
    conversationId,
    senderId,
    detectedType: leakage.detectedType,
    content,
    maskedContent: leakage.maskedContent,
    action: 'blocked',
  });

  if (conversationId) {
    await Conversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          isBlocked: true,
          blockedReason: `Sharing ${leakage.detectedType} is not allowed`,
        },
      },
    );
  }

  await applyAutoBan(senderId, leakage.detectedType);

  return {
    blocked: true,
    detectedType: leakage.detectedType,
    maskedContent: leakage.maskedContent,
  };
};
