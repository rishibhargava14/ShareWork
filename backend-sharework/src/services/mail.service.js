import { Resend } from 'resend';

import { env } from '../config/env.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { OTP_PURPOSE } from '../utils/otp.js';
import { AppError } from '../utils/AppError.js';

const resend = new Resend(env.RESEND_API_KEY);

const shouldSkipOtpEmail = (email) =>
  env.NODE_ENV === 'test' || /@example\.com$/i.test(String(email));

const subjectForPurpose = (purpose) =>
  purpose === OTP_PURPOSE.RESET
    ? 'ShareWork password reset code'
    : 'ShareWork verification code';

const bodyForPurpose = (otp, purpose) => {
  const minutes = env.OTP_EXPIRY_MIN;
  const kind = purpose === OTP_PURPOSE.RESET ? 'password reset' : 'verification';
  return `Your ShareWork ${kind} code is ${otp}. It expires in ${minutes} minutes. If you did not request this, ignore this email.`;
};

const logMailError = (label, error) => {
  if (env.NODE_ENV === 'production') {
    console.error(label);
    return;
  }

  console.error(label, error?.name || error?.message || 'send failed');
};

export const sendOtpEmail = async (email, otp, purpose = OTP_PURPOSE.VERIFY) => {
  if (shouldSkipOtpEmail(email)) {
    return {
      skipped: true,
    };
  }

  if (!env.RESEND_FROM) {
    throw new AppError('Email sender is not configured', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM,
      to: [email],
      subject: subjectForPurpose(purpose),
      text: bodyForPurpose(otp, purpose),
    });

    if (error) {
      logMailError('Resend email error', error);
      throw new AppError('Unable to send verification email', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    return {
      skipped: false,
      id: data?.id,
    };
  } catch (error) {
    logMailError('Unable to send OTP email', error);

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'Unable to send verification email',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};
