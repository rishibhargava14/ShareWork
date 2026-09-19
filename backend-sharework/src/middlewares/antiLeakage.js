import { HTTP_STATUS } from '../constants/httpStatus.js';
import { applyContactLeakagePolicy } from '../services/leakage.service.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const antiLeakage = asyncHandler(async (req, _res, next) => {
  const content = req.body?.content;
  if (typeof content !== 'string' || content.length === 0) {
    next();
    return;
  }

  const result = await applyContactLeakagePolicy({
    conversationId: req.params.id,
    senderId: req.user?.id,
    content,
  });

  if (result?.blocked) {
    throw new AppError(
      `Sharing ${result.detectedType} is not allowed. Keep transactions on ShareWork.`,
      HTTP_STATUS.BAD_REQUEST,
      {
        code: 'LEAKAGE_BLOCKED',
        detectedType: result.detectedType,
        maskedContent: result.maskedContent,
      },
    );
  }

  next();
});
