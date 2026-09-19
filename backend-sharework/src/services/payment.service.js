import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { getRazorpayClient } from '../config/razorpay.js';
import { GIG_PACKAGE_PRICES } from '../constants/gigPackages.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import Project from '../models/Project.js';
import { AppError } from '../utils/AppError.js';
import { lockEscrow } from './escrow.service.js';

const timingSafeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
};

export const verifyWebhookSignature = (rawBody, signature) => {
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return timingSafeEqual(expected, signature);
};

const loadCustomerProject = async (projectId, customerId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new AppError('Project not found', HTTP_STATUS.NOT_FOUND);
  }

  if (String(project.customerId) !== String(customerId)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }

  return project;
};

export const createOrder = async (customerId, projectId) => {
  const project = await loadCustomerProject(projectId, customerId);

  if (project.status !== 'agreement_pending') {
    throw new AppError('Project cannot be funded in its current state', HTTP_STATUS.BAD_REQUEST);
  }

  if (!GIG_PACKAGE_PRICES.includes(project.fixedPrice)) {
    throw new AppError('Invalid project price', HTTP_STATUS.BAD_REQUEST);
  }

  let order;
  try {
    order = await getRazorpayClient().orders.create({
      amount: project.fixedPrice * 100,
      currency: 'INR',
      receipt: `sw_${String(project._id)}`,
      notes: { projectId: String(project._id) },
    });
  } catch {
    throw new AppError('Payment provider is unavailable', HTTP_STATUS.BAD_GATEWAY);
  }

  if (!order?.id) {
    throw new AppError('Unable to create payment order', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  project.razorpayOrderId = order.id;
  await project.save();

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency ?? 'INR',
    projectId: String(project._id),
    keyId: env.RAZORPAY_KEY_ID,
  };
};

export const verifyCheckoutPayment = async (
  customerId,
  { projectId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature },
) => {
  const project = await loadCustomerProject(projectId, customerId);

  if (project.escrow?.status === 'locked' || project.status === 'in_progress') {
    return {
      alreadyProcessed: true,
      projectId: String(project._id),
      status: project.status,
    };
  }

  if (project.status !== 'agreement_pending') {
    throw new AppError('Project cannot be funded in its current state', HTTP_STATUS.BAD_REQUEST);
  }

  if (!project.razorpayOrderId || project.razorpayOrderId !== razorpayOrderId) {
    throw new AppError('Payment order does not match this project', HTTP_STATUS.BAD_REQUEST);
  }

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (!timingSafeEqual(expected, razorpaySignature)) {
    throw new AppError('Invalid payment signature', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await lockEscrow({
    projectId,
    customerId: project.customerId,
    providerId: project.providerId,
    gatewayTransactionId: razorpayPaymentId,
  });

  return {
    alreadyProcessed: result.alreadyProcessed,
    projectId: String(project._id),
    status: result.project.status,
  };
};

const extractProjectIdFromWebhook = (event) => {
  const payment = event?.payload?.payment?.entity;
  const order = event?.payload?.order?.entity;
  return (
    payment?.notes?.projectId ||
    payment?.notes?.project_id ||
    order?.notes?.projectId ||
    order?.notes?.project_id ||
    null
  );
};

const extractPaymentId = (event) =>
  event?.payload?.payment?.entity?.id || event?.payload?.order?.entity?.id || null;

const isSuccessfulPaymentEvent = (event) =>
  event?.event === 'payment.captured' || event?.event === 'order.paid';

export const verifyPaymentWebhook = async (rawBody, signature) => {
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    throw new AppError('Invalid payment signature', HTTP_STATUS.BAD_REQUEST);
  }

  let event;
  try {
    event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
  } catch {
    throw new AppError('Invalid webhook payload', HTTP_STATUS.BAD_REQUEST);
  }

  if (!isSuccessfulPaymentEvent(event)) {
    return { ignored: true, event: event?.event ?? null };
  }

  const projectId = extractProjectIdFromWebhook(event);
  if (!projectId) {
    throw new AppError('Webhook is missing project reference', HTTP_STATUS.BAD_REQUEST);
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found', HTTP_STATUS.NOT_FOUND);
  }

  const result = await lockEscrow({
    projectId,
    customerId: project.customerId,
    providerId: project.providerId,
    gatewayTransactionId: extractPaymentId(event),
  });

  return {
    ignored: false,
    alreadyProcessed: result.alreadyProcessed,
    projectId: String(project._id),
    status: result.project.status,
  };
};
