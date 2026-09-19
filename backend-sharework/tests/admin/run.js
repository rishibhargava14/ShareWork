import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { DISCOVERY_PAGE_SIZE } from '../../src/constants/pagination.js';
import AdminUser from '../../src/models/AdminUser.js';
import Conversation from '../../src/models/Conversation.js';
import Dispute from '../../src/models/Dispute.js';
import Escrow from '../../src/models/Escrow.js';
import LeakageLog from '../../src/models/LeakageLog.js';
import Project from '../../src/models/Project.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';
import adminRoutes from '../../src/routes/admin.routes.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdProjectIds = [];
const createdEscrowIds = [];
const createdTransactionIds = [];
const createdDisputeIds = [];
const createdLeakageIds = [];
const createdConversationIds = [];
const createdAdminLinkIds = [];

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

const hasSensitive = (value) => {
  const text = JSON.stringify(value);
  return ['passwordHash', '"otp"', 'otpExpiry', 'JWT_SECRET', 'AWS_SECRET'].some((key) =>
    text.includes(key),
  );
};

const createUser = async (role, label) => {
  const seq = String(createdUserIds.length + 1).padStart(3, '0');
  const user = await User.create({
    name: `Phase8 ${role} ${label}`,
    email: `p8-${role}-${label}-${stamp}@example.com`,
    phone: `+9188${String(stamp).slice(-6)}${seq}`,
    passwordHash: await hashPassword('password12'),
    role,
    isVerified: true,
  });
  createdUserIds.push(String(user._id));
  return user;
};

await connectDb();
const app = createApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  const registered = adminRoutes.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods)
        .filter((method) => method !== '_all')
        .map((method) => `${method.toUpperCase()} ${layer.route.path}`),
    );
  record(
    'admin routes registered once',
    registered.includes('GET /stats') &&
      registered.includes('GET /users') &&
      registered.includes('GET /projects') &&
      registered.includes('GET /escrows') &&
      registered.includes('GET /leakage-logs') &&
      registered.includes('POST /disputes/:id/resolve') &&
      registered.includes('PUT /users/:id/ban') &&
      registered.filter((key) => key === 'GET /stats').length === 1,
  );

  const admin = await createUser('admin', '1');
  const customer = await createUser('customer', '1');
  const provider = await createUser('provider', '1');
  const extraProvider = await createUser('provider', '2');
  const adminLink = await AdminUser.create({ userId: admin._id });
  createdAdminLinkIds.push(String(adminLink._id));

  const tokenA = signAccessToken(admin);
  const tokenC = signAccessToken(customer);
  const tokenP = signAccessToken(provider);

  const conversation = await Conversation.create({
    participants: [customer._id, provider._id],
  });
  createdConversationIds.push(String(conversation._id));
  const listingConversation = await Conversation.create({
    participants: [customer._id, extraProvider._id],
  });
  createdConversationIds.push(String(listingConversation._id));
  const refundConversation = await Conversation.create({
    participants: [customer._id, extraProvider._id],
  });
  createdConversationIds.push(String(refundConversation._id));

  const project = await Project.create({
    customerId: customer._id,
    providerId: provider._id,
    conversationId: conversation._id,
    title: 'Phase 8 admin review project',
    scope: 'Used only to verify admin listing and dispute resolution.',
    deliverables: ['Files'],
    fixedPrice: 15000,
    timelineDays: 7,
    status: 'in_progress',
    deadline: new Date(Date.now() + 86400000),
    escrow: { amount: 15000, status: 'locked' },
  });
  createdProjectIds.push(String(project._id));

  const otherProject = await Project.create({
    customerId: customer._id,
    providerId: extraProvider._id,
    conversationId: listingConversation._id,
    title: 'Phase 8 completed listing project',
    scope: 'Second project used only for admin status filtering.',
    deliverables: ['Files'],
    fixedPrice: 5000,
    timelineDays: 3,
    status: 'completed',
    deadline: new Date(Date.now() + 86400000),
    escrow: { amount: 5000, status: 'released' },
  });
  createdProjectIds.push(String(otherProject._id));

  const escrow = await Escrow.create({
    projectId: project._id,
    customerId: customer._id,
    providerId: provider._id,
    amount: 15000,
    fee: 1500,
    gst: 270,
    net: 13230,
    status: 'locked',
    lockedAt: new Date(),
  });
  createdEscrowIds.push(String(escrow._id));

  const leakage = await LeakageLog.create({
    conversationId: conversation._id,
    senderId: customer._id,
    detectedType: 'phone',
    content: 'Call me at 9876543210',
    maskedContent: 'Call me at [PHONE HIDDEN]',
    action: 'blocked',
  });
  createdLeakageIds.push(String(leakage._id));

  const dispute = await Dispute.create({
    projectId: project._id,
    raisedBy: customer._id,
    reason: 'Missed deadline',
    description: 'Provider did not deliver the agreed files.',
    status: 'open',
  });
  createdDisputeIds.push(String(dispute._id));

  const txs = await Transaction.create([
    {
      projectId: project._id,
      userId: provider._id,
      type: 'fee',
      amount: 1500,
      fee: 1500,
      gst: 0,
      netAmount: 1500,
      status: 'completed',
    },
    {
      projectId: project._id,
      userId: provider._id,
      type: 'gst',
      amount: 270,
      fee: 0,
      gst: 270,
      netAmount: 270,
      status: 'completed',
    },
    {
      projectId: project._id,
      userId: customer._id,
      type: 'escrow_fund',
      amount: 15000,
      fee: 1500,
      gst: 270,
      netAmount: 15000,
      status: 'completed',
    },
    {
      projectId: project._id,
      userId: provider._id,
      type: 'escrow_release',
      amount: 15000,
      fee: 1500,
      gst: 270,
      netAmount: 13230,
      status: 'completed',
    },
    {
      userId: provider._id,
      type: 'withdrawal',
      amount: 5000,
      fee: 0,
      gst: 0,
      netAmount: 5000,
      status: 'completed',
      upiId: 'provider@oksbi',
    },
    {
      projectId: project._id,
      userId: provider._id,
      type: 'fee',
      amount: 999,
      fee: 999,
      gst: 0,
      netAmount: 999,
      status: 'pending',
    },
  ]);
  createdTransactionIds.push(...txs.map((item) => String(item._id)));

  const authTargets = [
    ['GET', '/api/admin/stats'],
    ['GET', '/api/admin/users?role=customer&page=1'],
    ['GET', '/api/admin/projects'],
    ['GET', '/api/admin/escrows'],
    ['GET', '/api/admin/leakage-logs'],
  ];

  for (const [method, path] of authTargets) {
    const unauth = await request(server, { method, path });
    record(`unauthenticated ${path} rejected`, unauth.status === 401);
    const asCustomer = await request(server, { method, path, token: tokenC });
    record(`customer ${path} rejected`, asCustomer.status === 403);
    const asProvider = await request(server, { method, path, token: tokenP });
    record(`provider ${path} rejected`, asProvider.status === 403);
  }

  const unauthResolve = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${dispute._id}/resolve`,
    body: { resolution: 'Should not work' },
  });
  record('unauthenticated resolve rejected', unauthResolve.status === 401);
  const customerResolve = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${dispute._id}/resolve`,
    token: tokenC,
    body: { resolution: 'Customer cannot resolve' },
  });
  record('customer resolve rejected', customerResolve.status === 403);
  const providerResolve = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${dispute._id}/resolve`,
    token: tokenP,
    body: { resolution: 'Provider cannot resolve' },
  });
  record('provider resolve rejected', providerResolve.status === 403);

  const unauthBan = await request(server, {
    method: 'PUT',
    path: `/api/admin/users/${customer._id}/ban`,
    body: { isBanned: true, reason: 'Should not work' },
  });
  record('unauthenticated ban rejected', unauthBan.status === 401);
  const customerBan = await request(server, {
    method: 'PUT',
    path: `/api/admin/users/${provider._id}/ban`,
    token: tokenC,
    body: { isBanned: true, reason: 'Customer cannot ban' },
  });
  record('customer ban rejected', customerBan.status === 403);
  const providerBan = await request(server, {
    method: 'PUT',
    path: `/api/admin/users/${customer._id}/ban`,
    token: tokenP,
    body: { isBanned: true, reason: 'Provider cannot ban' },
  });
  record('provider ban rejected', providerBan.status === 403);

  const expectedUsers = await User.countDocuments({ role: { $in: ['customer', 'provider'] } });
  const expectedProjects = await Project.countDocuments();
  const expectedLocked = await Escrow.countDocuments({ status: 'locked' });
  const expectedLeakage = await LeakageLog.countDocuments();
  const [revenueAgg] = await Transaction.aggregate([
    { $match: { type: { $in: ['fee', 'gst'] }, status: 'completed' } },
    { $group: { _id: null, revenue: { $sum: '$amount' } } },
  ]);
  const expectedRevenue = revenueAgg?.revenue ?? 0;

  const stats = await request(server, { method: 'GET', path: '/api/admin/stats', token: tokenA });
  record('admin stats succeed', stats.status === 200);
  record('stats users match User count', stats.body.users === expectedUsers);
  record('stats projects match Project count', stats.body.projects === expectedProjects);
  record('stats escrowLocked matches locked Escrow count', stats.body.escrowLocked === expectedLocked);
  record('stats leakageCount matches LeakageLog count', stats.body.leakageCount === expectedLeakage);
  record('stats revenue is completed fee+gst only', stats.body.revenue === expectedRevenue);
  record('revenue includes seeded fee+gst', expectedRevenue >= 1770);
  record(
    'revenue excludes principal and withdrawal',
    stats.body.revenue !== 15000 &&
      stats.body.revenue !== 5000 &&
      stats.body.revenue !== expectedRevenue + 15000 &&
      stats.body.revenue !== expectedRevenue + 5000,
  );
  record('pending fee is not counted in expected revenue', expectedRevenue % 1 === 0);

  const customerPage = await request(server, {
    method: 'GET',
    path: '/api/admin/users?role=customer&page=1',
    token: tokenA,
  });
  record(
    'admin customer filter',
    customerPage.status === 200 &&
      customerPage.body.users.every((user) => user.role === 'customer') &&
      customerPage.body.users.some((user) => user.id === String(customer._id)),
  );

  const providerPage = await request(server, {
    method: 'GET',
    path: '/api/admin/users?role=provider&page=1',
    token: tokenA,
  });
  record(
    'admin provider filter',
    providerPage.status === 200 &&
      providerPage.body.users.every((user) => user.role === 'provider') &&
      providerPage.body.users.some((user) => user.id === String(provider._id)),
  );

  const invalidRole = await request(server, {
    method: 'GET',
    path: '/api/admin/users?role=admin&page=1',
    token: tokenA,
  });
  record('invalid user role rejected', invalidRole.status === 400);

  const extraCustomers = [];
  for (let index = 0; index < DISCOVERY_PAGE_SIZE + 1; index += 1) {
    extraCustomers.push(await createUser('customer', `p${index}`));
  }
  const page1 = await request(server, {
    method: 'GET',
    path: '/api/admin/users?role=customer&page=1',
    token: tokenA,
  });
  const page2 = await request(server, {
    method: 'GET',
    path: '/api/admin/users?role=customer&page=2',
    token: tokenA,
  });
  record(
    'user pagination page 1 uses existing page size',
    page1.status === 200 && page1.body.users.length === DISCOVERY_PAGE_SIZE && page1.body.page === 1,
  );
  record(
    'user pagination page 2 is deterministic leftover',
    page2.status === 200 &&
      page2.body.page === 2 &&
      page2.body.users.length >= 1 &&
      page2.body.users.every((user) => !page1.body.users.some((first) => first.id === user.id)),
  );
  record(
    'user list omits secrets',
    !hasSensitive(customerPage.body) &&
      !hasSensitive(providerPage.body) &&
      customerPage.body.users.every((user) => user.passwordHash === undefined && user.otp === undefined),
  );

  const projects = await request(server, { method: 'GET', path: '/api/admin/projects', token: tokenA });
  record(
    'admin can list all projects',
    projects.status === 200 &&
      projects.body.projects.some((item) => item.id === String(project._id)) &&
      projects.body.projects.some((item) => item.id === String(otherProject._id)),
  );
  const filtered = await request(server, {
    method: 'GET',
    path: '/api/admin/projects?status=completed',
    token: tokenA,
  });
  record(
    'project status filter',
    filtered.status === 200 &&
      filtered.body.projects.every((item) => item.status === 'completed') &&
      filtered.body.projects.some((item) => item.id === String(otherProject._id)),
  );
  const badStatus = await request(server, {
    method: 'GET',
    path: '/api/admin/projects?status=not_a_status',
    token: tokenA,
  });
  record('invalid project status rejected', badStatus.status === 400);
  const ids = projects.body.projects.map((item) => item.id);
  record('project list is deterministic', ids.join(',') === [...ids].join(','));
  record('project list omits secrets', !hasSensitive(projects.body));

  const escrows = await request(server, { method: 'GET', path: '/api/admin/escrows', token: tokenA });
  const listedEscrow = escrows.body.escrows.find((item) => item.id === String(escrow._id));
  record(
    'admin can list escrows',
    escrows.status === 200 &&
      listedEscrow?.projectId === String(project._id) &&
      listedEscrow.amount === 15000 &&
      listedEscrow.fee === 1500 &&
      listedEscrow.gst === 270 &&
      listedEscrow.net === 13230 &&
      listedEscrow.status === 'locked' &&
      listedEscrow.disputeId === null,
  );
  record('escrow list omits secrets', !hasSensitive(escrows.body));

  const logs = await request(server, { method: 'GET', path: '/api/admin/leakage-logs', token: tokenA });
  const listedLog = logs.body.logs.find((item) => item.id === String(leakage._id));
  record(
    'admin can list leakage logs',
    logs.status === 200 && listedLog?.maskedContent === 'Call me at [PHONE HIDDEN]',
  );
  record('leakage log omits raw content', listedLog && !Object.hasOwn(listedLog, 'content'));
  record('leakage logs omit secrets', !hasSensitive(logs.body));
  const logIds = logs.body.logs.map((item) => item.id);
  record(
    'leakage logs are newest first',
    logIds[0] === listedLog.id || logs.body.logs[0].createdAt >= listedLog.createdAt,
  );

  const missingDispute = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${new mongoose.Types.ObjectId()}/resolve`,
    token: tokenA,
    body: { resolution: 'No such dispute' },
  });
  record('invalid dispute rejected', missingDispute.status === 404);

  const resolved = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${dispute._id}/resolve`,
    token: tokenA,
    body: { resolution: 'Work accepted after review', refund: false },
  });
  record(
    'admin can resolve with refund=false',
    resolved.status === 200 &&
      resolved.body.dispute.status === 'resolved' &&
      resolved.body.dispute.resolution === 'Work accepted after review',
  );
  const stored = await Dispute.findById(dispute._id).lean();
  record('resolution is persisted', stored.status === 'resolved' && stored.resolution === 'Work accepted after review');

  const repeat = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${dispute._id}/resolve`,
    token: tokenA,
    body: { resolution: 'Try again' },
  });
  record('repeated resolution rejected', repeat.status === 400);

  const refundProject = await Project.create({
    customerId: customer._id,
    providerId: extraProvider._id,
    conversationId: refundConversation._id,
    title: 'Phase 8 refund project',
    scope: 'Used only to verify admin refund resolution.',
    deliverables: ['Files'],
    fixedPrice: 15000,
    timelineDays: 7,
    status: 'disputed',
    deadline: new Date(Date.now() + 86400000),
    escrow: { amount: 15000, status: 'locked' },
  });
  createdProjectIds.push(String(refundProject._id));
  await Escrow.create({
    projectId: refundProject._id,
    customerId: customer._id,
    providerId: extraProvider._id,
    amount: 15000,
    fee: 1500,
    gst: 270,
    net: 13230,
    status: 'locked',
    lockedAt: new Date(),
  });
  const refundDispute = await Dispute.create({
    projectId: refundProject._id,
    raisedBy: customer._id,
    reason: 'Quality issue',
    description: 'Deliverable does not match the agreed scope.',
    status: 'open',
  });
  createdDisputeIds.push(String(refundDispute._id));

  const refundTrue = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${refundDispute._id}/resolve`,
    token: tokenA,
    body: { resolution: 'Refund requested', refund: true },
  });
  record(
    'refund=true resolves the dispute',
    refundTrue.status === 200 && refundTrue.body.dispute.status === 'resolved',
  );
  const refundedEscrow = await Escrow.findOne({ projectId: refundProject._id }).lean();
  const refundedProject = await Project.findById(refundProject._id).lean();
  record(
    'refund marks escrow refunded and project cancelled',
    refundedEscrow?.status === 'refunded' && refundedProject?.status === 'cancelled',
  );
  record(
    'refund transaction is created once',
    (await Transaction.countDocuments({ projectId: refundProject._id, type: 'refund' })) === 1,
  );
  const refundAgain = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${refundDispute._id}/resolve`,
    token: tokenA,
    body: { resolution: 'Refund again', refund: true },
  });
  record('duplicate refund resolve is rejected', refundAgain.status === 400);
  record(
    'duplicate refund does not create a second refund row',
    (await Transaction.countDocuments({ projectId: refundProject._id, type: 'refund' })) === 1,
  );

  const beforeBan = await User.findById(extraProvider._id).select('+passwordHash +otp +otpExpiry');
  const banned = await request(server, {
    method: 'PUT',
    path: `/api/admin/users/${extraProvider._id}/ban`,
    token: tokenA,
    body: { isBanned: true, reason: 'Policy violation' },
  });
  record(
    'admin can ban',
    banned.status === 200 && banned.body.user.isBanned === true && banned.body.user.bannedReason === 'Policy violation',
  );
  const afterBan = await User.findById(extraProvider._id).select('+passwordHash +otp +otpExpiry');
  record('ban does not change role', afterBan.role === 'provider');
  record('ban does not change email or phone', afterBan.email === beforeBan.email && afterBan.phone === beforeBan.phone);
  record(
    'ban leaves password and otp untouched',
    afterBan.passwordHash === beforeBan.passwordHash &&
      afterBan.otp === beforeBan.otp &&
      String(afterBan.otpExpiry) === String(beforeBan.otpExpiry),
  );
  record('banned state persists', afterBan.isBanned === true);

  const missingReason = await request(server, {
    method: 'PUT',
    path: `/api/admin/users/${customer._id}/ban`,
    token: tokenA,
    body: { isBanned: true },
  });
  record('ban reason is required', missingReason.status === 400);

  const loginBanned = await request(server, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: extraProvider.email, password: 'password12', role: 'provider' },
  });
  record('banned user cannot login', loginBanned.status === 403);

  const unbanned = await request(server, {
    method: 'PUT',
    path: `/api/admin/users/${extraProvider._id}/ban`,
    token: tokenA,
    body: { isBanned: false },
  });
  record(
    'admin can unban',
    unbanned.status === 200 && unbanned.body.user.isBanned === false && unbanned.body.user.bannedReason === '',
  );
  const afterUnban = await User.findById(extraProvider._id);
  record('unban clears bannedReason only', afterUnban.isBanned === false && afterUnban.bannedReason === '' && afterUnban.role === 'provider');

  const missingUser = await request(server, {
    method: 'PUT',
    path: `/api/admin/users/${new mongoose.Types.ObjectId()}/ban`,
    token: tokenA,
    body: { isBanned: true, reason: 'Unknown user' },
  });
  record('ban missing user rejected', missingUser.status === 404);

  const health = await request(server, { method: 'GET', path: '/health' });
  record('health still returns 200', health.status === 200);
} catch (error) {
  record('phase 8 admin test runner', false, error.message);
} finally {
  if (createdTransactionIds.length > 0) {
    await Transaction.deleteMany({ _id: { $in: createdTransactionIds } });
  }
  if (createdProjectIds.length > 0) {
    await Transaction.deleteMany({ projectId: { $in: createdProjectIds } });
    await Escrow.deleteMany({ projectId: { $in: createdProjectIds } });
  }
  if (createdEscrowIds.length > 0) {
    await Escrow.deleteMany({ _id: { $in: createdEscrowIds } });
  }
  if (createdDisputeIds.length > 0) {
    await Dispute.deleteMany({ _id: { $in: createdDisputeIds } });
  }
  if (createdLeakageIds.length > 0) {
    await LeakageLog.deleteMany({ _id: { $in: createdLeakageIds } });
  }
  if (createdProjectIds.length > 0) {
    await Project.deleteMany({ _id: { $in: createdProjectIds } });
  }
  if (createdConversationIds.length > 0) {
    await Conversation.deleteMany({ _id: { $in: createdConversationIds } });
  }
  if (createdAdminLinkIds.length > 0) {
    await AdminUser.deleteMany({ _id: { $in: createdAdminLinkIds } });
  }
  if (createdUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
}

const failed = results.filter((item) => !item.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
