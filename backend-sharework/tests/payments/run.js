import crypto from 'node:crypto';
import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { env } from '../../src/config/env.js';
import { resetRazorpayClient, setRazorpayClient } from '../../src/config/razorpay.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import Escrow from '../../src/models/Escrow.js';
import Project from '../../src/models/Project.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';
import { activateSignup } from '../helpers/activateSignup.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdProjectIds = [];

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const request = (server, { method, path, body, token, headers = {}, raw }) =>
  new Promise((resolve, reject) => {
    const payload = raw ?? (body ? JSON.stringify(body) : null);
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
          ...headers,
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

const signup = async (server, role, label) => {
  const response = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: `${role} ${label}`,
      email: `pay-${label}-${stamp}@example.com`,
      phone: `+9176${String(stamp).slice(-8)}${label === 'ca' ? '1' : label === 'cb' ? '2' : '3'}`,
      password: 'password12',
      role,
    },
  });
  if (response.body?.user?.id) createdUserIds.push(response.body.user.id);
  return activateSignup(response);
};

const seedProject = async (overrides) => {
  const project = await Project.create({
    conversationId: new mongoose.Types.ObjectId(),
    title: 'Payment test project',
    scope: 'Escrow funding verification project used only in Phase 7 tests.',
    deliverables: ['Files'],
    fixedPrice: 15000,
    timelineDays: 7,
    status: 'agreement_pending',
    deadline: new Date(Date.now() + 86400000),
    escrow: { amount: 15000, status: 'pending' },
    ...overrides,
  });
  createdProjectIds.push(String(project._id));
  return project;
};

const signWebhook = (raw) =>
  crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');

setRazorpayClient({
  orders: {
    create: async (opts) => ({
      id: `order_test_${opts.notes.projectId}`,
      amount: opts.amount,
      currency: 'INR',
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
  const customer = await signup(server, 'customer', 'ca');
  const other = await signup(server, 'customer', 'cb');
  const provider = await signup(server, 'provider', 'pa');
  const tokenC = customer.body.token;
  const tokenO = other.body.token;
  const project = await seedProject({
    customerId: customer.body.user.id,
    providerId: provider.body.user.id,
  });

  const unauth = await request(server, {
    method: 'POST',
    path: '/api/payments/create-order',
    body: { projectId: String(project._id) },
  });
  record('unauthenticated create-order rejected', unauth.status === 401);

  const nonOwner = await request(server, {
    method: 'POST',
    path: '/api/payments/create-order',
    token: tokenO,
    body: { projectId: String(project._id) },
  });
  record('non-owner cannot create order', nonOwner.status === 403);

  const missing = await request(server, {
    method: 'POST',
    path: '/api/payments/create-order',
    token: tokenC,
    body: { projectId: String(new mongoose.Types.ObjectId()) },
  });
  record('wrong project rejected', missing.status === 404);

  const created = await request(server, {
    method: 'POST',
    path: '/api/payments/create-order',
    token: tokenC,
    body: { projectId: String(project._id) },
  });
  record(
    'customer can create razorpay order via stub',
    created.status === 200 &&
      created.body.orderId === `order_test_${project._id}` &&
      created.body.amount === 1500000 &&
      created.body.currency === 'INR',
  );
  record('order id is not a claimed live payment', String(created.body.orderId).startsWith('order_test_'));

  const stillPending = await Project.findById(project._id).lean();
  record('creating an order does not fund escrow', stillPending.status === 'agreement_pending');

  const invalidSig = await request(server, {
    method: 'POST',
    path: '/api/payments/verify',
    raw: JSON.stringify({ event: 'payment.captured', payload: {} }),
    headers: { 'x-razorpay-signature': 'deadbeef' },
  });
  record('invalid signature rejected', invalidSig.status === 400);

  const event = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_verified',
          notes: { projectId: String(project._id) },
        },
      },
    },
  };
  const raw = JSON.stringify(event);
  const verified = await request(server, {
    method: 'POST',
    path: '/api/payments/verify',
    raw,
    headers: { 'x-razorpay-signature': signWebhook(raw) },
  });
  record(
    'successful verified payment funds escrow',
    verified.status === 200 &&
      verified.body.alreadyProcessed === false &&
      verified.body.status === 'in_progress',
  );

  const escrowCount = await Escrow.countDocuments({ projectId: project._id });
  const fundCount = await Transaction.countDocuments({ projectId: project._id, type: 'escrow_fund' });
  record('locked escrow created once', escrowCount === 1);
  record('escrow_fund transaction created once', fundCount === 1);

  const retry = await request(server, {
    method: 'POST',
    path: '/api/payments/verify',
    raw,
    headers: { 'x-razorpay-signature': signWebhook(raw) },
  });
  record(
    'webhook retry is idempotent',
    retry.status === 200 &&
      retry.body.alreadyProcessed === true &&
      (await Escrow.countDocuments({ projectId: project._id })) === 1 &&
      (await Transaction.countDocuments({ projectId: project._id, type: 'escrow_fund' })) === 1,
  );

  const fundedAgain = await request(server, {
    method: 'POST',
    path: '/api/payments/create-order',
    token: tokenC,
    body: { projectId: String(project._id) },
  });
  record('cannot create order twice for funded project', fundedAgain.status === 400);

  const txMe = await request(server, { method: 'GET', path: '/api/transactions/me', token: tokenC });
  const txOther = await request(server, { method: 'GET', path: '/api/transactions/me', token: tokenO });
  record(
    'user only sees own funding transaction',
    txMe.status === 200 &&
      txMe.body.transactions.length === 1 &&
      txMe.body.transactions[0].type === 'escrow_fund' &&
      txMe.body.transactions[0].userId === customer.body.user.id,
  );
  record('transactions do not leak across users', txOther.status === 200 && txOther.body.transactions.length === 0);

  const unauthTx = await request(server, { method: 'GET', path: '/api/transactions/me' });
  record('unauthenticated transactions rejected', unauthTx.status === 401);

  const checkoutProject = await seedProject({
    customerId: customer.body.user.id,
    providerId: provider.body.user.id,
  });
  const checkoutOrder = await request(server, {
    method: 'POST',
    path: '/api/payments/create-order',
    token: tokenC,
    body: { projectId: String(checkoutProject._id) },
  });
  const checkoutBad = await request(server, {
    method: 'POST',
    path: '/api/payments/verify-checkout',
    token: tokenC,
    body: {
      projectId: String(checkoutProject._id),
      razorpay_order_id: checkoutOrder.body.orderId,
      razorpay_payment_id: 'pay_chk_bad',
      razorpay_signature: 'deadbeef',
    },
  });
  record('checkout bad signature rejected', checkoutBad.status === 400);

  const checkoutHmac = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${checkoutOrder.body.orderId}|pay_chk_ok`)
    .digest('hex');
  const checkoutOk = await request(server, {
    method: 'POST',
    path: '/api/payments/verify-checkout',
    token: tokenC,
    body: {
      projectId: String(checkoutProject._id),
      razorpay_order_id: checkoutOrder.body.orderId,
      razorpay_payment_id: 'pay_chk_ok',
      razorpay_signature: checkoutHmac,
    },
  });
  record(
    'checkout signature funds escrow',
    checkoutOk.status === 200 && checkoutOk.body.status === 'in_progress',
  );

  const providerCheckout = await request(server, {
    method: 'POST',
    path: '/api/payments/verify-checkout',
    token: provider.body.token,
    body: {
      projectId: String(checkoutProject._id),
      razorpay_order_id: checkoutOrder.body.orderId,
      razorpay_payment_id: 'pay_chk_ok',
      razorpay_signature: checkoutHmac,
    },
  });
  record('provider cannot verify checkout', providerCheckout.status === 403);
} catch (error) {
  record('phase 7 payment test runner', false, error.message);
} finally {
  resetRazorpayClient();
  if (createdProjectIds.length > 0) {
    await Transaction.deleteMany({ projectId: { $in: createdProjectIds } });
    await Escrow.deleteMany({ projectId: { $in: createdProjectIds } });
    await Project.deleteMany({ _id: { $in: createdProjectIds } });
  }
  if (createdUserIds.length > 0) {
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
