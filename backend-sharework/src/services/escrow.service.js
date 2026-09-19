import Conversation from '../models/Conversation.js';
import CustomerProfile from '../models/CustomerProfile.js';
import Escrow from '../models/Escrow.js';
import Project from '../models/Project.js';
import ProviderProfile from '../models/ProviderProfile.js';
import Transaction from '../models/Transaction.js';
import { getFeePercents } from '../constants/fees.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { emitToConversation } from '../config/socketRegistry.js';
import { AppError } from '../utils/AppError.js';
import { notifyUsers } from './notification.service.js';
import { getRazorpayClient } from '../config/razorpay.js';

export const PROJECT_SOCKET_EVENTS = Object.freeze([
  'escrow_funded',
  'deliverable_submitted',
  'payment_released',
]);

export const calculateFee = (amount) => {
  const { feePercent, gstPercent } = getFeePercents();
  const fee = Math.round((Number(amount) * feePercent) / 100);
  const gst = Math.round((fee * gstPercent) / 100);
  const net = Number(amount) - fee - gst;
  return { fee, gst, net, feePercent, gstPercent };
};

const alreadyFunded = async (projectId) => {
  const escrow = await Escrow.findOne({ projectId });
  const fundTx = await Transaction.findOne({ projectId, type: 'escrow_fund' });
  return { escrow, fundTx };
};

export const lockEscrow = async ({
  projectId,
  customerId,
  providerId,
  gatewayTransactionId,
}) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new AppError('Project not found', HTTP_STATUS.NOT_FOUND);
  }

  const existing = await alreadyFunded(projectId);
  if (existing.escrow) {
    return {
      escrow: existing.escrow,
      project,
      alreadyProcessed: true,
    };
  }

  if (project.status !== 'agreement_pending') {
    throw new AppError('Project cannot be funded in its current state', HTTP_STATUS.BAD_REQUEST);
  }

  const { fee, gst, net, feePercent, gstPercent } = calculateFee(project.fixedPrice);

  let escrow;
  try {
    escrow = await Escrow.create({
      projectId,
      customerId: customerId ?? project.customerId,
      providerId: providerId ?? project.providerId,
      amount: project.fixedPrice,
      fee,
      gst,
      net,
      status: 'locked',
      lockedAt: new Date(),
    });
  } catch (error) {
    if (error.code === 11000) {
      const raced = await alreadyFunded(projectId);
      return { escrow: raced.escrow, project, alreadyProcessed: true };
    }
    throw error;
  }

  project.escrow = {
    amount: project.fixedPrice,
    fee,
    gst,
    net,
    feePercent,
    gstPercent,
    status: 'locked',
    fundedAt: new Date(),
  };
  project.status = 'in_progress';
  await project.save();

  if (!existing.fundTx) {
    await Transaction.create({
      projectId,
      userId: project.customerId,
      type: 'escrow_fund',
      amount: project.fixedPrice,
      fee,
      gst,
      netAmount: project.fixedPrice,
      status: 'completed',
      paymentGateway: 'razorpay',
      gatewayTransactionId,
      escrowStatus: 'locked',
    });
  }

  await Conversation.updateOne(
    { _id: project.conversationId },
    { $set: { escrowStatus: 'locked' } },
  );

  await CustomerProfile.findOneAndUpdate(
    { userId: project.customerId },
    { $inc: { totalSpent: project.fixedPrice, projectsCount: 1 } },
  );

  emitToConversation(project.conversationId, 'escrow_funded', {
    projectId: String(project._id),
    amount: project.fixedPrice,
  });

  await notifyUsers([project.customerId, project.providerId], {
    type: 'escrow',
    title: 'Escrow funded',
    message: `Escrow of ₹${project.fixedPrice} is locked.`,
    link: `/projects/${project._id}`,
  });

  return { escrow, project, alreadyProcessed: false };
};

const applyRelease = async (project, escrow, { title, message } = {}) => {
  const existingRelease = await Transaction.findOne({ projectId: project._id, type: 'escrow_release' });
  if (existingRelease) {
    return { escrow, project, alreadyProcessed: true };
  }

  const { fee, gst, net } = calculateFee(escrow.amount);

  await Transaction.create([
    {
      projectId: project._id,
      userId: escrow.providerId,
      type: 'escrow_release',
      amount: escrow.amount,
      fee,
      gst,
      netAmount: net,
      status: 'completed',
      escrowStatus: 'released',
    },
    {
      projectId: project._id,
      userId: escrow.providerId,
      type: 'fee',
      amount: fee,
      fee,
      gst: 0,
      netAmount: fee,
      status: 'completed',
    },
    {
      projectId: project._id,
      userId: escrow.providerId,
      type: 'gst',
      amount: gst,
      fee: 0,
      gst,
      netAmount: gst,
      status: 'completed',
    },
  ]);

  escrow.status = 'released';
  escrow.releaseAt = new Date();
  await escrow.save();

  if (!project.escrow) {
    project.escrow = {};
  }
  project.escrow.status = 'released';
  project.escrow.releasedAt = new Date();
  project.status = 'completed';
  project.completedAt = new Date();
  project.progress = 100;
  await project.save();

  await ProviderProfile.findOneAndUpdate(
    { userId: escrow.providerId },
    { $inc: { totalEarnings: net, completedProjects: 1 } },
  );

  await Conversation.updateOne(
    { _id: project.conversationId },
    { $set: { escrowStatus: 'released' } },
  );

  emitToConversation(project.conversationId, 'payment_released', {
    projectId: String(project._id),
    netAmount: net,
  });

  await notifyUsers([escrow.customerId, escrow.providerId], {
    type: 'payment',
    title: title ?? 'Payment released',
    message: message ?? `Escrow released. Provider net ₹${net}.`,
    link: `/projects/${project._id}`,
  });

  return { escrow, project, fee, gst, net, alreadyProcessed: false };
};

export const releaseEscrow = async (projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new AppError('Project not found', HTTP_STATUS.NOT_FOUND);
  }

  const escrow = await Escrow.findOne({ projectId });

  if (project.status === 'completed' && escrow?.status === 'released') {
    return { escrow, project, alreadyProcessed: true };
  }

  if (project.status === 'disputed') {
    throw new AppError('Project is under dispute', HTTP_STATUS.BAD_REQUEST);
  }

  if (project.status !== 'delivered') {
    throw new AppError('Project is not in delivered state', HTTP_STATUS.BAD_REQUEST);
  }

  if (!escrow || escrow.status !== 'locked') {
    throw new AppError('Escrow is not locked', HTTP_STATUS.BAD_REQUEST);
  }

  return applyRelease(project, escrow);
};

export const forceReleaseEscrow = async (projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new AppError('Project not found', HTTP_STATUS.NOT_FOUND);
  }

  const escrow = await Escrow.findOne({ projectId });

  if (project.status === 'completed' && escrow?.status === 'released') {
    return { escrow, project, alreadyProcessed: true };
  }

  if (!escrow) {
    throw new AppError('Escrow not found', HTTP_STATUS.NOT_FOUND);
  }

  if (escrow.status === 'released') {
    return { escrow, project, alreadyProcessed: true };
  }

  if (escrow.status !== 'locked') {
    throw new AppError('Escrow is not locked', HTTP_STATUS.BAD_REQUEST);
  }

  const released = await applyRelease(project, escrow, {
    title: 'Payment force-released',
    message: 'Admin force-released escrow to the provider.',
  });

  return released;
};

export const splitEscrow = async (projectId, { disputeId } = {}) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new AppError('Project not found', HTTP_STATUS.NOT_FOUND);
  }

  const escrow = await Escrow.findOne({ projectId });
  const existingRefund = await Transaction.findOne({ projectId, type: 'refund' });
  const existingRelease = await Transaction.findOne({ projectId, type: 'escrow_release' });

  if (escrow?.status === 'split' && existingRefund && existingRelease) {
    return {
      escrow,
      project,
      alreadyProcessed: true,
      customerRefund: existingRefund.amount,
      providerNet: existingRelease.netAmount,
    };
  }

  if (!escrow) {
    throw new AppError('Escrow not found', HTTP_STATUS.NOT_FOUND);
  }

  if (escrow.status !== 'locked') {
    throw new AppError('Escrow is not eligible for split', HTTP_STATUS.BAD_REQUEST);
  }

  if (existingRefund || existingRelease) {
    throw new AppError('Transaction already processed', HTTP_STATUS.BAD_REQUEST);
  }

  const amount = Number(escrow.amount);
  if (!Number.isFinite(amount) || amount < 2) {
    throw new AppError('Invalid split amount', HTTP_STATUS.BAD_REQUEST);
  }

  const customerRefund = Math.floor(amount / 2);
  const providerGross = amount - customerRefund;
  if (customerRefund <= 0 || providerGross <= 0) {
    throw new AppError('Invalid split amount', HTTP_STATUS.BAD_REQUEST);
  }

  const { fee, gst, net } = calculateFee(providerGross);

  const fundTx = await Transaction.findOne({ projectId, type: 'escrow_fund' });
  if (fundTx?.gatewayTransactionId) {
    const client = getRazorpayClient();
    if (typeof client?.payments?.refund === 'function') {
      await client.payments.refund(fundTx.gatewayTransactionId, {
        amount: customerRefund * 100,
      });
    }
  }

  await Transaction.create([
    {
      projectId,
      userId: escrow.customerId,
      type: 'refund',
      amount: customerRefund,
      fee: 0,
      gst: 0,
      netAmount: customerRefund,
      status: 'completed',
      paymentGateway: 'razorpay',
      gatewayTransactionId: fundTx?.gatewayTransactionId,
      escrowStatus: 'split',
    },
    {
      projectId,
      userId: escrow.providerId,
      type: 'escrow_release',
      amount: providerGross,
      fee,
      gst,
      netAmount: net,
      status: 'completed',
      escrowStatus: 'split',
    },
    {
      projectId,
      userId: escrow.providerId,
      type: 'fee',
      amount: fee,
      fee,
      gst: 0,
      netAmount: fee,
      status: 'completed',
    },
    {
      projectId,
      userId: escrow.providerId,
      type: 'gst',
      amount: gst,
      fee: 0,
      gst,
      netAmount: gst,
      status: 'completed',
    },
  ]);

  escrow.status = 'split';
  escrow.releaseAt = new Date();
  if (disputeId) {
    escrow.disputeId = disputeId;
  }
  await escrow.save();

  if (!project.escrow) {
    project.escrow = {};
  }
  project.escrow.status = 'split';
  project.escrow.releasedAt = new Date();
  project.status = 'completed';
  project.completedAt = new Date();
  project.progress = 100;
  await project.save();

  await ProviderProfile.findOneAndUpdate(
    { userId: escrow.providerId },
    { $inc: { totalEarnings: net, completedProjects: 1 } },
  );

  await CustomerProfile.findOneAndUpdate(
    { userId: escrow.customerId },
    { $inc: { totalSpent: -customerRefund } },
  );

  await Conversation.updateOne(
    { _id: project.conversationId },
    { $set: { escrowStatus: 'released' } },
  );

  await notifyUsers([escrow.customerId, escrow.providerId], {
    type: 'payment',
    title: 'Dispute split 50/50',
    message: `Customer refund ₹${customerRefund}. Provider net ₹${net}.`,
    link: `/projects/${project._id}`,
  });

  return {
    escrow,
    project,
    customerRefund,
    providerGross,
    fee,
    gst,
    net,
    alreadyProcessed: false,
  };
};

export const refundEscrow = async (projectId, { disputeId } = {}) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new AppError('Project not found', HTTP_STATUS.NOT_FOUND);
  }

  const escrow = await Escrow.findOne({ projectId });
  const existingRefund = await Transaction.findOne({ projectId, type: 'refund' });

  if (escrow?.status === 'refunded' && existingRefund) {
    return { escrow, project, alreadyProcessed: true };
  }

  if (!escrow || escrow.status !== 'locked') {
    throw new AppError('Escrow is not eligible for refund', HTTP_STATUS.BAD_REQUEST);
  }

  if (existingRefund) {
    return { escrow, project, alreadyProcessed: true };
  }

  const fundTx = await Transaction.findOne({ projectId, type: 'escrow_fund' });
  if (fundTx?.gatewayTransactionId) {
    const client = getRazorpayClient();
    if (typeof client?.payments?.refund === 'function') {
      await client.payments.refund(fundTx.gatewayTransactionId, {
        amount: escrow.amount * 100,
      });
    }
  }

  await Transaction.create({
    projectId,
    userId: escrow.customerId,
    type: 'refund',
    amount: escrow.amount,
    fee: 0,
    gst: 0,
    netAmount: escrow.amount,
    status: 'completed',
    paymentGateway: 'razorpay',
    gatewayTransactionId: fundTx?.gatewayTransactionId,
    escrowStatus: 'refunded',
  });

  escrow.status = 'refunded';
  if (disputeId) {
    escrow.disputeId = disputeId;
  }
  await escrow.save();

  project.status = 'cancelled';
  if (!project.escrow) {
    project.escrow = {};
  }
  project.escrow.status = 'refunded';
  await project.save();

  await CustomerProfile.findOneAndUpdate(
    { userId: escrow.customerId },
    { $inc: { totalSpent: -escrow.amount } },
  );

  await notifyUsers([escrow.customerId, escrow.providerId], {
    type: 'payment',
    title: 'Escrow refunded',
    message: `Escrow of ₹${escrow.amount} was refunded.`,
    link: `/projects/${project._id}`,
  });

  return { escrow, project, alreadyProcessed: false };
};
