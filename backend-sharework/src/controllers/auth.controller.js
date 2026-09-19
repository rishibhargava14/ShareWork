import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    ...result,
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const resendOtp = asyncHandler(async (req, res) => {
  const result = await authService.resendOtp(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshSession(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
