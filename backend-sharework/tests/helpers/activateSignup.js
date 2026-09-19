import User from '../../src/models/User.js';
import { signAccessToken, signRefreshToken } from '../../src/utils/jwt.js';

export const activateSignup = async (response) => {
  const user = response?.body?.user;
  if (!user?.id) {
    return response;
  }

  await User.findByIdAndUpdate(user.id, {
    isVerified: true,
    $unset: {
      otp: 1,
      otpExpiry: 1,
      otpAttempts: 1,
      otpLastSentAt: 1,
      otpResendCount: 1,
      otpResendWindowStart: 1,
    },
  });

  const tokenUser = { _id: user.id, role: user.role };
  response.body.token = signAccessToken(tokenUser);
  response.body.refreshToken = signRefreshToken(tokenUser);
  response.body.user = { ...user, isVerified: true };
  return response;
};
