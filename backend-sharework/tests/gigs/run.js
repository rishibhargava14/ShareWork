import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { GIG_PACKAGE_TIERS } from '../../src/constants/gigPackages.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import Gig from '../../src/models/Gig.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import User from '../../src/models/User.js';
import { activateSignup } from '../helpers/activateSignup.js';
import { installMemoryStorage, uninstallMemoryStorage } from '../helpers/mockStorage.js';
import StoredFile from '../../src/models/StoredFile.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdGigIds = [];

const LONG_DESCRIPTION =
  'Complete dashboard design with layout system, components, and interaction states for a SaaS product homepage.';

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
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
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

const validGigBody = (overrides = {}) => ({
  title: 'SaaS dashboard UI design',
  category: 'UI/UX',
  description: LONG_DESCRIPTION,
  packages: validPackages(),
  faqs: [{ question: 'Do you provide source files?', answer: 'Yes, Figma source is included.' }],
  requirements: 'Share brand colors and product goals.',
  ...overrides,
});

const signup = async (server, role, label) => {
  const response = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: `${role} ${label}`,
      email: `${label}-${stamp}@example.com`,
      phone: `+9197${String(stamp).slice(-8)}${label === 'prov-a' ? '1' : label === 'prov-b' ? '2' : '3'}`,
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
  return json.includes('passwordHash') || json.includes('"otp"') || json.includes('otpExpiry');
};

const trackGig = (response) => {
  if (response.body?.gig?.id) {
    createdGigIds.push(response.body.gig.id);
  }
  return response;
};

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

  const unauthCreate = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    body: validGigBody(),
  });
  record('unauthenticated cannot create', unauthCreate.status === 401);

  const customerCreate = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    token: customerToken,
    body: validGigBody(),
  });
  record('customer cannot create gig', customerCreate.status === 403);

  const created = trackGig(
    await request(server, {
      method: 'POST',
      path: '/api/gigs',
      token: tokenA,
      body: validGigBody(),
    }),
  );
  record(
    'provider can create valid gig',
    created.status === 201 &&
      created.body.gig?.packages?.length === 3 &&
      created.body.gig.providerId === providerA.body.user.id &&
      created.body.gig.views === 0 &&
      created.body.gig.orders === 0,
  );
  record('create response omits auth fields', !hasSensitive(created.body));

  const twoPackages = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    token: tokenA,
    body: validGigBody({ packages: validPackages().slice(0, 2) }),
  });
  record('2 packages rejected', twoPackages.status === 400);

  const fourPackages = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    token: tokenA,
    body: validGigBody({
      packages: [...validPackages(), { ...validPackages()[0], name: 'Basic' }],
    }),
  });
  record('4 packages rejected', fourPackages.status === 400);

  const wrongPrice = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    token: tokenA,
    body: validGigBody({
      packages: validPackages().map((item, index) =>
        index === 0 ? { ...item, fixedPrice: 15000 } : item,
      ),
    }),
  });
  record('incorrect package tier price rejected', wrongPrice.status === 400);

  const invalidCategory = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    token: tokenA,
    body: validGigBody({ category: 'Marketing' }),
  });
  record('invalid category rejected', invalidCategory.status === 400);

  const malformed = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    token: tokenA,
    body: validGigBody({ title: 'Short' }),
  });
  record('malformed data rejected', malformed.status === 400);

  const injected = trackGig(
    await request(server, {
      method: 'POST',
      path: '/api/gigs',
      token: tokenA,
      body: {
        ...validGigBody(),
        providerId: providerB.body.user.id,
      },
    }),
  );
  record(
    'providerId body injection ignored',
    injected.status === 201 && injected.body.gig?.providerId === providerA.body.user.id,
  );

  const ownerUpdate = trackGig(
    await request(server, {
      method: 'PUT',
      path: `/api/gigs/${created.body.gig.id}`,
      token: tokenA,
      body: { title: 'Updated SaaS dashboard UI' },
    }),
  );
  record(
    'owner can update own gig',
    ownerUpdate.status === 200 && ownerUpdate.body.gig?.title === 'Updated SaaS dashboard UI',
  );

  const otherUpdate = await request(server, {
    method: 'PUT',
    path: `/api/gigs/${created.body.gig.id}`,
    token: tokenB,
    body: { title: 'Hijacked gig title here' },
  });
  record('non-owner provider gets 403', otherUpdate.status === 403);

  const customerUpdate = await request(server, {
    method: 'PUT',
    path: `/api/gigs/${created.body.gig.id}`,
    token: customerToken,
    body: { title: 'Customer cannot update this' },
  });
  record('customer cannot update', customerUpdate.status === 403);

  const badPackageUpdate = await request(server, {
    method: 'PUT',
    path: `/api/gigs/${created.body.gig.id}`,
    token: tokenA,
    body: { packages: validPackages().slice(0, 2) },
  });
  record('package validation applies to updates', badPackageUpdate.status === 400);

  const providerIdUpdate = await request(server, {
    method: 'PUT',
    path: `/api/gigs/${created.body.gig.id}`,
    token: tokenA,
    body: { providerId: providerB.body.user.id },
  });
  record(
    'providerId cannot be changed',
    providerIdUpdate.status === 200 &&
      providerIdUpdate.body.gig?.providerId === providerA.body.user.id,
  );

  const metricsUpdate = await request(server, {
    method: 'PUT',
    path: `/api/gigs/${created.body.gig.id}`,
    token: tokenA,
    body: { views: 999, orders: 50, rating: 5, reviewsCount: 12 },
  });
  record(
    'views/orders/rating/reviewsCount cannot be manipulated',
    metricsUpdate.status === 200 &&
      metricsUpdate.body.gig?.views === 0 &&
      metricsUpdate.body.gig?.orders === 0 &&
      metricsUpdate.body.gig?.rating === 0 &&
      metricsUpdate.body.gig?.reviewsCount === 0,
  );

  const invalidUpdateId = await request(server, {
    method: 'PUT',
    path: '/api/gigs/not-an-id',
    token: tokenA,
    body: { title: 'Updated SaaS dashboard UI' },
  });
  record('invalid update id rejected', invalidUpdateId.status === 400);

  const missingUpdate = await request(server, {
    method: 'PUT',
    path: `/api/gigs/${new mongoose.Types.ObjectId()}`,
    token: tokenA,
    body: { title: 'Updated SaaS dashboard UI' },
  });
  record('missing gig update returns 404', missingUpdate.status === 404);

  const publicGet = await request(server, {
    method: 'GET',
    path: `/api/gigs/${created.body.gig.id}`,
  });
  record(
    'public GET works',
    publicGet.status === 200 &&
      publicGet.body.gig?.packages?.length === 3 &&
      publicGet.body.gig.packages[0].fixedPrice === 5000 &&
      publicGet.body.gig.packages[1].fixedPrice === 15000 &&
      publicGet.body.gig.packages[2].fixedPrice === 35000,
  );
  record('public GET omits sensitive user fields', !hasSensitive(publicGet.body));
  record(
    'GET does not increment views',
    publicGet.body.gig.views === 0,
  );

  const invalidGetId = await request(server, {
    method: 'GET',
    path: '/api/gigs/not-an-id',
  });
  record('invalid GET id rejected', invalidGetId.status === 400);

  const missingGet = await request(server, {
    method: 'GET',
    path: `/api/gigs/${new mongoose.Types.ObjectId()}`,
  });
  record('missing gig GET returns 404', missingGet.status === 404);

  const deactivate = await request(server, {
    method: 'PUT',
    path: `/api/gigs/${created.body.gig.id}`,
    token: tokenA,
    body: { isActive: false },
  });
  const inactiveGet = await request(server, {
    method: 'GET',
    path: `/api/gigs/${created.body.gig.id}`,
  });
  record(
    'inactive gig remains readable by public GET',
    deactivate.status === 200 &&
      inactiveGet.status === 200 &&
      inactiveGet.body.gig?.isActive === false,
  );

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  const badType = new FormData();
  badType.append('title', 'SaaS dashboard UI design');
  badType.append('category', 'UI/UX');
  badType.append('description', LONG_DESCRIPTION);
  badType.append('packages', JSON.stringify(validPackages()));
  badType.append('portfolioImages', new Blob(['not-an-image'], { type: 'text/plain' }), 'notes.txt');
  const badTypeRes = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    token: tokenA,
    form: badType,
  });
  record('unsupported file type rejected', badTypeRes.status === 400);

  const tooMany = new FormData();
  tooMany.append('title', 'SaaS dashboard UI design');
  tooMany.append('category', 'UI/UX');
  tooMany.append('description', LONG_DESCRIPTION);
  tooMany.append('packages', JSON.stringify(validPackages()));
  for (let index = 0; index < 9; index += 1) {
    tooMany.append(
      'portfolioImages',
      new Blob([png], { type: 'image/png' }),
      `shot-${index}.png`,
    );
  }
  const tooManyRes = await request(server, {
    method: 'POST',
    path: '/api/gigs',
    token: tokenA,
    form: tooMany,
  });
  record('more than 8 portfolio files rejected', tooManyRes.status === 400);

  installMemoryStorage();
  const withImage = new FormData();
  withImage.append('title', 'SaaS dashboard UI design');
  withImage.append('category', 'Web');
  withImage.append('description', LONG_DESCRIPTION);
  withImage.append('packages', JSON.stringify(validPackages()));
  withImage.append('portfolioImages', new Blob([png], { type: 'image/png' }), 'cover.png');
  const uploaded = trackGig(
    await request(server, {
      method: 'POST',
      path: '/api/gigs',
      token: tokenA,
      form: withImage,
    }),
  );
  const cover = uploaded.body.gig?.portfolioImages?.[0];
  record(
    'portfolio upload stores returned references',
    uploaded.status === 201 &&
      cover?.originalName === 'cover.png' &&
      String(cover?.url || '').startsWith('/api/files/') &&
      !JSON.stringify(uploaded.body).includes('AWS_') &&
      !JSON.stringify(uploaded.body).includes('storageKey'),
  );

  const publicFile = await request(server, {
    method: 'GET',
    path: cover.url,
  });
  record('portfolio file is publicly readable', publicFile.status === 200);

  const health = await request(server, { method: 'GET', path: '/health' });
  record('health still returns 200', health.status === 200);
} catch (error) {
  record('phase 4 test runner', false, error.message);
} finally {
  uninstallMemoryStorage();
  if (createdGigIds.length > 0) {
    await StoredFile.deleteMany({ gigId: { $in: createdGigIds } });
    await Gig.deleteMany({ _id: { $in: createdGigIds } });
  }
  if (createdUserIds.length > 0) {
    await StoredFile.deleteMany({ ownerId: { $in: createdUserIds } });
    await Gig.deleteMany({ providerId: { $in: createdUserIds } });
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
