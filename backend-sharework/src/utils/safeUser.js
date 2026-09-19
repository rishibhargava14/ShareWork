import { toPublicFileRef } from '../services/file.service.js';

export const toSafeUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  isVerified: user.isVerified,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const toPublicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  avatar: user.avatar,
  role: user.role,
  isVerified: user.isVerified,
  isOnline: user.isOnline,
});

export const toSafeCustomerProfile = (profile) => {
  if (!profile) {
    return null;
  }

  return {
    id: String(profile._id),
    userId: String(profile.userId),
    companyName: profile.companyName ?? '',
    gstNumber: profile.gstNumber ?? '',
    bio: profile.bio ?? '',
    totalSpent: profile.totalSpent ?? 0,
    projectsCount: profile.projectsCount ?? 0,
    preferredCategories: profile.preferredCategories ?? [],
    country: profile.country ?? '',
  };
};

export const toPublicCustomerProfile = (profile) => {
  if (!profile) {
    return null;
  }

  return {
    bio: profile.bio ?? '',
    companyName: profile.companyName ?? '',
  };
};

export const toSafeProviderProfile = (profile) => {
  if (!profile) {
    return null;
  }

  return {
    id: String(profile._id),
    userId: String(profile.userId),
    title: profile.title,
    bio: profile.bio ?? '',
    skills: profile.skills ?? [],
    categories: profile.categories ?? [],
    experienceLevel: profile.experienceLevel,
    languages: profile.languages ?? [],
    portfolio: profile.portfolio ?? [],
    rating: profile.rating ?? 0,
    reviewsCount: profile.reviewsCount ?? 0,
    totalEarnings: profile.totalEarnings ?? 0,
    completedProjects: profile.completedProjects ?? 0,
    responseTime: profile.responseTime ?? 0,
    startingPrice: profile.startingPrice,
    isAvailable: profile.isAvailable,
    availability: profile.availability ?? null,
  };
};

export const toPublicProviderProfile = (profile) => {
  if (!profile) {
    return null;
  }

  return {
    title: profile.title,
    bio: profile.bio ?? '',
    skills: profile.skills ?? [],
    categories: profile.categories ?? [],
    experienceLevel: profile.experienceLevel,
    languages: profile.languages ?? [],
    portfolio: profile.portfolio ?? [],
    rating: profile.rating ?? 0,
    reviewsCount: profile.reviewsCount ?? 0,
    completedProjects: profile.completedProjects ?? 0,
    responseTime: profile.responseTime ?? 0,
    startingPrice: profile.startingPrice,
    isAvailable: profile.isAvailable,
    onlineStatus: profile.availability?.onlineStatus ?? 'offline',
  };
};

export const toSafeTransaction = (transaction) => {
  if (!transaction) {
    return null;
  }

  return {
    id: String(transaction._id),
    projectId: transaction.projectId ? String(transaction.projectId) : null,
    userId: String(transaction.userId),
    type: transaction.type,
    amount: transaction.amount,
    fee: transaction.fee ?? 0,
    gst: transaction.gst ?? 0,
    netAmount: transaction.netAmount,
    status: transaction.status,
    upiId: transaction.upiId ?? null,
    paymentGateway: transaction.paymentGateway ?? null,
    gatewayTransactionId: transaction.gatewayTransactionId ?? null,
    escrowStatus: transaction.escrowStatus ?? null,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
};

export const toSafeGig = (gig) => ({
  id: String(gig._id),
  providerId: String(gig.providerId),
  title: gig.title,
  category: gig.category,
  description: gig.description,
  portfolioImages: (gig.portfolioImages ?? []).map(toPublicFileRef).filter(Boolean),
  packages: gig.packages ?? [],
  faqs: gig.faqs ?? [],
  requirements: gig.requirements ?? '',
  isActive: gig.isActive,
  views: gig.views ?? 0,
  orders: gig.orders ?? 0,
  rating: gig.rating ?? 0,
  reviewsCount: gig.reviewsCount ?? 0,
  createdAt: gig.createdAt,
  updatedAt: gig.updatedAt,
});

const toUnreadCount = (unreadCount) => {
  if (!unreadCount) {
    return {};
  }

  if (unreadCount instanceof Map) {
    return Object.fromEntries(unreadCount);
  }

  return { ...unreadCount };
};

export const toSafeConversation = (conversation) => {
  if (!conversation) {
    return null;
  }

  const participants = (conversation.participants ?? []).map((participant) => {
    if (participant && typeof participant === 'object' && participant.name !== undefined) {
      return toPublicUser(participant);
    }

    return String(participant._id ?? participant);
  });

  return {
    id: String(conversation._id),
    participants,
    gigId: conversation.gigId ? String(conversation.gigId) : null,
    lastMessage: conversation.lastMessage ?? '',
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: toUnreadCount(conversation.unreadCount),
    escrowStatus: conversation.escrowStatus ?? 'none',
    isBlocked: Boolean(conversation.isBlocked),
    blockedReason: conversation.blockedReason ?? '',
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

export const toSafeMessage = (message) => {
  if (!message) {
    return null;
  }

  const file = message.fileId
    ? toPublicFileRef({
        fileId: message.fileId,
        originalName: message.fileName,
        mimeType: message.fileMimeType,
        size: message.fileSize,
      })
    : null;

  return {
    id: String(message._id),
    conversationId: String(message.conversationId),
    senderId: String(message.senderId?._id ?? message.senderId),
    type: message.type,
    content: message.content,
    fileUrl: file?.url ?? null,
    fileName: message.fileName ?? null,
    file,
    agreement: message.agreementData ?? null,
    deliverable: message.deliverableData
      ? {
          ...message.deliverableData,
          files: (message.deliverableData.files ?? []).map(toPublicFileRef).filter(Boolean),
        }
      : null,
    escrow: message.escrowData ?? null,
    isMasked: Boolean(message.isMasked),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

export const toSafeProject = (project) => {
  if (!project) {
    return null;
  }

  return {
    id: String(project._id),
    customerId: String(project.customerId),
    providerId: String(project.providerId),
    gigId: project.gigId ? String(project.gigId) : null,
    conversationId: String(project.conversationId),
    title: project.title,
    scope: project.scope,
    deliverables: project.deliverables ?? [],
    deliverablesHistory: (project.deliverablesHistory ?? []).map((entry) => ({
      files: (entry.files ?? []).map(toPublicFileRef).filter(Boolean),
      message: entry.message,
      submittedAt: entry.submittedAt,
      status: entry.status,
    })),
    fixedPrice: project.fixedPrice,
    timelineDays: project.timelineDays,
    revisionsAllowed: project.revisionsAllowed ?? 0,
    revisionsUsed: project.revisionsUsed ?? 0,
    status: project.status,
    progress: project.progress ?? 0,
    deadline: project.deadline,
    approvedAt: project.approvedAt ?? null,
    completedAt: project.completedAt ?? null,
    escrow: {
      amount: project.escrow?.amount ?? project.fixedPrice,
      fee: project.escrow?.fee ?? null,
      gst: project.escrow?.gst ?? null,
      net: project.escrow?.net ?? null,
      status: project.escrow?.status ?? 'pending',
      fundedAt: project.escrow?.fundedAt ?? null,
      releasedAt: project.escrow?.releasedAt ?? null,
    },
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
};

export const toSafeProjectHandoff = toSafeProject;

export const toSafeDispute = (dispute) => {
  if (!dispute) {
    return null;
  }

  return {
    id: String(dispute._id),
    projectId: String(dispute.projectId),
    raisedBy: String(dispute.raisedBy),
    reason: dispute.reason,
    description: dispute.description,
    status: dispute.status,
    resolution: dispute.resolution ?? '',
    createdAt: dispute.createdAt,
    updatedAt: dispute.updatedAt,
  };
};

export const toSafeReview = (review) => {
  if (!review) {
    return null;
  }

  return {
    id: String(review._id),
    projectId: String(review.projectId),
    customerId: String(review.customerId),
    providerId: String(review.providerId),
    rating: review.rating,
    comment: review.comment ?? '',
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
};

export const toAdminUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar ?? '',
    isVerified: Boolean(user.isVerified),
    isOnline: Boolean(user.isOnline),
    isBanned: Boolean(user.isBanned),
    bannedReason: user.bannedReason ?? '',
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const toAdminEscrow = (escrow) => {
  if (!escrow) {
    return null;
  }

  return {
    id: String(escrow._id),
    projectId: String(escrow.projectId),
    customerId: String(escrow.customerId),
    providerId: String(escrow.providerId),
    amount: escrow.amount,
    fee: escrow.fee ?? null,
    gst: escrow.gst ?? null,
    net: escrow.net ?? null,
    status: escrow.status,
    lockedAt: escrow.lockedAt ?? null,
    releaseAt: escrow.releaseAt ?? null,
    disputeId: escrow.disputeId ? String(escrow.disputeId) : null,
    createdAt: escrow.createdAt,
    updatedAt: escrow.updatedAt,
  };
};

export const toAdminLeakageLog = (log) => {
  if (!log) {
    return null;
  }

  return {
    id: String(log._id),
    conversationId: String(log.conversationId),
    senderId: log.senderId ? String(log.senderId) : null,
    detectedType: log.detectedType ?? null,
    maskedContent: log.maskedContent ?? '',
    action: log.action,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
};

export const toAdminDispute = (dispute) => {
  if (!dispute) {
    return null;
  }

  return {
    id: String(dispute._id),
    projectId: String(dispute.projectId),
    raisedBy: String(dispute.raisedBy),
    reason: dispute.reason,
    description: dispute.description,
    status: dispute.status,
    resolution: dispute.resolution ?? '',
    createdAt: dispute.createdAt,
    updatedAt: dispute.updatedAt,
  };
};

export const toDiscoveryProvider = (profile, user) => ({
  id: String(user._id),
  name: user.name,
  avatar: user.avatar,
  isVerified: user.isVerified,
  title: profile.title,
  bio: profile.bio ?? '',
  skills: profile.skills ?? [],
  categories: profile.categories ?? [],
  rating: profile.rating ?? 0,
  reviewsCount: profile.reviewsCount ?? 0,
  startingPrice: profile.startingPrice,
  onlineStatus: profile.availability?.onlineStatus ?? 'offline',
});

export const toSafeRequirement = (requirement) => {
  if (!requirement) {
    return null;
  }

  return {
    id: String(requirement._id),
    customerId: String(requirement.customerId),
    title: requirement.title,
    description: requirement.description,
    category: requirement.category,
    budget: requirement.budget,
    deadline: requirement.deadline,
    skills: requirement.skills ?? [],
    status: requirement.status,
    createdAt: requirement.createdAt,
    updatedAt: requirement.updatedAt,
  };
};
