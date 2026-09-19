import mongoose from 'mongoose';
import Dispute from '../models/Dispute.js';
import Escrow from '../models/Escrow.js';
import Project from '../models/Project.js';
import ProviderProfile from '../models/ProviderProfile.js';
import Review from '../models/Review.js';
import Transaction from '../models/Transaction.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { emitToConversation } from '../config/socketRegistry.js';
import { AppError } from '../utils/AppError.js';
import { toSafeDispute, toSafeProject, toSafeReview, toSafeTransaction } from '../utils/safeUser.js';
import { lockEscrow, releaseEscrow } from './escrow.service.js';
import { notifyUsers } from './notification.service.js';
import { createOrder } from './payment.service.js';
import { persistUploads } from './file.service.js';

const DISPUTABLE_STATUSES = Object.freeze(['in_progress', 'delivered']);

const assertCustomer = (project, userId) => {
  if (String(project.customerId) !== String(userId)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }
};

const assertProvider = (project, userId) => {
  if (String(project.providerId) !== String(userId)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }
};

const assertParticipant = (project, userId) => {
  if (
    String(project.customerId) !== String(userId) &&
    String(project.providerId) !== String(userId)
  ) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }
};

export const getProjectForParticipant = async (projectId, userId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new AppError('Project not found', HTTP_STATUS.NOT_FOUND);
  }

  assertParticipant(project, userId);
  return project;
};

export const listProjects = async (userId, { role, status }) => {
  const filter = role === 'provider' ? { providerId: userId } : { customerId: userId };

  if (status) {
    filter.status = status;
  }

  const projects = await Project.find(filter).sort({ updatedAt: -1, _id: -1 }).lean();

  return {
    projects: projects.map(toSafeProject),
  };
};

export const getProject = async (userId, projectId) => {
  const project = await getProjectForParticipant(projectId, userId);
  const review = await Review.findOne({ projectId: project._id }).lean();
  return {
    project: toSafeProject(project),
    review: toSafeReview(review),
  };
};

export const fundProject = async (userId, projectId) => createOrder(userId, projectId);

const SUBMITTABLE_PROJECT_STATUSES = Object.freeze([
  'agreement_pending',
  'escrow_funded',
  'in_progress',
]);

export const submitDeliverable = async (userId, projectId, { message }, files = []) => {
  const project = await getProjectForParticipant(projectId, userId);
  assertProvider(project, userId);

  const status = String(project.status || '');
  // Razorpay escrow lock is Batch 2. Delivery is allowed after agreement approval.
  if (!SUBMITTABLE_PROJECT_STATUSES.includes(status)) {
    throw new AppError(
      `Deliverable can only be submitted while in progress (status: ${status})`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  if (project.escrow?.status === 'released' || project.escrow?.status === 'refunded') {
    throw new AppError('Escrow is not available for submission', HTTP_STATUS.BAD_REQUEST);
  }

  const uploadList = Array.isArray(files) ? files : [];
  if (uploadList.length === 0) {
    throw new AppError('At least one deliverable file is required', HTTP_STATUS.BAD_REQUEST);
  }

  const storedFiles = await persistUploads({
    files: uploadList,
    ownerId: userId,
    kind: 'deliverable',
    projectId: project._id,
  });

  project.deliverablesHistory.push({
    files: storedFiles,
    message,
    submittedAt: new Date(),
    status: 'submitted',
  });
  project.status = 'delivered';
  await project.save();

  emitToConversation(project.conversationId, 'deliverable_submitted', {
    projectId: String(project._id),
    files: storedFiles.map((item) => String(item.fileId)),
  });

  await notifyUsers([project.customerId], {
    type: 'deliverable',
    title: 'Deliverable submitted',
    message: message,
    link: `/projects/${project._id}`,
  });

  return { project: toSafeProject(project) };
};

export const approveDeliverable = async (userId, projectId) => {
  const project = await getProjectForParticipant(projectId, userId);
  assertCustomer(project, userId);

  if (project.status !== 'delivered') {
    throw new AppError('Deliverable can only be approved after submission', HTTP_STATUS.BAD_REQUEST);
  }

  const last = project.deliverablesHistory[project.deliverablesHistory.length - 1];
  if (last) {
    last.status = 'approved';
  }
  project.approvedAt = new Date();
  await project.save();

  const escrow = await Escrow.findOne({ projectId });
  if (escrow?.status === 'locked') {
    const released = await releaseEscrow(projectId);
    return {
      project: toSafeProject(released.project),
      alreadyProcessed: released.alreadyProcessed,
    };
  }

  project.status = 'completed';
  project.completedAt = new Date();
  await project.save();
  return {
    project: toSafeProject(project),
    alreadyProcessed: false,
  };
};

export const requestRevision = async (userId, projectId, { message } = {}) => {
  const project = await getProjectForParticipant(projectId, userId);
  assertCustomer(project, userId);

  if (project.status !== 'delivered') {
    throw new AppError('Revision can only be requested after delivery', HTTP_STATUS.BAD_REQUEST);
  }

  if (project.revisionsUsed >= project.revisionsAllowed) {
    throw new AppError('Revision limit reached', HTTP_STATUS.BAD_REQUEST);
  }

  const last = project.deliverablesHistory[project.deliverablesHistory.length - 1];
  if (last) {
    last.status = 'rejected';
  }

  project.revisionsUsed += 1;
  project.status = 'in_progress';
  await project.save();

  await notifyUsers([project.providerId], {
    type: 'deliverable',
    title: 'Revision requested',
    message: message || 'Customer requested a revision.',
    link: `/projects/${project._id}`,
  });

  return { project: toSafeProject(project) };
};

export const listMyTransactions = async (userId) => {
  const transactions = await Transaction.find({ userId })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  return {
    transactions: transactions.map(toSafeTransaction),
  };
};

export const releaseProjectEscrow = async (userId, projectId) => {
  const project = await getProjectForParticipant(projectId, userId);
  assertCustomer(project, userId);
  const released = await releaseEscrow(projectId);
  return {
    project: toSafeProject(released.project),
    alreadyProcessed: released.alreadyProcessed,
  };
};

export const getEscrowForProject = async (projectId) => Escrow.findOne({ projectId });

export const createDispute = async (userId, projectId, { reason, description }) => {
  const project = await getProjectForParticipant(projectId, userId);

  const open = await Dispute.findOne({
    projectId,
    status: { $in: ['open', 'in_review'] },
  });
  if (open) {
    throw new AppError('An open dispute already exists', HTTP_STATUS.CONFLICT);
  }

  if (!DISPUTABLE_STATUSES.includes(project.status)) {
    throw new AppError('Project cannot be disputed in its current state', HTTP_STATUS.BAD_REQUEST);
  }

  const dispute = await Dispute.create({
    projectId,
    raisedBy: userId,
    reason,
    description,
    status: 'open',
  });

  project.status = 'disputed';
  await project.save();

  await Escrow.updateOne({ projectId }, { $set: { disputeId: dispute._id } });

  await notifyUsers([project.customerId, project.providerId], {
    type: 'system',
    title: 'Dispute opened',
    message: reason,
    link: `/projects/${project._id}`,
  });

  return {
    dispute: toSafeDispute(dispute),
    project: toSafeProject(project),
  };
};

const refreshProviderRating = async (providerId) => {
  const [stats] = await Review.aggregate([
    { $match: { providerId: new mongoose.Types.ObjectId(String(providerId)) } },
    {
      $group: {
        _id: null,
        rating: { $avg: '$rating' },
        reviewsCount: { $sum: 1 },
      },
    },
  ]);

  await ProviderProfile.findOneAndUpdate(
    { userId: providerId },
    {
      $set: {
        rating: stats ? Math.round(stats.rating * 10) / 10 : 0,
        reviewsCount: stats?.reviewsCount ?? 0,
      },
    },
  );
};

export const createReview = async (userId, projectId, { rating, comment }) => {
  const project = await getProjectForParticipant(projectId, userId);
  assertCustomer(project, userId);

  if (project.status !== 'completed') {
    throw new AppError('Review is only allowed after completion', HTTP_STATUS.BAD_REQUEST);
  }

  const existing = await Review.findOne({ projectId });
  if (existing) {
    throw new AppError('Project already reviewed', HTTP_STATUS.CONFLICT);
  }

  const review = await Review.create({
    projectId,
    customerId: project.customerId,
    providerId: project.providerId,
    rating,
    comment,
  });

  await refreshProviderRating(project.providerId);
  await notifyUsers([project.providerId], {
    type: 'review',
    title: 'New review',
    message: `You received a ${rating}-star review.`,
    link: `/projects/${project._id}`,
  });

  return {
    review: toSafeReview(review),
  };
};
