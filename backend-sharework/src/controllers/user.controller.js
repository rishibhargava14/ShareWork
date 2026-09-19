import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as userService from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMe = asyncHandler(async (req, res) => {
  const result = await userService.getCurrentUser(req.user.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const result = await userService.updateCurrentUser(req.user.id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const result = await userService.getPublicProfile(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
