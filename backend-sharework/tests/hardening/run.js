import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { validateEnvironment } from '../../src/config/env.js';
import { closeSocket, initSocket } from '../../src/config/socket.js';
import { getIoOrNull } from '../../src/config/socketRegistry.js';
import { getFeePercents } from '../../src/constants/fees.js';
import AdminUser from '../../src/models/AdminUser.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import User from '../../src/models/User.js';
import apiRoutes from '../../src/routes/index.js';
import adminRoutes from '../../src/routes/admin.routes.js';
import authRoutes from '../../src/routes/auth.routes.js';
import conversationRoutes from '../../src/routes/conversation.routes.js';
import customerRoutes from '../../src/routes/customer.routes.js';
import escrowRoutes from '../../src/routes/escrow.routes.js';
import gigRoutes from '../../src/routes/gig.routes.js';
import paymentRoutes from '../../src/routes/payment.routes.js';
import projectRoutes from '../../src/routes/project.routes.js';
import providerRoutes, { providerAccountRouter } from '../../src/routes/provider.routes.js';
import requirementRoutes from '../../src/routes/requirement.routes.js';
import transactionRoutes from '../../src/routes/transaction.routes.js';
import userRoutes from '../../src/routes/user.routes.js';
import fileRoutes from '../../src/routes/file.routes.js';
import notificationRoutes from '../../src/routes/notification.routes.js';
import categoryRoutes from '../../src/routes/category.routes.js';
import { calculateFee } from '../../src/services/escrow.service.js';
import { verifyWebhookSignature } from '../../src/services/payment.service.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';
import { redactSecrets } from '../../src/utils/redact.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdAdminLinkIds = [];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const request = (server, { method, path: urlPath, body, token }) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        method,
        path: urlPath,
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

const routeKeys = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods)
        .filter((method) => method !== '_all')
        .map((method) => `${method.toUpperCase()} ${layer.route.path}`),
    );

const mountNames = apiRoutes.stack
  .map((layer) => String(layer.regexp?.source ?? ''))
  .map((source) => source.match(/\\\/([a-z-]+)/)?.[1])
  .filter(Boolean);

const sampleEnv = (overrides = {}) => ({
  PORT: '5000',
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/sharework',
  JWT_SECRET: 'development-jwt-secret-ok',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'development-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
  CLIENT_URL: 'http://localhost:3000',
  CORS_ORIGIN: 'http://localhost:3000',
  RAZORPAY_KEY_ID: 'rzp_test_local_key',
  RAZORPAY_KEY_SECRET: 'local_razorpay_secret',
  RAZORPAY_WEBHOOK_SECRET: 'local_webhook_secret',
  PLATFORM_FEE_PERCENT: '10',
  GST_ON_FEE_PERCENT: '18',
  AWS_ACCESS_KEY_ID: 'local-access-key',
  AWS_SECRET_ACCESS_KEY: 'local-secret-key',
  AWS_BUCKET: 'sharework-uploads',
  AWS_REGION: 'ap-south-1',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_USER: 'local-user',
  SMTP_PASS: 'local-pass',
  RESEND_API_KEY: 're_test_local_key',
  OTP_EXPIRY_MIN: '10',
  BCRYPT_SALT_ROUNDS: '12',
  ...overrides,
});

const createUser = async (role, label) => {
  const seq = String(createdUserIds.length + 1).padStart(3, '0');
  const user = await User.create({
    name: `Phase9 ${role} ${label}`,
    email: `p9-${role}-${label}-${stamp}@example.com`,
    phone: `+9186${String(stamp).slice(-6)}${seq}`,
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
  record(
    'api families mounted once',
    [
      'auth',
      'users',
      'customers',
      'customer',
      'providers',
      'provider',
      'gigs',
      'conversations',
      'projects',
      'payments',
      'transactions',
      'escrow',
      'files',
      'notifications',
      'categories',
      'admin',
    ].every((name) => mountNames.filter((item) => item === name).length === 1),
    mountNames.join(','),
  );

  const expected = {
    auth: ['POST /signup', 'POST /login', 'POST /verify-otp', 'POST /resend-otp', 'POST /forgot-password', 'POST /refresh', 'POST /reset-password'],
    users: ['GET /me', 'PUT /me', 'GET /:id/profile'],
    customers: ['GET /discover'],
    customer: ['POST /requirements', 'GET /requirements'],
    providers: ['GET /:id/gigs'],
    provider: [
      'GET /dashboard/stats',
      'GET /earnings',
      'POST /availability',
      'PUT /availability/toggle-online',
      'POST /withdraw',
    ],
    gigs: ['POST /', 'PUT /:id', 'GET /:id'],
    conversations: [
      'GET /',
      'POST /',
      'GET /:id/messages',
      'POST /:id/messages',
      'POST /:id/agreement',
      'POST /:id/agreement/:agreementId/approve',
      'POST /:id/agreement/:agreementId/reject',
    ],
    projects: [
      'GET /',
      'GET /:id',
      'POST /:id/fund-escrow',
      'POST /:id/submit-deliverable',
      'POST /:id/approve-deliverable',
      'POST /:id/request-revision',
      'POST /:id/dispute',
      'POST /:id/review',
    ],
    payments: ['POST /create-order', 'POST /verify-checkout', 'POST /verify'],
    transactions: ['GET /me'],
    escrow: ['POST /release'],
    files: ['GET /:id'],
    notifications: ['GET /', 'GET /unread-count', 'PATCH /read-all', 'PATCH /:id/read'],
    categories: ['GET /'],
    admin: [
      'GET /stats',
      'GET /users',
      'GET /users/:id',
      'GET /projects',
      'GET /projects/:id',
      'POST /projects/:id/force-release',
      'GET /escrows',
      'GET /transactions',
      'GET /withdrawals',
      'GET /leakage-logs',
      'GET /disputes',
      'GET /categories',
      'POST /categories',
      'PUT /categories/:id',
      'DELETE /categories/:id',
      'GET /settings',
      'PUT /settings',
      'GET /audit-logs',
      'POST /disputes/:id/resolve',
      'PUT /users/:id/ban',
    ],
  };

  const actual = {
    auth: routeKeys(authRoutes),
    users: routeKeys(userRoutes),
    customers: routeKeys(customerRoutes),
    customer: routeKeys(requirementRoutes),
    providers: routeKeys(providerRoutes),
    provider: routeKeys(providerAccountRouter),
    gigs: routeKeys(gigRoutes),
    conversations: routeKeys(conversationRoutes),
    projects: routeKeys(projectRoutes),
    payments: routeKeys(paymentRoutes),
    transactions: routeKeys(transactionRoutes),
    escrow: routeKeys(escrowRoutes),
    files: routeKeys(fileRoutes),
    notifications: routeKeys(notificationRoutes),
    categories: routeKeys(categoryRoutes),
    admin: routeKeys(adminRoutes),
  };

  for (const [family, routes] of Object.entries(expected)) {
    record(
      `${family} route inventory`,
      routes.every((item) => actual[family].includes(item)) &&
        actual[family].length === new Set(actual[family]).size,
    );
  }

  const missingJwt = validateEnvironment(sampleEnv({ JWT_SECRET: '' }));
  record('missing JWT_SECRET fails', missingJwt.success === false);

  const badPort = validateEnvironment(sampleEnv({ PORT: 'not-a-port' }));
  record('malformed PORT fails', badPort.success === false);

  const development = validateEnvironment(sampleEnv());
  record('development config parses', development.success === true);

  const testEnv = validateEnvironment(sampleEnv({ NODE_ENV: 'test' }));
  record('test config parses', testEnv.success === true);

  const productionOk = validateEnvironment(
    sampleEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'production-jwt-secret-ok',
      JWT_REFRESH_SECRET: 'production-refresh-secret',
      RAZORPAY_KEY_ID: 'rzp_live_valid_key_id',
      RAZORPAY_KEY_SECRET: 'live_razorpay_secret_ok',
      RAZORPAY_WEBHOOK_SECRET: 'live_webhook_secret_ok',
      AWS_ACCESS_KEY_ID: 'AKIAPRODUCTIONKEYOK',
      AWS_SECRET_ACCESS_KEY: 'production-aws-secret-ok',
      SMTP_PASS: 'production-smtp-pass-ok',
    }),
  );
  record('production config parses without placeholders', productionOk.success === true);

  const productionPlaceholder = validateEnvironment(
    sampleEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'replace_with_long_random_jwt_secret',
    }),
  );
  record('production rejects placeholder JWT', productionPlaceholder.success === false);

  const productionDevOtp = validateEnvironment(
    sampleEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'production-jwt-secret-ok',
      JWT_REFRESH_SECRET: 'production-refresh-secret',
      RAZORPAY_KEY_ID: 'rzp_live_valid_key_id',
      RAZORPAY_KEY_SECRET: 'live_razorpay_secret_ok',
      RAZORPAY_WEBHOOK_SECRET: 'live_webhook_secret_ok',
      AWS_ACCESS_KEY_ID: 'AKIAPRODUCTIONKEYOK',
      AWS_SECRET_ACCESS_KEY: 'production-aws-secret-ok',
      SMTP_PASS: 'production-smtp-pass-ok',
      DEV_OTP: '123456',
    }),
  );
  record('production rejects DEV_OTP', productionDevOtp.success === false);

  record(
    'test config is not treated as production',
    testEnv.success === true &&
      validateEnvironment(sampleEnv({ NODE_ENV: 'test', JWT_SECRET: 'replace_with_long_random_jwt_secret' }))
        .success === true,
  );

  record(
    'redact hides mongo uri and bearer tokens',
    redactSecrets('mongodb://user:pass@127.0.0.1:27017/db Bearer abc.def.ghi') ===
      '[redacted] [redacted]',
  );

  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  record(
    'Dockerfile is node 20 production entrypoint',
    dockerfile.includes('FROM node:20-alpine') &&
      dockerfile.includes('npm ci --omit=dev') &&
      dockerfile.includes('CMD ["node", "src/server.js"]') &&
      dockerfile.includes('EXPOSE 5000') &&
      dockerfile.includes('USER node') &&
      !dockerfile.includes('COPY .env'),
  );

  const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
  record(
    'compose has backend and mongo without hardcoded secrets',
    compose.includes('mongodb:') &&
      compose.includes('backend:') &&
      !compose.includes('JWT_SECRET') &&
      !compose.includes('RAZORPAY_KEY_SECRET'),
  );

  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  record('.gitignore ignores .env', gitignore.split(/\r?\n/).includes('.env'));

  const fees = getFeePercents();
  const math = calculateFee(15000);
  record('fee/gst remain centralized', fees.feePercent === 10 && fees.gstPercent === 18);
  record('fee math unchanged', math.fee === 1500 && math.gst === 270 && math.net === 13230);
  record('invalid webhook signature rejected', verifyWebhookSignature('{}', 'deadbeef') === false);

  const first = initSocket(server);
  const second = initSocket(server);
  record('socket initializes once', first === second && getIoOrNull() === first);
  await closeSocket();
  record('socket closes without throw', getIoOrNull() === null);

  const health = await request(server, { method: 'GET', path: '/health' });
  record('health returns 200', health.status === 200 && !health.body.stack);

  const corsOk = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        method: 'OPTIONS',
        path: '/api/auth/login',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      },
      (res) => {
        resolve({
          status: res.statusCode,
          origin: res.headers['access-control-allow-origin'],
          credentials: res.headers['access-control-allow-credentials'],
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
  record(
    'CORS preflight allows localhost:3000',
    (corsOk.status === 204 || corsOk.status === 200) &&
      corsOk.origin === 'http://localhost:3000' &&
      corsOk.credentials === 'true',
  );

  const corsBlocked = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        method: 'OPTIONS',
        path: '/api/auth/login',
        headers: {
          Origin: 'http://localhost:9999',
          'Access-Control-Request-Method': 'POST',
        },
      },
      (res) => {
        resolve({ origin: res.headers['access-control-allow-origin'] });
      },
    );
    req.on('error', reject);
    req.end();
  });
  record('CORS rejects unknown origin', corsBlocked.origin !== 'http://localhost:9999');

  const protectedGets = [
    '/api/projects',
    '/api/transactions/me',
    '/api/admin/stats',
    '/api/provider/earnings',
    '/api/conversations',
  ];
  for (const url of protectedGets) {
    const unauth = await request(server, { method: 'GET', path: url });
    record(`unauthenticated ${url} rejected`, unauth.status === 401);
  }

  const customer = await createUser('customer', '1');
  const provider = await createUser('provider', '1');
  await ProviderProfile.create({
    userId: provider._id,
    title: 'Phase 9 provider',
    categories: ['Web'],
    startingPrice: 5000,
  });
  const admin = await createUser('admin', '1');
  const adminLink = await AdminUser.create({ userId: admin._id });
  createdAdminLinkIds.push(String(adminLink._id));
  const tokenC = signAccessToken(customer);
  const tokenP = signAccessToken(provider);
  const tokenA = signAccessToken(admin);

  const customerProjects = await request(server, {
    method: 'GET',
    path: '/api/projects?role=customer',
    token: tokenC,
  });
  record('customer can list own projects', customerProjects.status === 200);

  const providerEarnings = await request(server, {
    method: 'GET',
    path: '/api/provider/earnings',
    token: tokenP,
  });
  record('provider can read earnings', providerEarnings.status === 200);

  const adminStats = await request(server, { method: 'GET', path: '/api/admin/stats', token: tokenA });
  record('admin can read stats', adminStats.status === 200);

  const customerAdmin = await request(server, { method: 'GET', path: '/api/admin/stats', token: tokenC });
  record('customer cannot use admin stats', customerAdmin.status === 403);

  const providerAdmin = await request(server, { method: 'GET', path: '/api/admin/stats', token: tokenP });
  record('provider cannot use admin stats', providerAdmin.status === 403);

  const customerEarnings = await request(server, {
    method: 'GET',
    path: '/api/provider/earnings',
    token: tokenC,
  });
  record('customer cannot use provider earnings', customerEarnings.status === 403);

  const customerConversations = await request(server, {
    method: 'GET',
    path: '/api/conversations',
    token: tokenC,
  });
  record('customer can list own conversations', customerConversations.status === 200);

  const banned = await createUser('customer', 'ban');
  banned.isBanned = true;
  banned.bannedReason = 'Phase 9 check';
  await banned.save();
  const bannedReq = await request(server, {
    method: 'GET',
    path: '/api/users/me',
    token: signAccessToken(banned),
  });
  record('banned user remains blocked', bannedReq.status === 403);

  const refund = await request(server, {
    method: 'POST',
    path: `/api/admin/disputes/${admin._id}/resolve`,
    token: tokenA,
    body: { resolution: 'Should not refund', refund: true },
  });
  record(
    'unknown dispute refund is rejected',
    refund.status === 400 || refund.status === 404,
  );
} catch (error) {
  record('phase 9 hardening test runner', false, error.message);
} finally {
  if (createdAdminLinkIds.length > 0) {
    await AdminUser.deleteMany({ _id: { $in: createdAdminLinkIds } });
  }
  if (createdUserIds.length > 0) {
    await ProviderProfile.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
}

const failed = results.filter((item) => !item.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
