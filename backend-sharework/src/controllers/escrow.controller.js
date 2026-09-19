import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as projectService from '../services/project.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const releaseEscrow = asyncHandler(async (req, res) => {
  const result = await projectService.releaseProjectEscrow(req.user.id, req.body.projectId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
