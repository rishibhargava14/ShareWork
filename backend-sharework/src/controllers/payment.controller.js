import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as paymentService from '../services/payment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.createOrder(req.user.id, req.body.projectId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const verifyCheckout = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyCheckoutPayment(req.user.id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const signature = req.headers['x-razorpay-signature'];
  const result = await paymentService.verifyPaymentWebhook(rawBody, signature);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
