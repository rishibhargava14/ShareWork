import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { setRazorpayClient, resetRazorpayClient } from '../../src/config/razorpay.js';
import Conversation from '../../src/models/Conversation.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import Dispute from '../../src/models/Dispute.js';
import Escrow from '../../src/models/Escrow.js';
import Project from '../../src/models/Project.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import Review from '../../src/models/Review.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';
import StoredFile from '../../src/models/StoredFile.js';
import { activateSignup } from '../helpers/activateSignup.js';
import { installMemoryStorage, uninstallMemoryStorage } from '../helpers/mockStorage.js';
import { PROJECT_SOCKET_EVENTS } from '../../src/services/escrow.service.js';
import { lockEscrow } from '../../src/services/escrow.service.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdProjectIds = [];

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const request = (server, { method, path, body, token, form }) => {
  if (form) {
    const url = `http://127.0.0.1:${server.address().port}${path}`;
    return fetch(url, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      const text = await res.text();
      let parsed = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }
      return { status: res.status, body: parsed };
    });
  }

  return new Promise((resolve, reject) => {
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
};

const pdfForm = (message, filename = 'work.pdf') => {
  const form = new FormData();
  form.append('message', message);
  form.append('files', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), filename);
  return form;
};

const signup = async (server, role, label) => {
  const suffix = { ca: '1', cb: '2', pa: '3', pb: '4' }[label];
  const response = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: `${role} ${label}`,
      email: `p7-${label}-${stamp}@example.com`,
      phone: `+9177${String(stamp).slice(-8)}${suffix}`,
      password: 'password12',
      role,
    },
  });
  if (response.body?.user?.id) createdUserIds.push(response.body.user.id);
  return activateSignup(response);
};

const seedProject = async (overrides = {}) => {
  const project = await Project.create({
    customerId: overrides.customerId,
    providerId: overrides.providerId,
    conversationId: overrides.conversationId ?? new mongoose.Types.ObjectId(),
    title: overrides.title ?? 'Phase 7 landing page',
    scope: 'Build the agreed marketing landing page for the customer.',
    deliverables: ['Figma file', 'Exported assets'],
    fixedPrice: overrides.fixedPrice ?? 15000,
    timelineDays: 7,
    revisionsAllowed: overrides.revisionsAllowed ?? 2,
    revisionsUsed: overrides.revisionsUsed ?? 0,
    status: overrides.status ?? 'agreement_pending',
    deadline: new Date(Date.now() + 7 * 86400000),
    escrow: overrides.escrow ?? { amount: overrides.fixedPrice ?? 15000, status: 'pending' },
  });
  createdProjectIds.push(String(project._id));
  return project;
};

setRazorpayClient({
  orders: {
    create: async (opts) => ({
      id: `order_test_${opts.notes.projectId}`,
      amount: opts.amount,
      currency: opts.currency,
      notes: opts.notes,
      receipt: opts.receipt,
      status: 'created',
    }),
  },
});

await connectDb();
const app = createApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  installMemoryStorage();
  record(
    'project socket events registered',
    PROJECT_SOCKET_EVENTS.includes('escrow_funded') &&
      PROJECT_SOCKET_EVENTS.includes('deliverable_submitted') &&
      PROJECT_SOCKET_EVENTS.includes('payment_released'),
  );

  const customerA = await signup(server, 'customer', 'ca');
  const customerB = await signup(server, 'customer', 'cb');
  const providerA = await signup(server, 'provider', 'pa');
  const providerB = await signup(server, 'provider', 'pb');
  const tokenCA = customerA.body.token;
  const tokenCB = customerB.body.token;
  const tokenPA = providerA.body.token;
  const tokenPB = providerB.body.token;
  const ca = customerA.body.user.id;
  const cb = customerB.body.user.id;
  const pa = providerA.body.user.id;
  const pb = providerB.body.user.id;

  const pending = await seedProject({ customerId: ca, providerId: pa });
  const other = await seedProject({ customerId: cb, providerId: pb, title: 'Other customer project' });

  const unauthList = await request(server, { method: 'GET', path: '/api/projects?role=customer' });
  record('unauthenticated list rejected', unauthList.status === 401);

  const listed = await request(server, {
    method: 'GET',
    path: '/api/projects?role=customer',
    token: tokenCA,
  });
  record(
    'customer sees own projects',
    listed.status === 200 &&
      listed.body.projects.length === 1 &&
      listed.body.projects[0].id === String(pending._id),
  );

  const listedProvider = await request(server, {
    method: 'GET',
    path: '/api/projects?role=provider',
    token: tokenPA,
  });
  record(
    'provider sees own projects',
    listedProvider.status === 200 && listedProvider.body.projects[0].id === String(pending._id),
  );

  const roleOverride = await request(server, {
    method: 'GET',
    path: '/api/projects?role=provider',
    token: tokenCA,
  });
  record(
    'role filter cannot override identity',
    roleOverride.status === 200 && roleOverride.body.projects.length === 0,
  );

  const otherDetail = await request(server, {
    method: 'GET',
    path: `/api/projects/${other._id}`,
    token: tokenCA,
  });
  record('cross-user project detail rejected', otherDetail.status === 403);

  const ownDetail = await request(server, {
    method: 'GET',
    path: `/api/projects/${pending._id}`,
    token: tokenCA,
  });
  record('owner can read project detail', ownDetail.status === 200 && ownDetail.body.project.status === 'agreement_pending');

  const providerSubmitEarly = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/submit-deliverable`,
    token: tokenPA,
    body: { files: ['https://cdn.test/sharework/work.pdf'], message: 'Draft files' },
  });
  record('client file URLs rejected', providerSubmitEarly.status === 400);

  const customerSubmit = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/submit-deliverable`,
    token: tokenCA,
    form: pdfForm('I am the customer', 'customer.pdf'),
  });
  record('customer cannot submit deliverable', customerSubmit.status === 403);

  const crossFund = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/fund-escrow`,
    token: tokenCB,
  });
  record('cross-user fund rejected', crossFund.status === 403);

  const fund = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/fund-escrow`,
    token: tokenCA,
  });
  record(
    'agreement_pending project can create fund order',
    fund.status === 200 && fund.body.orderId === `order_test_${pending._id}` && fund.body.currency === 'INR',
  );

  await lockEscrow({ projectId: pending._id, customerId: ca, providerId: pa, gatewayTransactionId: 'pay_test_lock' });

  const fundAgain = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/fund-escrow`,
    token: tokenCA,
  });
  record('funded project cannot be funded again', fundAgain.status === 400);

  const otherSubmit = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/submit-deliverable`,
    token: tokenPB,
    form: pdfForm('Wrong provider', 'wrong.pdf'),
  });
  record('cross-user deliverable submission rejected', otherSubmit.status === 403);

  const badFile = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/submit-deliverable`,
    token: tokenPA,
    body: { files: ['http://169.254.169.254/secret'], message: 'Bad file' },
  });
  record('invalid deliverable files rejected', badFile.status === 400);

  const approveEarly = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/approve-deliverable`,
    token: tokenCA,
  });
  record('approve rejected before delivered', approveEarly.status === 400);

  const submitted = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/submit-deliverable`,
    token: tokenPA,
    form: pdfForm('Final delivery', 'final.pdf'),
  });
  const deliveredFile = submitted.body.project?.deliverablesHistory?.[0]?.files?.[0];
  record(
    'provider submits deliverable',
    submitted.status === 200 &&
      submitted.body.project.status === 'delivered' &&
      String(deliveredFile?.url || '').startsWith('/api/files/'),
  );

  const ownerFile = await request(server, {
    method: 'GET',
    path: deliveredFile.url,
    token: tokenCA,
  });
  record('project customer can download deliverable', ownerFile.status === 200);

  const strangerFile = await request(server, {
    method: 'GET',
    path: deliveredFile.url,
    token: tokenCB,
  });
  record('unrelated customer cannot download deliverable', strangerFile.status === 403);

  const anonFile = await request(server, {
    method: 'GET',
    path: deliveredFile.url,
  });
  record('unauthenticated deliverable download rejected', anonFile.status === 401);

  const providerApprove = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/approve-deliverable`,
    token: tokenPA,
  });
  record('provider cannot approve deliverable', providerApprove.status === 403);

  const revised = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/request-revision`,
    token: tokenCA,
    body: { message: 'Please adjust the hero section.' },
  });
  record(
    'revision returns delivered to in_progress',
    revised.status === 200 &&
      revised.body.project.status === 'in_progress' &&
      revised.body.project.revisionsUsed === 1,
  );

  const escrowAfterRevision = await Escrow.findOne({ projectId: pending._id }).lean();
  record('revision does not release escrow', escrowAfterRevision?.status === 'locked');

  const submittedAgain = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/submit-deliverable`,
    token: tokenPA,
    form: pdfForm('Revised delivery', 'final-2.pdf'),
  });
  record('resubmission after revision is delivered', submittedAgain.status === 200 && submittedAgain.body.project.status === 'delivered');

  const approved = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/approve-deliverable`,
    token: tokenCA,
  });
  record(
    'customer approval completes project',
    approved.status === 200 && approved.body.project.status === 'completed',
  );

  const approveAgain = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/approve-deliverable`,
    token: tokenCA,
  });
  record('completed project cannot be approved again', approveAgain.status === 400);

  const reviseCompleted = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/request-revision`,
    token: tokenCA,
    body: { message: 'Too late.' },
  });
  record('completed project cannot be revised', reviseCompleted.status === 400);

  const limitProject = await seedProject({
    customerId: ca,
    providerId: pa,
    title: 'Revision limit project',
    revisionsAllowed: 1,
    revisionsUsed: 0,
    status: 'in_progress',
    escrow: { amount: 15000, status: 'locked' },
  });
  await Escrow.create({
    projectId: limitProject._id,
    customerId: ca,
    providerId: pa,
    amount: 15000,
    fee: 1500,
    gst: 270,
    net: 13230,
    status: 'locked',
  });
  await Project.updateOne({ _id: limitProject._id }, { $set: { status: 'delivered' } });
  const firstRev = await request(server, {
    method: 'POST',
    path: `/api/projects/${limitProject._id}/request-revision`,
    token: tokenCA,
    body: { message: 'One change please.' },
  });
  await Project.updateOne({ _id: limitProject._id }, { $set: { status: 'delivered' } });
  const limitRev = await request(server, {
    method: 'POST',
    path: `/api/projects/${limitProject._id}/request-revision`,
    token: tokenCA,
    body: { message: 'Another change.' },
  });
  record('revision count increments', firstRev.status === 200 && firstRev.body.project.revisionsUsed === 1);
  record('revision limit enforced', limitRev.status === 400);

  const completedDispute = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/dispute`,
    token: tokenCA,
    body: { reason: 'Late delivery', description: 'The completed work cannot be disputed.' },
  });
  record('completed project cannot be disputed', completedDispute.status === 400);

  const disputeProject = await seedProject({
    customerId: ca,
    providerId: pa,
    title: 'Dispute eligible project',
    status: 'in_progress',
    escrow: { amount: 15000, status: 'locked' },
  });
  await Escrow.create({
    projectId: disputeProject._id,
    customerId: ca,
    providerId: pa,
    amount: 15000,
    fee: 1500,
    gst: 270,
    net: 13230,
    status: 'locked',
  });

  const outsiderDispute = await request(server, {
    method: 'POST',
    path: `/api/projects/${disputeProject._id}/dispute`,
    token: tokenCB,
    body: { reason: 'Not my project', description: 'Outsider should not open this dispute.' },
  });
  record('outsider cannot open a dispute', outsiderDispute.status === 403);

  const opened = await request(server, {
    method: 'POST',
    path: `/api/projects/${disputeProject._id}/dispute`,
    token: tokenCA,
    body: { reason: 'Quality issue', description: 'Deliverable does not match the agreed scope.' },
  });
  record(
    'participant can open a dispute',
    opened.status === 201 &&
      opened.body.dispute?.status === 'open' &&
      opened.body.project?.status === 'disputed',
  );

  const duplicateDispute = await request(server, {
    method: 'POST',
    path: `/api/projects/${disputeProject._id}/dispute`,
    token: tokenPA,
    body: { reason: 'Same issue again', description: 'A second open dispute must be rejected.' },
  });
  record('duplicate open dispute rejected', duplicateDispute.status === 409);

  const providerReview = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/review`,
    token: tokenPA,
    body: { rating: 5, comment: 'I cannot review my own delivery.' },
  });
  record('provider cannot review a project', providerReview.status === 403);

  const reviewBefore = await request(server, {
    method: 'POST',
    path: `/api/projects/${other._id}/review`,
    token: tokenCB,
    body: { rating: 4, comment: 'Work is not finished yet.' },
  });
  record('review before completion rejected', reviewBefore.status === 400);

  const reviewed = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/review`,
    token: tokenCA,
    body: { rating: 5, comment: 'Excellent work after the revision.' },
  });
  record(
    'customer can review a completed project',
    reviewed.status === 201 && reviewed.body.review?.rating === 5,
  );

  const duplicateReview = await request(server, {
    method: 'POST',
    path: `/api/projects/${pending._id}/review`,
    token: tokenCA,
    body: { rating: 4, comment: 'Second review should fail.' },
  });
  record('duplicate review rejected', duplicateReview.status === 409);

  const health = await request(server, { method: 'GET', path: '/health' });
  record('health still returns 200', health.status === 200);
} catch (error) {
  record('phase 7 project test runner', false, error.message);
} finally {
  uninstallMemoryStorage();
  resetRazorpayClient();
  if (createdProjectIds.length > 0) {
    await StoredFile.deleteMany({ projectId: { $in: createdProjectIds } });
    await Transaction.deleteMany({ projectId: { $in: createdProjectIds } });
    await Escrow.deleteMany({ projectId: { $in: createdProjectIds } });
    await Dispute.deleteMany({ projectId: { $in: createdProjectIds } });
    await Review.deleteMany({ projectId: { $in: createdProjectIds } });
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
