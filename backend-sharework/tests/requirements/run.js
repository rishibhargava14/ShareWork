import http from 'node:http';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import Requirement from '../../src/models/Requirement.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import User from '../../src/models/User.js';
import { activateSignup } from '../helpers/activateSignup.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdRequirementIds = [];

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

const signup = async (server, role, label) => {
  const response = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: `${role} ${label}`,
      email: `${label}-${stamp}@example.com`,
      phone: `+9197${String(stamp).slice(-8)}${label === 'c1' ? '1' : label === 'c2' ? '2' : '3'}`,
      password: 'password12',
      role,
    },
  });
  if (response.body?.user?.id) {
    createdUserIds.push(response.body.user.id);
  }
  return activateSignup(response);
};

const futureDeadline = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString();
};

const validBody = (overrides = {}) => ({
  title: 'Need a SaaS landing page',
  description: 'Marketing landing page with pricing and a contact form.',
  category: 'Web',
  budget: 15000,
  deadline: futureDeadline(),
  skills: ['React', 'Figma'],
  ...overrides,
});

await connectDb();
const server = http.createServer(createApp());
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  const customerA = await signup(server, 'customer', 'c1');
  const customerB = await signup(server, 'customer', 'c2');
  const provider = await signup(server, 'provider', 'p1');
  const tokenA = customerA.body.token;
  const tokenB = customerB.body.token;
  const tokenP = provider.body.token;
  const idA = customerA.body.user.id;

  const unauthCreate = await request(server, {
    method: 'POST',
    path: '/api/customer/requirements',
    body: validBody(),
  });
  record('unauthenticated create rejected', unauthCreate.status === 401);

  const unauthList = await request(server, { method: 'GET', path: '/api/customer/requirements' });
  record('unauthenticated list rejected', unauthList.status === 401);

  const providerCreate = await request(server, {
    method: 'POST',
    path: '/api/customer/requirements',
    token: tokenP,
    body: validBody(),
  });
  record('provider create rejected', providerCreate.status === 403);

  const providerList = await request(server, {
    method: 'GET',
    path: '/api/customer/requirements',
    token: tokenP,
  });
  record('provider list rejected', providerList.status === 403);

  const created = await request(server, {
    method: 'POST',
    path: '/api/customer/requirements',
    token: tokenA,
    body: validBody(),
  });
  const requirementId = created.body?.requirement?.id;
  if (requirementId) {
    createdRequirementIds.push(requirementId);
  }
  record(
    'customer create success',
    created.status === 201 &&
      created.body?.success === true &&
      created.body?.requirement?.title === 'Need a SaaS landing page' &&
      created.body?.requirement?.status === 'open' &&
      created.body?.requirement?.customerId === idA &&
      created.body?.data == null,
  );

  const persisted = requirementId ? await Requirement.findById(requirementId).lean() : null;
  record(
    'requirement persisted in MongoDB',
    Boolean(persisted) &&
      persisted.title === 'Need a SaaS landing page' &&
      String(persisted.customerId) === idA &&
      persisted.status === 'open',
  );

  const injected = await request(server, {
    method: 'POST',
    path: '/api/customer/requirements',
    token: tokenA,
    body: validBody({ title: 'Injected owner', customerId: customerB.body.user.id, status: 'closed' }),
  });
  record('customerId and status from body rejected', injected.status === 400);

  const emptyTitle = await request(server, {
    method: 'POST',
    path: '/api/customer/requirements',
    token: tokenA,
    body: validBody({ title: '  ' }),
  });
  record('empty title rejected', emptyTitle.status === 400);

  const shortDescription = await request(server, {
    method: 'POST',
    path: '/api/customer/requirements',
    token: tokenA,
    body: validBody({ description: 'too short' }),
  });
  record('short description rejected', shortDescription.status === 400);

  const badCategory = await request(server, {
    method: 'POST',
    path: '/api/customer/requirements',
    token: tokenA,
    body: validBody({ category: 'Marketing' }),
  });
  record('invalid category rejected', badCategory.status === 400);

  const pastDeadline = await request(server, {
    method: 'POST',
    path: '/api/customer/requirements',
    token: tokenA,
    body: validBody({ deadline: '2020-01-01T00:00:00.000Z' }),
  });
  record('past deadline rejected', pastDeadline.status === 400);

  const emptySkills = await request(server, {
    method: 'POST',
    path: '/api/customer/requirements',
    token: tokenA,
    body: validBody({ skills: [] }),
  });
  record('empty skills rejected', emptySkills.status === 400);

  const listedA = await request(server, {
    method: 'GET',
    path: '/api/customer/requirements',
    token: tokenA,
  });
  record(
    'customer list success',
    listedA.status === 200 &&
      listedA.body?.success === true &&
      Array.isArray(listedA.body.requirements) &&
      listedA.body.requirements.some((item) => item.id === requirementId),
  );

  const other = await request(server, {
    method: 'POST',
    path: '/api/customer/requirements',
    token: tokenB,
    body: validBody({ title: 'Other customer brief' }),
  });
  if (other.body?.requirement?.id) {
    createdRequirementIds.push(other.body.requirement.id);
  }

  const listedB = await request(server, {
    method: 'GET',
    path: '/api/customer/requirements',
    token: tokenB,
  });
  record(
    'customer sees only own requirements',
    listedB.status === 200 &&
      listedB.body.requirements.every((item) => item.customerId === customerB.body.user.id) &&
      !listedB.body.requirements.some((item) => item.id === requirementId),
  );
} catch (error) {
  record('requirements test runner', false, error.message);
} finally {
  if (createdRequirementIds.length > 0) {
    await Requirement.deleteMany({ _id: { $in: createdRequirementIds } });
  }
  if (createdUserIds.length > 0) {
    await Requirement.deleteMany({ customerId: { $in: createdUserIds } });
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
