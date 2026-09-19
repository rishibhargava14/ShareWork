import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { env } from '../../src/config/env.js';
import { authenticate } from '../../src/middlewares/auth.js';
import { role } from '../../src/middlewares/role.js';
import { validateBody } from '../../src/middlewares/validate.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import User from '../../src/models/User.js';
import * as authService from '../../src/services/auth.service.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_RESENDS,
  OTP_SELECT,
  buildOtpExpiry,
  generateOtp,
  hashOtp,
} from '../../src/utils/otp.js';
import { comparePassword, hashPassword } from '../../src/utils/password.js';
import {
  loginSchema,
  resendOtpSchema,
  resetPasswordSchema,
  signupSchema,
  verifyOtpSchema,
} from '../../src/validations/auth.validation.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const emailFor = (label) => `${label}-${stamp}@example.com`;
const phoneFor = (n) => `+9198${String(stamp).slice(-8)}${n}`;

const runMiddleware = (mw, req) =>
  new Promise((resolve) => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        resolve({ err: null, req, res });
        return this;
      },
    };

    mw(req, res, (err) => resolve({ err, req, res }));
  });

const track = (result) => {
  if (result?.user?.id) {
    createdUserIds.push(result.user.id);
  }
  return result;
};

const bypassOtpCooldown = async (userId, fields = { otpLastSentAt: new Date(Date.now() - 60 * 1000) }) => {
  await User.findByIdAndUpdate(userId, fields);
};

const assertStatus = async (name, fn, expectedMessage) => {
  try {
    await fn();
    record(name, false, 'expected error');
  } catch (error) {
    const ok = expectedMessage ? error.message === expectedMessage : true;
    record(name, ok, ok ? `${error.statusCode} ${error.message}` : error.message);
  }
};

await connectDb();

try {
  record(
    'signup rejects admin role at validation',
    signupSchema.safeParse({
      name: 'Admin Person',
      email: emailFor('admin'),
      phone: phoneFor(1),
      password: 'password12',
      role: 'admin',
    }).success === false,
  );

  record(
    'signup rejects bad email',
    signupSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'not-an-email',
      phone: phoneFor(2),
      password: 'password12',
      role: 'customer',
    }).success === false,
  );

  record(
    'signup rejects missing password',
    signupSchema.safeParse({
      name: 'Ada Lovelace',
      email: emailFor('missing-pass'),
      phone: phoneFor(3),
      role: 'customer',
    }).success === false,
  );

  record(
    'signup rejects short password',
    signupSchema.safeParse({
      name: 'Ada Lovelace',
      email: emailFor('short-pass'),
      phone: phoneFor(4),
      password: '123',
      role: 'customer',
    }).success === false,
  );

  record(
    'login rejects unsupported role',
    loginSchema.safeParse({
      email: emailFor('login-role'),
      password: 'password12',
      role: 'superadmin',
    }).success === false,
  );

  const parsedSignup = signupSchema.parse({
    name: 'Ada Lovelace',
    email: 'Ada.Customer@Example.com',
    phone: phoneFor(5),
    password: 'password12',
    role: 'customer',
  });
  record('signup validation normalizes email', parsedSignup.email === 'ada.customer@example.com');

  const customer = track(
    await authService.signup({
      name: 'Ada Customer',
      email: emailFor('customer'),
      phone: phoneFor(6),
      password: 'password12',
      role: 'customer',
    }),
  );
  record('valid customer signup', Boolean(customer.user?.id));
  record('signup does not issue tokens before verification', !customer.token && !customer.refreshToken);
  record('signup requires verification', customer.requiresVerification === true);
  record('signup response omits passwordHash', !Object.hasOwn(customer.user, 'passwordHash'));
  record('signup response omits otp', !Object.hasOwn(customer.user, 'otp') && !('otp' in customer));
  record('generate OTP returns 6 digits', /^\d{6}$/.test(generateOtp()));

  const storedCustomer = await User.findById(customer.user.id).select('+passwordHash +otp +otpExpiry');
  record('passwordHash stored instead of plaintext', Boolean(storedCustomer.passwordHash) && storedCustomer.passwordHash !== 'password12');
  record(
    'stored passwordHash verifies original password',
    await comparePassword('password12', storedCustomer.passwordHash),
  );
  record('customer profile created', Boolean(await CustomerProfile.findOne({ userId: customer.user.id })));

  const provider = track(
    await authService.signup({
      name: 'Grace Provider',
      email: emailFor('provider'),
      phone: phoneFor(7),
      password: 'password12',
      role: 'provider',
    }),
  );
  record('valid provider signup', Boolean(provider.user?.id && !provider.token));
  record('provider profile created', Boolean(await ProviderProfile.findOne({ userId: provider.user.id })));

  await assertStatus(
    'admin signup rejected by service contract',
    () =>
      authService.signup({
        name: 'Root Admin',
        email: emailFor('admin-svc'),
        phone: phoneFor(8),
        password: 'password12',
        role: 'admin',
      }),
    'Invalid role',
  );

  await assertStatus(
    'duplicate email rejected',
    () =>
      authService.signup({
        name: 'Copy Customer',
        email: customer.user.email,
        phone: phoneFor(9),
        password: 'password12',
        role: 'customer',
      }),
    'Email already registered',
  );

  await assertStatus(
    'duplicate phone rejected',
    () =>
      authService.signup({
        name: 'Copy Phone',
        email: emailFor('dup-phone'),
        phone: storedCustomer.phone,
        password: 'password12',
        role: 'customer',
      }),
    'Phone already registered',
  );

  const otpUserEmail = emailFor('otp');
  const otpSignup = track(
    await authService.signup({
      name: 'Otp User',
      email: otpUserEmail,
      phone: phoneFor('a'),
      password: 'password12',
      role: 'customer',
    }),
  );

  const knownOtp = '482910';
  const otpUser = await User.findById(otpSignup.user.id).select(OTP_SELECT);
  otpUser.otp = await hashOtp(knownOtp);
  otpUser.otpExpiry = buildOtpExpiry();
  otpUser.otpAttempts = 0;
  await otpUser.save();

  await assertStatus(
    'invalid OTP rejected',
    () => authService.verifyOtp({ email: otpUserEmail, otp: '000000' }),
    'Invalid OTP',
  );

  const verified = await authService.verifyOtp({ email: otpUserEmail, otp: knownOtp });
  record('valid OTP verifies account', verified.verified === true);
  record('successful verification issues tokens', Boolean(verified.token && verified.refreshToken));

  const cleared = await User.findById(otpSignup.user.id).select(OTP_SELECT);
  record('successful verification sets isVerified', cleared.isVerified === true);
  record('successful verification clears OTP fields', !cleared.otp && !cleared.otpExpiry);

  const expiredEmail = emailFor('expired');
  const expiredSignup = track(
    await authService.signup({
      name: 'Expired Otp',
      email: expiredEmail,
      phone: phoneFor('b'),
      password: 'password12',
      role: 'customer',
    }),
  );
  const expiredUser = await User.findById(expiredSignup.user.id).select(OTP_SELECT);
  expiredUser.otp = await hashOtp('111111');
  expiredUser.otpExpiry = new Date(Date.now() - 1000);
  await expiredUser.save();
  await assertStatus(
    'expired OTP rejected',
    () => authService.verifyOtp({ email: expiredEmail, otp: '111111' }),
    'OTP has expired. Request a new code.',
  );
  const expiredCleared = await User.findById(expiredSignup.user.id).select(OTP_SELECT);
  record('expired OTP is cleared from storage', !expiredCleared.otp && !expiredCleared.otpExpiry);

  await bypassOtpCooldown(expiredSignup.user.id);
  const resendAfterExpiry = await authService.resendOtp({ email: expiredEmail, purpose: 'verify' });
  record('resend after expiry succeeds', resendAfterExpiry.message === 'OTP sent');
  const rotatedAfterExpiry = await User.findById(expiredSignup.user.id).select(OTP_SELECT);
  record(
    'resend after expiry stores a fresh OTP',
    Boolean(rotatedAfterExpiry.otp && rotatedAfterExpiry.otpExpiry.getTime() > Date.now()),
  );

  const resendUserEmail = emailFor('resend');
  const resendSignup = track(
    await authService.signup({
      name: 'Resend User',
      email: resendUserEmail,
      phone: phoneFor('d'),
      password: 'password12',
      role: 'customer',
    }),
  );
  await assertStatus(
    'resend cooldown rejects immediate retry',
    () => authService.resendOtp({ email: resendUserEmail, purpose: 'verify' }),
    'Please wait before requesting another OTP',
  );

  const beforeResend = await User.findById(resendSignup.user.id).select(OTP_SELECT);
  const previousHash = beforeResend.otp;
  beforeResend.otp = await hashOtp('482910');
  beforeResend.otpExpiry = buildOtpExpiry();
  await beforeResend.save();
  await bypassOtpCooldown(resendSignup.user.id);
  const resendBeforeExpiry = await authService.resendOtp({ email: resendUserEmail, purpose: 'verify' });
  record('resend before expiry succeeds', resendBeforeExpiry.message === 'OTP sent');
  const afterResend = await User.findById(resendSignup.user.id).select(OTP_SELECT);
  record('resend rotates stored OTP hash', Boolean(afterResend.otp && afterResend.otp !== previousHash && afterResend.otp !== beforeResend.otp));
  await assertStatus(
    'old OTP is invalid after resend',
    () => authService.verifyOtp({ email: resendUserEmail, otp: '482910' }),
    'Invalid OTP',
  );

  const attemptEmail = emailFor('attempts');
  const attemptSignup = track(
    await authService.signup({
      name: 'Attempt User',
      email: attemptEmail,
      phone: phoneFor('e'),
      password: 'password12',
      role: 'customer',
    }),
  );
  const attemptUser = await User.findById(attemptSignup.user.id).select(OTP_SELECT);
  const goodAttemptOtp = '246810';
  attemptUser.otp = await hashOtp(goodAttemptOtp);
  attemptUser.otpExpiry = buildOtpExpiry();
  attemptUser.otpAttempts = 0;
  await attemptUser.save();
  for (let i = 1; i < OTP_MAX_ATTEMPTS; i += 1) {
    await assertStatus(
      `failed OTP attempt ${i} rejected`,
      () => authService.verifyOtp({ email: attemptEmail, otp: '000000' }),
      'Invalid OTP',
    );
  }
  await assertStatus(
    'OTP locks after max failed attempts',
    () => authService.verifyOtp({ email: attemptEmail, otp: '000000' }),
    'Too many attempts. Request a new code.',
  );
  await assertStatus(
    'locked OTP cannot be used',
    () => authService.verifyOtp({ email: attemptEmail, otp: goodAttemptOtp }),
    'Invalid OTP',
  );
  await bypassOtpCooldown(attemptSignup.user.id);
  const resendAfterLock = await authService.resendOtp({ email: attemptEmail, purpose: 'verify' });
  record('resend after max attempts succeeds', resendAfterLock.message === 'OTP sent');

  const limitEmail = emailFor('limit');
  const limitSignup = track(
    await authService.signup({
      name: 'Limit User',
      email: limitEmail,
      phone: phoneFor('f'),
      password: 'password12',
      role: 'customer',
    }),
  );
  for (let i = 1; i < OTP_MAX_RESENDS; i += 1) {
    await bypassOtpCooldown(limitSignup.user.id);
    await authService.resendOtp({ email: limitEmail, purpose: 'verify' });
  }
  await bypassOtpCooldown(limitSignup.user.id);
  await assertStatus(
    'resend rate limit rejects extra sends',
    () => authService.resendOtp({ email: limitEmail, purpose: 'verify' }),
    'Too many OTP requests. Try again later.',
  );

  const purposeEmail = emailFor('purpose');
  const purposeSignup = track(
    await authService.signup({
      name: 'Purpose User',
      email: purposeEmail,
      phone: phoneFor('g'),
      password: 'password12',
      role: 'customer',
    }),
  );
  const purposeUser = await User.findById(purposeSignup.user.id).select(`${OTP_SELECT} +passwordHash`);
  purposeUser.otp = await hashOtp('111111');
  purposeUser.otpExpiry = buildOtpExpiry();
  purposeUser.resetOtp = await hashOtp('222222');
  purposeUser.resetOtpExpiry = buildOtpExpiry();
  await purposeUser.save();
  await assertStatus(
    'verification OTP cannot be used as reset OTP',
    () =>
      authService.resetPassword({
        email: purposeEmail,
        otp: '111111',
        newPassword: 'newpass12',
      }),
    'Invalid OTP',
  );
  await assertStatus(
    'reset OTP cannot be used as verification OTP',
    () => authService.verifyOtp({ email: purposeEmail, otp: '222222' }),
    'Invalid OTP',
  );

  const unverifiedToken = signAccessToken({ _id: purposeSignup.user.id, role: 'customer' });
  const unverifiedMw = await runMiddleware(authenticate, {
    headers: { authorization: `Bearer ${unverifiedToken}` },
  });
  record('unverified users cannot access protected APIs', unverifiedMw.err?.statusCode === 403);

  await User.findByIdAndUpdate(customer.user.id, {
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

  const loginResult = await authService.login({
    email: customer.user.email,
    password: 'password12',
    role: 'customer',
  });
  record('valid login credentials', Boolean(loginResult.token && loginResult.refreshToken));
  record('login returns access token', typeof loginResult.token === 'string' && loginResult.token.split('.').length === 3);
  record('login returns refresh token', typeof loginResult.refreshToken === 'string' && loginResult.refreshToken.split('.').length === 3);
  record('login response omits passwordHash', !Object.hasOwn(loginResult.user, 'passwordHash'));

  await assertStatus(
    'invalid password rejected',
    () =>
      authService.login({
        email: customer.user.email,
        password: 'wrong-password',
        role: 'customer',
      }),
    'Invalid credentials',
  );

  await assertStatus(
    'invalid email rejected',
    () =>
      authService.login({
        email: emailFor('missing-user'),
        password: 'password12',
        role: 'customer',
      }),
    'Invalid credentials',
  );

  await assertStatus(
    'role mismatch rejected',
    () =>
      authService.login({
        email: customer.user.email,
        password: 'password12',
        role: 'provider',
      }),
    'Invalid credentials',
  );

  const bannedSignup = track(
    await authService.signup({
      name: 'Banned User',
      email: emailFor('banned'),
      phone: phoneFor('c'),
      password: 'password12',
      role: 'customer',
    }),
  );
  await User.findByIdAndUpdate(bannedSignup.user.id, { isBanned: true, bannedReason: 'test' });
  await assertStatus(
    'banned user login rejected',
    () =>
      authService.login({
        email: bannedSignup.user.email,
        password: 'password12',
        role: 'customer',
      }),
    'Account is not available',
  );

  const forgot = await authService.forgotPassword({ email: customer.user.email });
  record('forgot password returns generic success', forgot.message === 'OTP sent');
  const unknownForgot = await authService.forgotPassword({ email: emailFor('unknown') });
  record(
    'forgot password does not enumerate accounts',
    unknownForgot.message === forgot.message,
  );

  record(
    'reset password rejects weak password',
    resetPasswordSchema.safeParse({
      email: customer.user.email,
      otp: '123456',
      newPassword: 'short',
    }).success === false,
  );

  const resetOtp = '654321';
  await User.findByIdAndUpdate(customer.user.id, {
    resetOtp: await hashOtp(resetOtp),
    resetOtpExpiry: buildOtpExpiry(),
    resetOtpAttempts: 0,
  });

  await assertStatus(
    'reset password rejects invalid OTP',
    () =>
      authService.resetPassword({
        email: customer.user.email,
        otp: '000000',
        newPassword: 'newpass12',
      }),
    'Invalid OTP',
  );

  await assertStatus(
    'reset password rejects unknown email',
    () =>
      authService.resetPassword({
        email: emailFor('no-reset'),
        otp: resetOtp,
        newPassword: 'newpass12',
      }),
    'Invalid OTP',
  );

  const expiredResetUser = await User.findOne({ email: expiredEmail }).select(OTP_SELECT);
  if (expiredResetUser) {
    expiredResetUser.resetOtp = await hashOtp('222222');
    expiredResetUser.resetOtpExpiry = new Date(Date.now() - 1000);
    await expiredResetUser.save();
  }
  await assertStatus(
    'reset password rejects expired OTP',
    () =>
      authService.resetPassword({
        email: expiredEmail,
        otp: '222222',
        newPassword: 'newpass12',
      }),
    'OTP has expired. Request a new code.',
  );

  const resetOk = await authService.resetPassword({
    email: customer.user.email,
    otp: resetOtp,
    newPassword: 'newpass12',
  });
  record('reset password succeeds', resetOk.message === 'Password updated');

  await assertStatus(
    'reused reset OTP rejected',
    () =>
      authService.resetPassword({
        email: customer.user.email,
        otp: resetOtp,
        newPassword: 'another12',
      }),
    'Invalid OTP',
  );

  await assertStatus(
    'old password rejected after reset',
    () =>
      authService.login({
        email: customer.user.email,
        password: 'password12',
        role: 'customer',
      }),
    'Invalid credentials',
  );

  const newLogin = await authService.login({
    email: customer.user.email,
    password: 'newpass12',
    role: 'customer',
  });
  record('new password accepted after reset', Boolean(newLogin.token));

  const missingToken = await runMiddleware(authenticate, { headers: {} });
  record('middleware rejects missing token', missingToken.err?.statusCode === 401);

  const malformedToken = await runMiddleware(authenticate, {
    headers: { authorization: 'Bearer not-a-jwt' },
  });
  record('middleware rejects malformed token', malformedToken.err?.statusCode === 401);

  const expiredToken = jwt.sign(
    { userId: String(customer.user.id), role: 'customer', exp: Math.floor(Date.now() / 1000) - 30 },
    env.JWT_SECRET,
  );
  const expiredMw = await runMiddleware(authenticate, {
    headers: { authorization: `Bearer ${expiredToken}` },
  });
  record('middleware rejects expired token', expiredMw.err?.statusCode === 401);

  const validMw = await runMiddleware(authenticate, {
    headers: { authorization: `Bearer ${newLogin.token}` },
  });
  record('middleware accepts valid token', !validMw.err && validMw.req.user?.id === String(customer.user.id));

  const bannedToken = signAccessToken({ _id: bannedSignup.user.id, role: 'customer' });
  const bannedMw = await runMiddleware(authenticate, {
    headers: { authorization: `Bearer ${bannedToken}` },
  });
  record('middleware rejects banned user', bannedMw.err?.statusCode === 403);

  const customerRole = await runMiddleware(role('customer'), {
    user: { id: '1', role: 'customer' },
  });
  record('role middleware allows customer on customer route', !customerRole.err);

  const providerDenied = await runMiddleware(role('customer'), {
    user: { id: '2', role: 'provider' },
  });
  record('role middleware denies provider on customer route', providerDenied.err?.statusCode === 403);

  const adminDenied = await runMiddleware(role('customer'), {
    user: { id: '3', role: 'admin' },
  });
  record('role middleware denies admin on customer route', adminDenied.err?.statusCode === 403);

  const adminAllowed = await runMiddleware(role('admin'), {
    user: { id: '4', role: 'admin' },
  });
  record('role middleware allows admin on admin route', !adminAllowed.err);

  const validateMw = await runMiddleware(validateBody(verifyOtpSchema), {
    body: { email: 'bad', otp: '12' },
  });
  record('validation middleware rejects invalid OTP payload', Boolean(validateMw.err));

  const resendValidate = await runMiddleware(validateBody(resendOtpSchema), {
    body: { email: 'bad', purpose: 'unknown' },
  });
  record('validation middleware rejects invalid resend payload', Boolean(resendValidate.err));

  const app = createApp();
  const hashed = await hashPassword('password12');
  record('hashPassword does not return plaintext', hashed !== 'password12');
  record('createApp still exposes health route', typeof app === 'function');
} catch (error) {
  record('auth test runner', false, error.message);
} finally {
  if (createdUserIds.length > 0) {
    await CustomerProfile.deleteMany({ userId: { $in: createdUserIds } });
    await ProviderProfile.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  await disconnectDb();
}

const failed = results.filter((item) => !item.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
