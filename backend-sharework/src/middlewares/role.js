import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';

export const role = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError('Forbidden', HTTP_STATUS.FORBIDDEN));
  }

  next();
};
