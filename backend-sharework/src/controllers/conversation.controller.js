import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as conversationService from '../services/conversation.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listConversations = asyncHandler(async (req, res) => {
  const result = await conversationService.listConversations(req.user.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const createConversation = asyncHandler(async (req, res) => {
  const result = await conversationService.createConversation(req.user, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    ...result,
  });
});

export const listMessages = asyncHandler(async (req, res) => {
  const result = await conversationService.listMessages(req.user.id, req.params.id, req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const result = await conversationService.sendMessage(
    req.user.id,
    req.params.id,
    req.body,
    req.file,
  );

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    ...result,
  });
});

export const createAgreement = asyncHandler(async (req, res) => {
  const result = await conversationService.createAgreement(req.user, req.params.id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    ...result,
  });
});

export const approveAgreement = asyncHandler(async (req, res) => {
  const result = await conversationService.approveAgreement(
    req.user,
    req.params.id,
    req.params.agreementId,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const rejectAgreement = asyncHandler(async (req, res) => {
  const result = await conversationService.rejectAgreement(
    req.user,
    req.params.id,
    req.params.agreementId,
    req.body,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
