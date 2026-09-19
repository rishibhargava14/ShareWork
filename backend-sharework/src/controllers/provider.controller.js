import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as providerService from '../services/provider.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listGigs = asyncHandler(async (req, res) => {
  const result = await providerService.listProviderGigs(req.params.id, req.user?.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const result = await providerService.getDashboardStats(req.user.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const getEarnings = asyncHandler(async (req, res) => {
  const result = await providerService.getEarnings(req.user.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const updateAvailability = asyncHandler(async (req, res) => {
  const result = await providerService.updateAvailability(req.user.id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const toggleOnlineStatus = asyncHandler(async (req, res) => {
  const result = await providerService.toggleOnlineStatus(req.user.id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const requestWithdrawal = asyncHandler(async (req, res) => {
  const result = await providerService.requestWithdrawal(req.user.id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    ...result,
  });
});
