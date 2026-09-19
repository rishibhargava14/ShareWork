import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import Conversation from '../../src/models/Conversation.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import Dispute from '../../src/models/Dispute.js';
import Escrow from '../../src/models/Escrow.js';
import Notification from '../../src/models/Notification.js';
import Project from '../../src/models/Project.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import Review from '../../src/models/Review.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';
import { calculateFee, refundEscrow } from '../../src/services/escrow.service.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { buildOtpExpiry, hashOtp } from '../../src/utils/otp.js';
import { hashPassword } from '../../src/utils/password.js';
import { activateSignup } from '../helpers/activateSignup.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdProjectIds = [];

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const request = (server, { method, path, body, token }) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

{
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const down = await request(server, { method: 'GET', path: '/health' });
  record(
    'health is 503 when Mongo is disconnected',
    down.status === 503 &&
      down.body.ok === false &&
      down.body.db === 'disconnected' &&
      down.body.success === false,
  );
  await new Promise((resolve) => server.close(resolve));
}

await connectDb();
const app = createApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  const ready = await request(server, { method: 'GET', path: '/health' });
  record(
    'health is 200 when Mongo is connected',
    ready.status === 200 && ready.body.ok === true && ready.body.db === 'connected',
  );

  const five = calculateFee(5000);
  const fifteen = calculateFee(15000);
  const thirtyFive = calculateFee(35000);
  record('₹5,000 fee/GST/net', five.fee === 500 && five.gst === 90 && five.net === 4410);
  record('₹15,000 fee/GST/net', fifteen.fee === 1500 && fifteen.gst === 270 && fifteen.net === 13230);
  record('₹35,000 fee/GST/net', thirtyFive.fee === 3500 && thirtyFive.gst === 630 && thirtyFive.net === 30870);

  const limiterSource = fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/middlewares/authRateLimit.js'),
    'utf8',
  );
  record(
    'auth rate limiter is 20/15m and skipped only in test',
    limiterSource.includes('max: 20') &&
      limiterSource.includes('windowMs: 15 * 60 * 1000') &&
      limiterSource.includes("skip: () => env.NODE_ENV === 'test'"),
  );

  const signup = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: 'Closure Customer',
      email: `closure-c-${stamp}@example.com`,
      phone: `+9166${String(stamp).slice(-8)}1`,
      password: 'password12',
      role: 'customer',
    },
  });
  if (signup.body?.user?.id) createdUserIds.push(signup.body.user.id);
  record('customer signup works', signup.status === 201 && Boolean(signup.body.user?.id) && !signup.body.token);
  await activateSignup(signup);

  const providerSignup = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: 'Closure Provider',
      email: `closure-p-${stamp}@example.com`,
      phone: `+9166${String(stamp).slice(-8)}2`,
      password: 'password12',
      role: 'provider',
    },
  });
  if (providerSignup.body?.user?.id) createdUserIds.push(providerSignup.body.user.id);
  record('provider signup works', providerSignup.status === 201);
  await activateSignup(providerSignup);

  const forgot = await request(server, {
    method: 'POST',
    path: '/api/auth/forgot-password',
    body: { email: signup.body.user.email },
  });
  const unknownForgot = await request(server, {
    method: 'POST',
    path: '/api/auth/forgot-password',
    body: { email: `missing-${stamp}@example.com` },
  });
  record(
    'forgot password does not enumerate accounts',
    forgot.status === 200 &&
      unknownForgot.status === 200 &&
      forgot.body.message === 'OTP sent' &&
      unknownForgot.body.message === forgot.body.message &&
      !JSON.stringify(forgot.body).includes('123456'),
  );

  const resetOtp = '654321';
  await User.findByIdAndUpdate(signup.body.user.id, {
    resetOtp: await hashOtp(resetOtp),
    resetOtpExpiry: buildOtpExpiry(),
    resetOtpAttempts: 0,
  });

  const weakReset = await request(server, {
    method: 'POST',
    path: '/api/auth/reset-password',
    body: { email: signup.body.user.email, otp: resetOtp, newPassword: 'short' },
  });
  record('reset rejects weak password', weakReset.status === 400);

  const badOtp = await request(server, {
    method: 'POST',
    path: '/api/auth/reset-password',
    body: { email: signup.body.user.email, otp: '000000', newPassword: 'newpass12' },
  });
  record('reset rejects invalid OTP', badOtp.status === 400);

  const resetOk = await request(server, {
    method: 'POST',
    path: '/api/auth/reset-password',
    body: { email: signup.body.user.email, otp: resetOtp, newPassword: 'newpass12' },
  });
  record('reset password succeeds', resetOk.status === 200 && resetOk.body.message === 'Password updated');

  const reuse = await request(server, {
    method: 'POST',
    path: '/api/auth/reset-password',
    body: { email: signup.body.user.email, otp: resetOtp, newPassword: 'another12' },
  });
  record('reset OTP is single-use', reuse.status === 400);

  const oldLogin = await request(server, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: signup.body.user.email, password: 'password12', role: 'customer' },
  });
  record('old password is rejected after reset', oldLogin.status === 401);

  const newLogin = await request(server, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: signup.body.user.email, password: 'newpass12', role: 'customer' },
  });
  record('new password is accepted after reset', newLogin.status === 200 && Boolean(newLogin.body.token));

  const admin = await User.create({
    name: 'Closure Admin',
    email: `closure-a-${stamp}@example.com`,
    phone: `+9166${String(stamp).slice(-8)}3`,
    passwordHash: await hashPassword('password12'),
    role: 'admin',
    isVerified: true,
  });
  createdUserIds.push(String(admin._id));
  const tokenA = signAccessToken(admin);
  const tokenC = newLogin.body.token;
  const tokenP = providerSignup.body.token;
  const customerId = signup.body.user.id;
  const providerId = providerSignup.body.user.id;

  const conversation = await Conversation.create({
    participants: [customerId, providerId],
  });
  const completed = await Project.create({
    customerId,
    providerId,
    conversationId: conversation._id,
    title: 'Closure completed project',
    scope: 'Completed work used for review.',
    deliverables: ['Files'],
    fixedPrice: 15000,
    timelineDays: 7,
    status: 'completed',
    deadline: new Date(Date.now() + 86400000),
    escrow: { amount: 15000, status: 'released' },
  });
  createdProjectIds.push(String(completed._id));

  const disputed = await Project.create({
    customerId,
    providerId,
    conversationId: conversation._id,
    title: 'Closure dispute project',
    scope: 'Locked work used for dispute and refund.',
    deliverables: ['Files'],
    fixedPrice: 15000,
    timelineDays: 7,
    status: 'in_progress',
    deadline: new Date(Date.now() + 86400000),
    escrow: { amount: 15000, status: 'locked' },
  });
  createdProjectIds.push(String(disputed._id));
  await Escrow.create({
    projectId: disputed._id,
    customerId,
    providerId,
    amount: 15000,
    fee: 1500,
    gst: 270,
    net: 13230,
    status: 'locked',
    lockedAt: new Date(),
  });

  const opened = await request(server, {
    method: 'POST',
    path: `/api/projects/${disputed._id}/dispute`,
    token: tokenC,
    body: { reason: 'Quality issue', description: 'Deliverable does not match the agreed scope.' },
  });
  record(
    'customer can open a dispute',
    opened.status === 201 &&
      opened.body.dispute?.status === 'open' &&
      opened.body.project?.status === 'disputed',
  );

  const duplicate = await request(server, {
    method: 'POST',
    path: `/api/projects/${disputed._id}/dispute`,
    token: tokenP,
    body: { reason: 'Same issue', description: 'Second open dispute must be rejected.' },
  });
  record('duplicate open dispute rejected', duplicate.status === 409);

  const refunded = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${opened.body.dispute.id}/resolve`,
    token: tokenA,
    body: { resolution: 'Refund approved', refund: true },
  });
  const refundedEscrow = await Escrow.findOne({ projectId: disputed._id }).lean();
  const refundedProject = await Project.findById(disputed._id).lean();
  record(
    'admin refund resolves dispute and refunds escrow',
    refunded.status === 200 &&
      refunded.body.dispute.status === 'resolved' &&
      refundedEscrow?.status === 'refunded' &&
      refundedProject?.status === 'cancelled' &&
      (await Transaction.countDocuments({ projectId: disputed._id, type: 'refund' })) === 1,
  );

  const secondRefund = await refundEscrow(disputed._id, { disputeId: opened.body.dispute.id });
  record(
    'refundEscrow is idempotent',
    secondRefund.alreadyProcessed === true &&
      (await Transaction.countDocuments({ projectId: disputed._id, type: 'refund' })) === 1,
  );

  const reviewed = await request(server, {
    method: 'POST',
    path: `/api/projects/${completed._id}/review`,
    token: tokenC,
    body: { rating: 5, comment: 'Excellent work after completion.' },
  });
  record(
    'customer can review a completed project',
    reviewed.status === 201 && reviewed.body.review?.rating === 5,
  );

  const duplicateReview = await request(server, {
    method: 'POST',
    path: `/api/projects/${completed._id}/review`,
    token: tokenC,
    body: { rating: 4, comment: 'Second review should fail.' },
  });
  record('duplicate review rejected', duplicateReview.status === 409);

  const missingProjectId = new Transaction({
    userId: new mongoose.Types.ObjectId(),
    type: 'escrow_fund',
    amount: 15000,
    netAmount: 15000,
  });
  record('escrow_fund without projectId is invalid', Boolean(missingProjectId.validateSync()?.errors?.projectId));
} catch (error) {
  record('closure test runner', false, error.message);
} finally {
  if (createdProjectIds.length > 0) {
    await Transaction.deleteMany({ projectId: { $in: createdProjectIds } });
    await Escrow.deleteMany({ projectId: { $in: createdProjectIds } });
    await Dispute.deleteMany({ projectId: { $in: createdProjectIds } });
    await Review.deleteMany({ projectId: { $in: createdProjectIds } });
    await Notification.deleteMany({ link: { $in: createdProjectIds.map((id) => `/projects/${id}`) } });
    await Project.deleteMany({ _id: { $in: createdProjectIds } });
  }
  if (createdUserIds.length > 0) {
    await Conversation.deleteMany({ participants: { $in: createdUserIds } });
    await CustomerProfile.deleteMany({ userId: { $in: createdUserIds } });
    await ProviderProfile.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
}

const failed = results.filter((item) => !item.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
