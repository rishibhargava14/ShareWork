import { HTTP_STATUS } from '../constants/httpStatus.js';
import { listCategories } from '../services/category.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listPublicCategories = asyncHandler(async (_req, res) => {
  const result = await listCategories({ includeInactive: false });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
