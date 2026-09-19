import { Router } from 'express';
import {
  forgotPassword,
  login,
  refresh,
  resendOtp,
  resetPassword,
  signup,
  verifyOtp,
} from '../controllers/auth.controller.js';
import { authRateLimiter, otpSendRateLimiter } from '../middlewares/authRateLimit.js';
import { validateBody } from '../middlewares/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resendOtpSchema,
  resetPasswordSchema,
  signupSchema,
  verifyOtpSchema,
} from '../validations/auth.validation.js';

const router = Router();

router.post('/signup', authRateLimiter, validateBody(signupSchema), signup);
router.post('/login', authRateLimiter, validateBody(loginSchema), login);
router.post('/verify-otp', authRateLimiter, validateBody(verifyOtpSchema), verifyOtp);
router.post(
  '/resend-otp',
  authRateLimiter,
  otpSendRateLimiter,
  validateBody(resendOtpSchema),
  resendOtp,
);
router.post('/forgot-password', authRateLimiter, otpSendRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/refresh', authRateLimiter, validateBody(refreshTokenSchema), refresh);
router.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), resetPassword);

export default router;
