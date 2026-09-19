import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as customerService from '../services/customer.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const discover = asyncHandler(async (req, res) => {
  const result = await customerService.discoverProviders(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
