import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as projectService from '../services/project.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listMyTransactions = asyncHandler(async (req, res) => {
  const result = await projectService.listMyTransactions(req.user.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
