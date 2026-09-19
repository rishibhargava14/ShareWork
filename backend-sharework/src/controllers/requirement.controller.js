import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as requirementService from '../services/requirement.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createRequirement = asyncHandler(async (req, res) => {
  const result = await requirementService.createRequirement(req.user.id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    ...result,
  });
});

export const listRequirements = asyncHandler(async (req, res) => {
  const result = await requirementService.listRequirements(req.user.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
