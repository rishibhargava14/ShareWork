import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { GIG_PACKAGE_TIERS } from '../../src/constants/gigPackages.js';
import AdminUser from '../../src/models/AdminUser.js';
import Category from '../../src/models/Category.js';
import Conversation from '../../src/models/Conversation.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import Dispute from '../../src/models/Dispute.js';
import Escrow from '../../src/models/Escrow.js';
import Gig from '../../src/models/Gig.js';
import Project from '../../src/models/Project.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';
import { calculateFee } from '../../src/services/escrow.service.js';
import { ensureDefaultCategories } from '../../src/services/category.service.js';
import { hashOtp, OTP_SELECT, buildOtpExpiry } from '../../src/utils/otp.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdProjectIds = [];
const createdConversationIds = [];
const createdDisputeIds = [];
const createdGigIds = [];
const createdCategoryIds = [];
const createdAdminLinkIds = [];
const createdProfileIds = [];

const LONG_DESCRIPTION =
  'Complete dashboard design with layout system, components, and interaction states for a SaaS product homepage.';

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

const createUser = async (role, label) => {
  const seq = String(createdUserIds.length + 1).padStart(3, '0');
  const user = await User.create({
    name: `Phase3 ${role} ${label}`,
    email: `p3-${role}-${label}-${stamp}@example.com`,
    phone: `+9187${String(stamp).slice(-6)}${seq}`,
    passwordHash: await hashPassword('password12'),
    role,
    isVerified: true,
  });
  createdUserIds.push(String(user._id));
  return user;
};

const validPackages = () => [
  {
    name: 'Basic',
    description: 'Basic landing page package',
    fixedPrice: GIG_PACKAGE_TIERS.Basic,
    deliveryDays: 3,
    revisions: 1,
    features: ['1 page'],
  },
  {
    name: 'Standard',
    description: 'Standard multi-page package',
    fixedPrice: GIG_PACKAGE_TIERS.Standard,
    deliveryDays: 7,
    revisions: 2,
    features: ['5 pages'],
  },
  {
    name: 'Premium',
    description: 'Premium product design package',
    fixedPrice: GIG_PACKAGE_TIERS.Premium,
    deliveryDays: 14,
    revisions: 4,
    features: ['Unlimited pages'],
  },
];

const seededProject = async ({ customer, provider, title, status, escrowStatus, amount = 15000 }) => {
  const conversation = await Conversation.create({
    participants: [customer._id, provider._id],
  });
  createdConversationIds.push(String(conversation._id));
  const project = await Project.create({
    customerId: customer._id,
    providerId: provider._id,
    conversationId: conversation._id,
    title,
    scope: 'Phase 3 financial fixture.',
    deliverables: ['Files'],
    fixedPrice: amount,
    timelineDays: 7,
    status,
    deadline: new Date(Date.now() + 86400000),
    escrow: { amount, status: escrowStatus },
  });
  createdProjectIds.push(String(project._id));
  return { conversation, project };
};

await connectDb();
const app = createApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  const admin = await createUser('admin', '1');
  const customer = await createUser('customer', '1');
  const provider = await createUser('provider', '1');
  const extraProvider = await createUser('provider', '2');
  const adminLink = await AdminUser.create({ userId: admin._id });
  createdAdminLinkIds.push(String(adminLink._id));

  const tokenA = signAccessToken(admin);
  const tokenC = signAccessToken(customer);
  const tokenP = signAccessToken(provider);

  const customerProfile = await CustomerProfile.create({ userId: customer._id, totalSpent: 15000 });
  const providerProfile = await ProviderProfile.create({
    userId: provider._id,
    title: 'Phase 3 provider',
    categories: ['Web'],
    startingPrice: 5000,
  });
  const extraProfile = await ProviderProfile.create({
    userId: extraProvider._id,
    title: 'Phase 3 extra provider',
    categories: ['Web'],
    startingPrice: 5000,
  });
  createdProfileIds.push(String(customerProfile._id), String(providerProfile._id), String(extraProfile._id));

  const login = await request(server, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: admin.email, password: 'password12', role: 'admin' },
  });
  record(
    'admin login requires OTP and omits tokens',
    login.status === 200 && login.body.requiresOtp === true && !login.body.token && !login.body.refreshToken,
  );
  record('admin login response omits otp value', !JSON.stringify(login.body).includes('"otp":'));

  const knownOtp = '482910';
  const adminOtpUser = await User.findById(admin._id).select(OTP_SELECT);
  adminOtpUser.otp = await hashOtp(knownOtp);
  adminOtpUser.otpExpiry = buildOtpExpiry();
  adminOtpUser.otpAttempts = 0;
  await adminOtpUser.save();

  const badOtp = await request(server, {
    method: 'POST',
    path: '/api/auth/verify-otp',
    body: { email: admin.email, otp: '000000' },
  });
  record('admin invalid OTP rejected', badOtp.status === 400 && !badOtp.body?.token);

  const verified = await request(server, {
    method: 'POST',
    path: '/api/auth/verify-otp',
    body: { email: admin.email, otp: knownOtp },
  });
  record(
    'admin OTP issues admin JWT',
    verified.status === 200 &&
      verified.body.verified === true &&
      Boolean(verified.body.token) &&
      verified.body.user?.role === 'admin',
  );

  const forceFixture = await seededProject({
    customer,
    provider,
    title: 'Phase 3 force release project',
    status: 'in_progress',
    escrowStatus: 'locked',
  });
  await Escrow.create({
    projectId: forceFixture.project._id,
    customerId: customer._id,
    providerId: provider._id,
    amount: 15000,
    fee: 1500,
    gst: 270,
    net: 13230,
    status: 'locked',
    lockedAt: new Date(),
  });

  const forcePath = `/api/admin/projects/${forceFixture.project._id}/force-release`;
  const unauthForce = await request(server, { method: 'POST', path: forcePath });
  record('unauthenticated force-release rejected', unauthForce.status === 401);
  const customerForce = await request(server, { method: 'POST', path: forcePath, token: tokenC });
  record('customer force-release rejected', customerForce.status === 403);
  const providerForce = await request(server, { method: 'POST', path: forcePath, token: tokenP });
  record('provider force-release rejected', providerForce.status === 403);

  const missingProject = await request(server, {
    method: 'POST',
    path: `/api/admin/projects/${new mongoose.Types.ObjectId()}/force-release`,
    token: tokenA,
  });
  record('force-release missing project rejected', missingProject.status === 404);

  const noEscrowProject = await seededProject({
    customer,
    provider,
    title: 'Phase 3 project without escrow',
    status: 'in_progress',
    escrowStatus: 'pending',
  });
  const missingEscrow = await request(server, {
    method: 'POST',
    path: `/api/admin/projects/${noEscrowProject.project._id}/force-release`,
    token: tokenA,
  });
  record('force-release missing escrow rejected', missingEscrow.status === 404);

  const released = await request(server, { method: 'POST', path: forcePath, token: tokenA });
  const expectedNet = calculateFee(15000).net;
  record(
    'admin force-release succeeds from in_progress',
    released.status === 200 &&
      released.body.escrow?.status === 'released' &&
      released.body.project?.status === 'completed' &&
      released.body.alreadyProcessed === false &&
      released.body.net === expectedNet,
  );
  record(
    'force-release writes escrow_release once',
    (await Transaction.countDocuments({ projectId: forceFixture.project._id, type: 'escrow_release' })) === 1,
  );
  const providerAfterRelease = await ProviderProfile.findOne({ userId: provider._id }).lean();
  record('force-release credits provider earnings', providerAfterRelease.totalEarnings === expectedNet);

  const releasedAgain = await request(server, { method: 'POST', path: forcePath, token: tokenA });
  record(
    'force-release already released is idempotent',
    releasedAgain.status === 200 && releasedAgain.body.alreadyProcessed === true,
  );
  record(
    'duplicate force-release does not create a second release',
    (await Transaction.countDocuments({ projectId: forceFixture.project._id, type: 'escrow_release' })) === 1,
  );

  const refundedFixture = await seededProject({
    customer,
    provider: extraProvider,
    title: 'Phase 3 refunded force project',
    status: 'cancelled',
    escrowStatus: 'refunded',
  });
  await Escrow.create({
    projectId: refundedFixture.project._id,
    customerId: customer._id,
    providerId: extraProvider._id,
    amount: 15000,
    status: 'refunded',
  });
  const forceRefunded = await request(server, {
    method: 'POST',
    path: `/api/admin/projects/${refundedFixture.project._id}/force-release`,
    token: tokenA,
  });
  record('force-release of refunded escrow rejected', forceRefunded.status === 400);

  const splitFixture = await seededProject({
    customer,
    provider: extraProvider,
    title: 'Phase 3 split project',
    status: 'disputed',
    escrowStatus: 'locked',
  });
  await Escrow.create({
    projectId: splitFixture.project._id,
    customerId: customer._id,
    providerId: extraProvider._id,
    amount: 15000,
    fee: 1500,
    gst: 270,
    net: 13230,
    status: 'locked',
    lockedAt: new Date(),
  });
  const splitDispute = await Dispute.create({
    projectId: splitFixture.project._id,
    raisedBy: customer._id,
    reason: 'Quality split case',
    description: 'Need a 50/50 resolution for incomplete work.',
    status: 'open',
  });
  createdDisputeIds.push(String(splitDispute._id));

  const splitPath = `/api/admin/disputes/${splitDispute._id}/resolve`;
  const unauthSplit = await request(server, {
    method: 'POST',
    path: splitPath,
    body: { resolution: 'Split 50/50', split: true },
  });
  record('unauthenticated split rejected', unauthSplit.status === 401);
  const customerSplit = await request(server, {
    method: 'POST',
    path: splitPath,
    token: tokenC,
    body: { resolution: 'Split 50/50', split: true },
  });
  record('customer split rejected', customerSplit.status === 403);

  const bothFlags = await request(server, {
    method: 'POST',
    path: splitPath,
    token: tokenA,
    body: { resolution: 'Both', refund: true, split: true },
  });
  record('refund+split together rejected', bothFlags.status === 400);

  const tinyFixture = await seededProject({
    customer,
    provider: extraProvider,
    title: 'Phase 3 tiny split',
    status: 'disputed',
    escrowStatus: 'locked',
    amount: 1,
  });
  await Escrow.create({
    projectId: tinyFixture.project._id,
    customerId: customer._id,
    providerId: extraProvider._id,
    amount: 1,
    status: 'locked',
  });
  const tinyDispute = await Dispute.create({
    projectId: tinyFixture.project._id,
    raisedBy: customer._id,
    reason: 'Tiny amount',
    description: 'Amount too small to split.',
    status: 'open',
  });
  createdDisputeIds.push(String(tinyDispute._id));
  const tinySplit = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${tinyDispute._id}/resolve`,
    token: tokenA,
    body: { resolution: 'Split tiny', split: true },
  });
  record('invalid split amount rejected', tinySplit.status === 400);

  const missingTx = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${new mongoose.Types.ObjectId()}/resolve`,
    token: tokenA,
    body: { resolution: 'Missing', split: true },
  });
  record('split missing dispute rejected', missingTx.status === 404);

  const expectedSplit = calculateFee(7500);
  const splitOk = await request(server, {
    method: 'POST',
    path: splitPath,
    token: tokenA,
    body: { resolution: 'Admin 50/50 split', split: true },
  });
  record(
    'admin 50/50 split succeeds',
    splitOk.status === 200 &&
      splitOk.body.dispute?.status === 'resolved' &&
      splitOk.body.financial?.escrowStatus === 'split' &&
      splitOk.body.financial?.projectStatus === 'completed' &&
      splitOk.body.financial?.customerRefund === 7500 &&
      splitOk.body.financial?.providerNet === expectedSplit.net,
  );
  const splitEscrowRow = await Escrow.findOne({ projectId: splitFixture.project._id }).lean();
  const splitProjectRow = await Project.findById(splitFixture.project._id).lean();
  const refundRow = await Transaction.findOne({ projectId: splitFixture.project._id, type: 'refund' }).lean();
  const releaseRow = await Transaction.findOne({
    projectId: splitFixture.project._id,
    type: 'escrow_release',
  }).lean();
  record(
    'split writes half refund and half release',
    refundRow?.amount === 7500 &&
      refundRow.status === 'completed' &&
      releaseRow?.amount === 7500 &&
      releaseRow.netAmount === expectedSplit.net &&
      splitEscrowRow?.status === 'split' &&
      splitProjectRow?.status === 'completed',
  );

  const splitAgain = await request(server, {
    method: 'POST',
    path: splitPath,
    token: tokenA,
    body: { resolution: 'Split again', split: true },
  });
  record('already resolved split rejected', splitAgain.status === 400);
  record(
    'duplicate split does not create a second refund',
    (await Transaction.countDocuments({ projectId: splitFixture.project._id, type: 'refund' })) === 1,
  );

  const extraToken = signAccessToken(extraProvider);
  const unauthWithdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    body: { amount: 1000, upiId: 'provider@oksbi' },
  });
  record('unauthenticated withdrawal rejected', unauthWithdraw.status === 401);
  const customerWithdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: tokenC,
    body: { amount: 1000, upiId: 'provider@oksbi' },
  });
  record('customer withdrawal rejected', customerWithdraw.status === 403);
  const zeroWithdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: extraToken,
    body: { amount: 0, upiId: 'provider@oksbi' },
  });
  record('zero withdrawal rejected', zeroWithdraw.status === 400);
  const negativeWithdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: extraToken,
    body: { amount: -10, upiId: 'provider@oksbi' },
  });
  record('negative withdrawal rejected', negativeWithdraw.status === 400);
  const overWithdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: extraToken,
    body: { amount: 999999, upiId: 'provider@oksbi' },
  });
  record('insufficient withdrawal rejected', overWithdraw.status === 400);
  const okWithdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: extraToken,
    body: { amount: expectedSplit.net, upiId: 'provider@oksbi' },
  });
  record(
    'valid pending withdrawal created',
    okWithdraw.status === 201 &&
      okWithdraw.body.transaction?.status === 'pending' &&
      okWithdraw.body.transaction?.amount === expectedSplit.net,
  );
  const secondWithdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: extraToken,
    body: { amount: 1, upiId: 'provider@oksbi' },
  });
  record('repeated withdrawal beyond remaining funds rejected', secondWithdraw.status === 400);

  const listedWithdrawals = await request(server, {
    method: 'GET',
    path: '/api/admin/withdrawals?status=pending&page=1',
    token: tokenA,
  });
  record(
    'admin lists pending withdrawals',
    listedWithdrawals.status === 200 &&
      listedWithdrawals.body.withdrawals.some((item) => item.id === okWithdraw.body.transaction.id),
  );

  await ensureDefaultCategories();
  const created = await request(server, {
    method: 'POST',
    path: '/api/admin/categories',
    token: tokenA,
    body: { name: `Brand-${stamp}` },
  });
  record('admin can create category', created.status === 201 && created.body.category?.name === `Brand-${stamp}`);
  if (created.body.category?.id) createdCategoryIds.push(created.body.category.id);

  const publicCats = await request(server, { method: 'GET', path: '/api/categories' });
  record(
    'public categories include admin-created name',
    publicCats.status === 200 &&
      (publicCats.body.categories ?? []).some((item) => item.name === `Brand-${stamp}`),
  );

  const customGig = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    token: extraToken,
    body: {
      title: 'Brand system and component library',
      category: `Brand-${stamp}`,
      description: LONG_DESCRIPTION,
      packages: validPackages(),
    },
  });
  record(
    'provider can create gig with admin category',
    customGig.status === 201 && customGig.body.gig?.category === `Brand-${stamp}`,
  );
  if (customGig.body?.gig?.id) createdGigIds.push(customGig.body.gig.id);

  const duplicate = await request(server, {
    method: 'POST',
    path: '/api/admin/categories',
    token: tokenA,
    body: { name: `Brand-${stamp}` },
  });
  record('duplicate category rejected', duplicate.status === 409);
  const unauthCreate = await request(server, {
    method: 'POST',
    path: '/api/admin/categories',
    token: tokenC,
    body: { name: 'ShouldFail' },
  });
  record('unauthorized category create rejected', unauthCreate.status === 403);

  const web = await Category.findOne({ name: 'Web' });
  const deactivated = await request(server, {
    method: 'PUT',
    path: `/api/admin/categories/${web._id}`,
    token: tokenA,
    body: { isActive: false },
  });
  record('admin can deactivate category', deactivated.status === 200 && deactivated.body.category.isActive === false);

  const inactiveGig = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    token: extraToken,
    body: {
      title: 'SaaS dashboard UI design',
      category: 'Web',
      description: LONG_DESCRIPTION,
      packages: validPackages(),
    },
  });
  record('inactive category rejected on gig create', inactiveGig.status === 400);
  if (inactiveGig.body?.gig?.id) createdGigIds.push(inactiveGig.body.gig.id);

  await request(server, {
    method: 'PUT',
    path: `/api/admin/categories/${web._id}`,
    token: tokenA,
    body: { isActive: true },
  });

  const stats = await request(server, { method: 'GET', path: '/api/admin/stats', token: tokenA });
  record(
    'stats include customer/provider/withdrawal metrics',
    stats.status === 200 &&
      typeof stats.body.customers === 'number' &&
      typeof stats.body.providers === 'number' &&
      typeof stats.body.pendingWithdrawals === 'number' &&
      typeof stats.body.activeProjects === 'number',
  );
} catch (error) {
  record('phase 3 finance test runner', false, error.message);
} finally {
  if (createdCategoryIds.length > 0) {
    await Category.deleteMany({ _id: { $in: createdCategoryIds } });
  }
  await Category.updateMany({ name: 'Web' }, { $set: { isActive: true } });
  if (createdGigIds.length > 0) {
    await Gig.deleteMany({ _id: { $in: createdGigIds } });
  }
  if (createdProjectIds.length > 0) {
    await Transaction.deleteMany({ projectId: { $in: createdProjectIds } });
    await Escrow.deleteMany({ projectId: { $in: createdProjectIds } });
    await Project.deleteMany({ _id: { $in: createdProjectIds } });
  }
  if (createdDisputeIds.length > 0) {
    await Dispute.deleteMany({ _id: { $in: createdDisputeIds } });
  }
  if (createdConversationIds.length > 0) {
    await Conversation.deleteMany({ _id: { $in: createdConversationIds } });
  }
  if (createdProfileIds.length > 0) {
    await CustomerProfile.deleteMany({ _id: { $in: createdProfileIds } });
    await ProviderProfile.deleteMany({ _id: { $in: createdProfileIds } });
  }
  if (createdAdminLinkIds.length > 0) {
    await AdminUser.deleteMany({ _id: { $in: createdAdminLinkIds } });
  }
  if (createdUserIds.length > 0) {
    await Transaction.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
}

const failed = results.filter((item) => !item.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
