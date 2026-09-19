import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as gigService from '../services/gig.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createGig = asyncHandler(async (req, res) => {
  const result = await gigService.createGig(req.user.id, req.body, req.files);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    ...result,
  });
});

export const updateGig = asyncHandler(async (req, res) => {
  const result = await gigService.updateGig(req.user.id, req.params.id, req.body, req.files);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const getGig = asyncHandler(async (req, res) => {
  const result = await gigService.getGig(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
