import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { GIG_PACKAGE_TIERS } from '../../src/constants/gigPackages.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import Gig from '../../src/models/Gig.js';
import Project from '../../src/models/Project.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';
import { providerAccountRouter } from '../../src/routes/provider.routes.js';
import { activateSignup } from '../helpers/activateSignup.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdGigIds = [];
const createdProjectIds = [];
const createdTransactionIds = [];

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
    if (payload) {
      req.write(payload);
    }
    req.end();
  });

const signup = async (server, role, label) => {
  const response = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: `${role} ${label}`,
      email: `${label}-${stamp}@example.com`,
      phone: `+9196${String(stamp).slice(-8)}${label === 'prov-a' ? '1' : label === 'prov-b' ? '2' : '3'}`,
      password: 'password12',
      role,
    },
  });

  if (response.body?.user?.id) {
    createdUserIds.push(response.body.user.id);
  }

  return activateSignup(response);
};

const hasSensitive = (value) => {
  const json = JSON.stringify(value);
  return (
    json.includes('passwordHash') ||
    json.includes('"otp"') ||
    json.includes('otpExpiry') ||
    json.includes('JWT_SECRET') ||
    json.includes('AWS_')
  );
};

const trackTransaction = (doc) => {
  if (doc?._id) {
    createdTransactionIds.push(String(doc._id));
  }
  if (doc?.id) {
    createdTransactionIds.push(String(doc.id));
  }
  return doc;
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

const validSchedule = () => ({
  weeklySchedule: [
    { day: 'Mon', enabled: true, start: '09:00', end: '18:00' },
    { day: 'Tue', enabled: true, start: '10:00', end: '17:00' },
    { day: 'Wed', enabled: false },
  ],
  vacationMode: {
    enabled: true,
    startDate: '2026-10-01',
    endDate: '2026-10-05',
  },
});

await connectDb();
const app = createApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  const providerA = await signup(server, 'provider', 'prov-a');
  const providerB = await signup(server, 'provider', 'prov-b');
  const customer = await signup(server, 'customer', 'cust');
  const tokenA = providerA.body.token;
  const tokenB = providerB.body.token;
  const customerToken = customer.body.token;
  const userA = providerA.body.user.id;
  const userB = providerB.body.user.id;

  const admin = await User.create({
    name: 'Phase5 Admin',
    email: `admin-${stamp}@example.com`,
    phone: `+9195${String(stamp).slice(-8)}9`,
    passwordHash: await hashPassword('password12'),
    role: 'admin',
    isVerified: true,
  });
  createdUserIds.push(String(admin._id));
  const adminToken = signAccessToken(admin);

  const gigA = await Gig.create({
    providerId: userA,
    title: 'Provider A analytics dashboard gig',
    category: 'UI/UX',
    description:
      'Provider-owned gig used only to verify Phase 5 dashboard views and conversion math.',
    packages: validPackages(),
    views: 10,
    orders: 2,
  });
  createdGigIds.push(String(gigA._id));

  const gigB = await Gig.create({
    providerId: userB,
    title: 'Provider B analytics dashboard gig',
    category: 'Web',
    description:
      'Other-provider gig used to prove dashboard metrics never leak across accounts.',
    packages: validPackages(),
    views: 99,
    orders: 40,
  });
  createdGigIds.push(String(gigB._id));

  await ProviderProfile.updateOne({ userId: userA }, { $set: { rating: 4.5, reviewsCount: 8 } });
  await ProviderProfile.updateOne({ userId: userB }, { $set: { rating: 1.2, reviewsCount: 1 } });

  const projectAActive = await Project.create({
    customerId: customer.body.user.id,
    providerId: userA,
    conversationId: new mongoose.Types.ObjectId(),
    title: 'Active A project',
    scope: 'Dashboard work',
    deliverables: ['Files'],
    fixedPrice: 15000,
    timelineDays: 7,
    status: 'in_progress',
    deadline: new Date('2026-12-01'),
  });
  createdProjectIds.push(String(projectAActive._id));

  const projectADone = await Project.create({
    customerId: customer.body.user.id,
    providerId: userA,
    conversationId: new mongoose.Types.ObjectId(),
    title: 'Completed A project',
    scope: 'Completed work',
    deliverables: ['Files'],
    fixedPrice: 5000,
    timelineDays: 3,
    status: 'completed',
    deadline: new Date('2026-08-01'),
  });
  createdProjectIds.push(String(projectADone._id));

  const projectBActive = await Project.create({
    customerId: customer.body.user.id,
    providerId: userB,
    conversationId: new mongoose.Types.ObjectId(),
    title: 'Active B project',
    scope: 'Other provider work',
    deliverables: ['Files'],
    fixedPrice: 35000,
    timelineDays: 14,
    status: 'in_progress',
    deadline: new Date('2026-12-01'),
  });
  createdProjectIds.push(String(projectBActive._id));

  const txARelease = await Transaction.create({
    projectId: projectADone._id,
    userId: userA,
    type: 'escrow_release',
    amount: 15000,
    fee: 1500,
    gst: 270,
    netAmount: 13230,
    status: 'completed',
  });
  trackTransaction(txARelease);

  const txAPending = await Transaction.create({
    projectId: projectAActive._id,
    userId: userA,
    type: 'escrow_release',
    amount: 5000,
    fee: 500,
    gst: 90,
    netAmount: 4410,
    status: 'pending',
  });
  trackTransaction(txAPending);

  const txBRelease = await Transaction.create({
    projectId: projectBActive._id,
    userId: userB,
    type: 'escrow_release',
    amount: 35000,
    fee: 3500,
    gst: 630,
    netAmount: 30870,
    status: 'completed',
  });
  trackTransaction(txBRelease);

  const unauthStats = await request(server, { method: 'GET', path: '/api/provider/dashboard/stats' });
  record('unauthenticated dashboard rejected', unauthStats.status === 401);

  const unauthEarnings = await request(server, { method: 'GET', path: '/api/provider/earnings' });
  record('unauthenticated earnings rejected', unauthEarnings.status === 401);

  const unauthAvailability = await request(server, {
    method: 'POST',
    path: '/api/provider/availability',
    body: validSchedule(),
  });
  record('unauthenticated availability rejected', unauthAvailability.status === 401);

  const unauthToggle = await request(server, {
    method: 'PUT',
    path: '/api/provider/availability/toggle-online',
    body: { onlineStatus: 'online' },
  });
  record('unauthenticated toggle rejected', unauthToggle.status === 401);

  const unauthWithdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    body: { amount: 1000, upiId: 'provider@upi' },
  });
  record('unauthenticated withdraw rejected', unauthWithdraw.status === 401);

  const customerStats = await request(server, {
    method: 'GET',
    path: '/api/provider/dashboard/stats',
    token: customerToken,
  });
  record('customer dashboard rejected', customerStats.status === 403);

  const customerEarnings = await request(server, {
    method: 'GET',
    path: '/api/provider/earnings',
    token: customerToken,
  });
  record('customer earnings rejected', customerEarnings.status === 403);

  const customerAvailability = await request(server, {
    method: 'POST',
    path: '/api/provider/availability',
    token: customerToken,
    body: validSchedule(),
  });
  record('customer availability rejected', customerAvailability.status === 403);

  const customerToggle = await request(server, {
    method: 'PUT',
    path: '/api/provider/availability/toggle-online',
    token: customerToken,
    body: { onlineStatus: 'online' },
  });
  record('customer toggle rejected', customerToggle.status === 403);

  const customerWithdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: customerToken,
    body: { amount: 1000, upiId: 'customer@upi' },
  });
  record('customer withdraw rejected', customerWithdraw.status === 403);

  const adminStats = await request(server, {
    method: 'GET',
    path: '/api/provider/dashboard/stats',
    token: adminToken,
  });
  record('admin does not inherit provider access', adminStats.status === 403);

  const online = await request(server, {
    method: 'PUT',
    path: '/api/provider/availability/toggle-online',
    token: tokenA,
    body: { onlineStatus: 'online' },
  });
  record(
    'online status accepted',
    online.status === 200 &&
      online.body.onlineStatus === 'online' &&
      online.body.isOnline === true,
  );

  const offline = await request(server, {
    method: 'PUT',
    path: '/api/provider/availability/toggle-online',
    token: tokenA,
    body: { onlineStatus: 'offline' },
  });
  record(
    'offline status accepted',
    offline.status === 200 &&
      offline.body.onlineStatus === 'offline' &&
      offline.body.isOnline === false,
  );

  const busy = await request(server, {
    method: 'PUT',
    path: '/api/provider/availability/toggle-online',
    token: tokenA,
    body: { onlineStatus: 'busy' },
  });
  record(
    'busy status accepted',
    busy.status === 200 && busy.body.onlineStatus === 'busy' && busy.body.isOnline === false,
  );

  const invalidOnline = await request(server, {
    method: 'PUT',
    path: '/api/provider/availability/toggle-online',
    token: tokenA,
    body: { onlineStatus: 'available' },
  });
  record('invalid online status rejected', invalidOnline.status === 400);

  const toggleUnknown = await request(server, {
    method: 'PUT',
    path: '/api/provider/availability/toggle-online',
    token: tokenA,
    body: { onlineStatus: 'online', weeklySchedule: [] },
  });
  record('toggle rejects unrelated fields', toggleUnknown.status === 400);

  const schedule = await request(server, {
    method: 'POST',
    path: '/api/provider/availability',
    token: tokenA,
    body: validSchedule(),
  });
  const savedProfile = await ProviderProfile.findOne({ userId: userA }).lean();
  record(
    'valid schedule update',
    schedule.status === 200 &&
      schedule.body.availability?.weeklySchedule?.length === 3 &&
      schedule.body.availability.weeklySchedule[0].day === 'Mon' &&
      schedule.body.availability.vacationMode?.enabled === true &&
      schedule.body.availability.onlineStatus === 'busy',
  );
  record(
    'schedule update preserves online status and capacity',
    savedProfile?.availability?.onlineStatus === 'busy' &&
      savedProfile?.availability?.capacityAvailable === 3,
  );
  record('availability response omits auth fields', !hasSensitive(schedule.body));

  const invalidDay = await request(server, {
    method: 'POST',
    path: '/api/provider/availability',
    token: tokenA,
    body: {
      weeklySchedule: [{ day: 'Monday', enabled: true, start: '09:00', end: '18:00' }],
      vacationMode: { enabled: false },
    },
  });
  record('invalid schedule day rejected', invalidDay.status === 400);

  const missingTimes = await request(server, {
    method: 'POST',
    path: '/api/provider/availability',
    token: tokenA,
    body: {
      weeklySchedule: [{ day: 'Mon', enabled: true }],
      vacationMode: { enabled: false },
    },
  });
  record('enabled day without times rejected', missingTimes.status === 400);

  const badRange = await request(server, {
    method: 'POST',
    path: '/api/provider/availability',
    token: tokenA,
    body: {
      weeklySchedule: [{ day: 'Mon', enabled: false }],
      vacationMode: {
        enabled: true,
        startDate: '2026-10-10',
        endDate: '2026-10-01',
      },
    },
  });
  record('invalid vacation date range rejected', badRange.status === 400);

  const unknownFields = await request(server, {
    method: 'POST',
    path: '/api/provider/availability',
    token: tokenA,
    body: {
      ...validSchedule(),
      userId: userB,
      providerId: userB,
      onlineStatus: 'online',
    },
  });
  record('availability unknown fields rejected', unknownFields.status === 400);

  const otherProfile = await ProviderProfile.findOne({ userId: userB }).lean();
  record(
    'provider updates own profile only',
    otherProfile?.availability?.weeklySchedule?.length === 0 ||
      otherProfile?.availability?.weeklySchedule == null,
  );

  const statsA = await request(server, {
    method: 'GET',
    path: '/api/provider/dashboard/stats',
    token: tokenA,
  });
  const statsB = await request(server, {
    method: 'GET',
    path: '/api/provider/dashboard/stats',
    token: tokenB,
  });
  record(
    'provider receives own dashboard metrics',
    statsA.status === 200 &&
      statsA.body.views === 10 &&
      statsA.body.rating === 4.5 &&
      statsA.body.activeProjects === 1 &&
      statsA.body.earnings.total === 13230 &&
      statsA.body.earnings.pending === 4410 &&
      statsA.body.earnings.withdrawn === 0 &&
      statsA.body.conversion === 0.2,
  );
  record(
    'dashboard uses real gig views and rating',
    statsA.body.views === 10 && statsA.body.rating === 4.5,
  );
  record(
    'dashboard does not leak other provider metrics',
    statsA.body.views !== statsB.body.views &&
      statsA.body.rating !== statsB.body.rating &&
      statsB.body.views === 99 &&
      statsB.body.rating === 1.2 &&
      statsB.body.earnings.total === 30870 &&
      statsB.body.activeProjects === 1,
  );
  record(
    'dashboard does not invent transactions',
    statsA.body.earnings.total === 13230 && !hasSensitive(statsA.body),
  );

  const earningsA = await request(server, {
    method: 'GET',
    path: '/api/provider/earnings',
    token: tokenA,
  });
  const earningsB = await request(server, {
    method: 'GET',
    path: '/api/provider/earnings',
    token: tokenB,
  });
  const aIds = (earningsA.body.transactions ?? []).map((item) => item.id);
  const bIds = (earningsB.body.transactions ?? []).map((item) => item.id);
  record(
    'provider sees own transactions only',
    earningsA.status === 200 &&
      earningsA.body.transactions.length === 2 &&
      earningsA.body.transactions.every((item) => item.userId === userA) &&
      !aIds.includes(String(txBRelease._id)),
  );
  record(
    'earnings totals come from real records',
    earningsA.body.total === 13230 &&
      earningsA.body.pending === 4410 &&
      earningsA.body.withdrawn === 0 &&
      earningsA.body.transactions.some(
        (item) => item.fee === 1500 && item.gst === 270 && item.netAmount === 13230,
      ),
  );
  record(
    'earnings sort is deterministic',
    earningsA.body.transactions[0].id === String(txAPending._id) ||
      new Date(earningsA.body.transactions[0].createdAt) >=
        new Date(earningsA.body.transactions[1].createdAt),
  );
  record(
    'earnings do not include other provider records',
    !bIds.includes(String(txARelease._id)) &&
      earningsB.body.transactions.length === 1 &&
      earningsB.body.total === 30870,
  );
  record('earnings response omits auth fields', !hasSensitive(earningsA.body));

  const withdrawUnknown = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: tokenA,
    body: { amount: 1000, upiId: 'provider@upi', userId: userB },
  });
  record('withdraw identity cannot come from body', withdrawUnknown.status === 400);

  const zeroAmount = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: tokenA,
    body: { amount: 0, upiId: 'provider@upi' },
  });
  record('zero withdrawal rejected', zeroAmount.status === 400);

  const negativeAmount = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: tokenA,
    body: { amount: -100, upiId: 'provider@upi' },
  });
  record('negative withdrawal rejected', negativeAmount.status === 400);

  const badUpi = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: tokenA,
    body: { amount: 1000, upiId: 'not-an-upi' },
  });
  record('invalid UPI rejected', badUpi.status === 400);

  const overdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: tokenA,
    body: { amount: 20000, upiId: 'provider@upi' },
  });
  record(
    'pending funds cannot be withdrawn',
    overdraw.status === 400 &&
      String(overdraw.body.message).includes('Pending escrow releases are not withdrawable'),
  );

  const withdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: tokenA,
    body: { amount: 2000, upiId: 'provider@oksbi' },
  });
  trackTransaction(withdraw.body?.transaction);
  record(
    'provider can create withdrawal request',
    withdraw.status === 201 &&
      withdraw.body.transaction?.type === 'withdrawal' &&
      withdraw.body.transaction?.status === 'pending' &&
      withdraw.body.transaction?.amount === 2000 &&
      withdraw.body.transaction?.userId === userA &&
      withdraw.body.transaction?.upiId === 'provider@oksbi' &&
      String(withdraw.body.message).includes('not been transferred'),
  );
  record('withdrawal does not claim payout', !String(withdraw.body.message).toLowerCase().includes('transferred successfully'));

  const storedWithdraw = await Transaction.findById(withdraw.body.transaction.id).lean();
  record(
    'withdrawal is a pending request record only',
    storedWithdraw?.status === 'pending' &&
      storedWithdraw?.type === 'withdrawal' &&
      !storedWithdraw?.gatewayTransactionId,
  );

  const earningsAfter = await request(server, {
    method: 'GET',
    path: '/api/provider/earnings',
    token: tokenA,
  });
  record(
    'withdrawn total updates from real request',
    earningsAfter.status === 200 &&
      earningsAfter.body.withdrawn === 2000 &&
      earningsAfter.body.transactions.some((item) => item.id === withdraw.body.transaction.id),
  );

  const secondOverdraw = await request(server, {
    method: 'POST',
    path: '/api/provider/withdraw',
    token: tokenA,
    body: { amount: 12000, upiId: 'provider@oksbi' },
  });
  record(
    'pending withdrawal reduces remaining balance',
    secondOverdraw.status === 400,
  );

  const inventedBalanceKeys = ['available', 'availableBalance', 'withdrawableBalance', 'wallet'];
  const hasInventedBalance = (payload) =>
    inventedBalanceKeys.some((key) => Object.hasOwn(payload ?? {}, key));

  record(
    'dashboard omits invented wallet fields',
    statsA.status === 200 &&
      !hasInventedBalance(statsA.body) &&
      !hasInventedBalance(statsA.body.earnings),
  );
  record(
    'earnings omits invented wallet fields',
    earningsA.status === 200 && !hasInventedBalance(earningsA.body),
  );

  const registered = providerAccountRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
  record(
    'provider account routes registered',
    registered.includes('GET /dashboard/stats') &&
      registered.includes('GET /earnings') &&
      registered.includes('POST /availability') &&
      registered.includes('PUT /availability/toggle-online') &&
      registered.includes('POST /withdraw'),
  );

  const health = await request(server, { method: 'GET', path: '/health' });
  record('health still returns 200', health.status === 200);
} catch (error) {
  record('phase 5 test runner', false, error.message);
} finally {
  if (createdTransactionIds.length > 0) {
    await Transaction.deleteMany({ _id: { $in: createdTransactionIds } });
  }
  if (createdUserIds.length > 0) {
    await Transaction.deleteMany({ userId: { $in: createdUserIds } });
  }
  if (createdProjectIds.length > 0) {
    await Project.deleteMany({ _id: { $in: createdProjectIds } });
  }
  if (createdGigIds.length > 0) {
    await Gig.deleteMany({ _id: { $in: createdGigIds } });
  }
  if (createdUserIds.length > 0) {
    await Gig.deleteMany({ providerId: { $in: createdUserIds } });
    await Project.deleteMany({
      $or: [{ providerId: { $in: createdUserIds } }, { customerId: { $in: createdUserIds } }],
    });
    await CustomerProfile.deleteMany({ userId: { $in: createdUserIds } });
    await ProviderProfile.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
}

const failed = results.filter((item) => !item.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
