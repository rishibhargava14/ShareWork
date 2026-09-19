import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { DISCOVERY_PAGE_SIZE } from '../../src/constants/pagination.js';
import { GIG_PACKAGE_TIERS } from '../../src/constants/gigPackages.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import Gig from '../../src/models/Gig.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import User from '../../src/models/User.js';
import { activateSignup } from '../helpers/activateSignup.js';
import { hashPassword } from '../../src/utils/password.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdGigIds = [];
const searchToken = `phase3-${stamp}`;

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

const hasSensitive = (value) => {
  const json = JSON.stringify(value);
  return json.includes('passwordHash') || json.includes('"otp"') || json.includes('otpExpiry');
};

const packages = () => [
  {
    name: 'Basic',
    description: 'Basic package for landing work',
    fixedPrice: GIG_PACKAGE_TIERS.Basic,
    deliveryDays: 3,
    revisions: 1,
    features: ['1 page'],
  },
  {
    name: 'Standard',
    description: 'Standard package for a small site',
    fixedPrice: GIG_PACKAGE_TIERS.Standard,
    deliveryDays: 7,
    revisions: 2,
    features: ['5 pages'],
  },
  {
    name: 'Premium',
    description: 'Premium package for a full product',
    fixedPrice: GIG_PACKAGE_TIERS.Premium,
    deliveryDays: 14,
    revisions: 4,
    features: ['Unlimited pages'],
  },
];

const signup = async (server, role, label) => {
  const response = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: `${role} ${label}`,
      email: `${label}-${stamp}@example.com`,
      phone: `+9198${String(stamp).slice(-8)}${label === 'cust' ? '1' : '2'}`,
      password: 'password12',
      role,
    },
  });

  if (response.body?.user?.id) {
    createdUserIds.push(response.body.user.id);
  }

  return activateSignup(response);
};

const createSeedProvider = async ({
  name,
  category,
  startingPrice,
  rating,
  onlineStatus,
  title,
}) => {
  const passwordHash = await hashPassword('password12');
  const user = await User.create({
    name,
    email: `${name.replace(/\s+/g, '-').toLowerCase()}-${stamp}@example.com`,
    phone: `+9188${String(createdUserIds.length).padStart(2, '0')}${String(stamp).slice(-8)}`,
    passwordHash,
    role: 'provider',
    isVerified: true,
  });
  createdUserIds.push(String(user._id));

  await ProviderProfile.create({
    userId: user._id,
    title,
    bio: `${title} bio ${searchToken}`,
    skills: [searchToken, category],
    categories: [category],
    startingPrice,
    rating,
    availability: { onlineStatus, weeklySchedule: [], capacityAvailable: 3 },
  });

  return user;
};

await connectDb();
const app = createApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  const unauthMe = await request(server, { method: 'GET', path: '/api/users/me' });
  record('unauthenticated /me rejected', unauthMe.status === 401);

  const customerSignup = await signup(server, 'customer', 'cust');
  const providerSignup = await signup(server, 'provider', 'prov');
  const customerToken = customerSignup.body.token;
  const providerToken = providerSignup.body.token;
  const customerId = customerSignup.body.user.id;
  const providerId = providerSignup.body.user.id;

  const customerMe = await request(server, {
    method: 'GET',
    path: '/api/users/me',
    token: customerToken,
  });
  record(
    'customer receives own user + customer profile',
    customerMe.status === 200 &&
      customerMe.body.user?.role === 'customer' &&
      customerMe.body.profile &&
      Object.hasOwn(customerMe.body.profile, 'gstNumber'),
  );
  record('customer /me omits sensitive fields', !hasSensitive(customerMe.body));

  const providerMe = await request(server, {
    method: 'GET',
    path: '/api/users/me',
    token: providerToken,
  });
  record(
    'provider receives own user + provider profile',
    providerMe.status === 200 &&
      providerMe.body.user?.role === 'provider' &&
      providerMe.body.profile?.title === 'New Provider',
  );
  record('provider /me omits sensitive fields', !hasSensitive(providerMe.body));

  const validUpdate = await request(server, {
    method: 'PUT',
    path: '/api/users/me',
    token: customerToken,
    body: { name: 'Ada Updated', avatar: 'https://cdn.example.com/a.png', bio: 'Need a designer' },
  });
  record(
    'valid update succeeds',
    validUpdate.status === 200 &&
      validUpdate.body.user?.name === 'Ada Updated' &&
      validUpdate.body.profile?.bio === 'Need a designer',
  );

  const countryUpdate = await request(server, {
    method: 'PUT',
    path: '/api/users/me',
    token: customerToken,
    body: { country: 'India' },
  });
  record(
    'customer country persists on profile',
    countryUpdate.status === 200 && countryUpdate.body.profile?.country === 'India',
  );

  const providerCountry = await request(server, {
    method: 'PUT',
    path: '/api/users/me',
    token: providerToken,
    body: { country: 'India' },
  });
  record('provider cannot set country', providerCountry.status === 400);

  const invalidUpdate = await request(server, {
    method: 'PUT',
    path: '/api/users/me',
    token: customerToken,
    body: { name: 'A' },
  });
  record('invalid update data rejected', invalidUpdate.status === 400);

  const roleUpdate = await request(server, {
    method: 'PUT',
    path: '/api/users/me',
    token: customerToken,
    body: { name: 'Ada Updated', role: 'admin' },
  });
  record('role cannot be changed', roleUpdate.status === 400);

  const emailUpdate = await request(server, {
    method: 'PUT',
    path: '/api/users/me',
    token: customerToken,
    body: { email: 'hacked@example.com' },
  });
  record('email cannot be changed', emailUpdate.status === 400);

  const phoneUpdate = await request(server, {
    method: 'PUT',
    path: '/api/users/me',
    token: customerToken,
    body: { phone: '+910000000000' },
  });
  record('phone cannot be changed', phoneUpdate.status === 400);

  const hashUpdate = await request(server, {
    method: 'PUT',
    path: '/api/users/me',
    token: customerToken,
    body: { passwordHash: 'not-allowed' },
  });
  record('passwordHash cannot be overwritten', hashUpdate.status === 400);

  const otpUpdate = await request(server, {
    method: 'PUT',
    path: '/api/users/me',
    token: customerToken,
    body: { otp: '123456', otpExpiry: new Date().toISOString() },
  });
  record('OTP fields cannot be overwritten', otpUpdate.status === 400);

  const arbitraryUpdate = await request(server, {
    method: 'PUT',
    path: '/api/users/me',
    token: customerToken,
    body: { isBanned: true, isVerified: true },
  });
  record('arbitrary fields rejected', arbitraryUpdate.status === 400);

  const persisted = await User.findById(customerId).select('+passwordHash +otp');
  record(
    'immutable account fields unchanged after rejected updates',
    persisted.email.endsWith('@example.com') &&
      persisted.role === 'customer' &&
      persisted.isBanned === false &&
      persisted.passwordHash !== 'not-allowed',
  );

  const providerProfile = await request(server, {
    method: 'GET',
    path: `/api/users/${providerId}/profile`,
    token: customerToken,
  });
  record(
    'valid provider profile lookup',
    providerProfile.status === 200 &&
      providerProfile.body.user?.role === 'provider' &&
      providerProfile.body.profile?.title === 'New Provider' &&
      Array.isArray(providerProfile.body.gigs),
  );
  record('public profile omits email/phone', !providerProfile.body.user?.email && !providerProfile.body.user?.phone);
  record('public profile omits sensitive fields', !hasSensitive(providerProfile.body));
  record('provider profile includes rating', typeof providerProfile.body.rating === 'number');

  const customerProfile = await request(server, {
    method: 'GET',
    path: `/api/users/${customerId}/profile`,
    token: providerToken,
  });
  record(
    'customer public profile hides private fields',
    customerProfile.status === 200 &&
      !Object.hasOwn(customerProfile.body.profile || {}, 'gstNumber') &&
      !Object.hasOwn(customerProfile.body.profile || {}, 'totalSpent'),
  );

  const invalidId = await request(server, {
    method: 'GET',
    path: '/api/users/not-an-id/profile',
    token: customerToken,
  });
  record('invalid profile ID rejected', invalidId.status === 400);

  const missingId = await request(server, {
    method: 'GET',
    path: `/api/users/${new mongoose.Types.ObjectId()}/profile`,
    token: customerToken,
  });
  record('missing user profile returns 404', missingId.status === 404);

  const seedSpecs = [
    { name: 'P One', category: 'UI/UX', startingPrice: 5000, rating: 4.5, onlineStatus: 'online', title: 'UI Designer' },
    { name: 'P Two', category: 'UI/UX', startingPrice: 15000, rating: 3.2, onlineStatus: 'offline', title: 'UX Writer' },
    { name: 'P Three', category: 'Web', startingPrice: 8000, rating: 4.8, onlineStatus: 'online', title: 'Web Engineer' },
    { name: 'P Four', category: 'App', startingPrice: 35000, rating: 5, onlineStatus: 'busy', title: 'App Builder' },
    { name: 'P Five', category: 'Figma', startingPrice: 5000, rating: 2.1, onlineStatus: 'online', title: 'Figma Hand' },
    { name: 'P Six', category: 'IT', startingPrice: 12000, rating: 4.1, onlineStatus: 'offline', title: 'IT Support' },
    { name: 'P Seven', category: 'Web', startingPrice: 9000, rating: 3.9, onlineStatus: 'online', title: 'Frontend Dev' },
    { name: 'P Eight', category: 'UI/UX', startingPrice: 7000, rating: 4.9, onlineStatus: 'online', title: 'Product Designer' },
    { name: 'P Nine', category: 'App', startingPrice: 20000, rating: 1.5, onlineStatus: 'offline', title: 'Mobile Dev' },
    { name: 'P Ten', category: 'IT', startingPrice: 6000, rating: 3.3, onlineStatus: 'busy', title: 'Sysadmin' },
    { name: 'P Eleven', category: 'Figma', startingPrice: 11000, rating: 4.2, onlineStatus: 'online', title: 'Visual Designer' },
    { name: 'P Twelve', category: 'Web', startingPrice: 16000, rating: 4.6, onlineStatus: 'online', title: 'Fullstack Dev' },
  ];

  for (const spec of seedSpecs) {
    await createSeedProvider(spec);
  }

  const unauthDiscover = await request(server, { method: 'GET', path: '/api/customers/discover' });
  record('discovery unauthenticated rejected', unauthDiscover.status === 401);

  const providerDiscover = await request(server, {
    method: 'GET',
    path: `/api/customers/discover?search=${searchToken}`,
    token: providerToken,
  });
  record('non-customer discovery rejected', providerDiscover.status === 403);

  const noFilters = await request(server, {
    method: 'GET',
    path: '/api/customers/discover',
    token: customerToken,
  });
  record(
    'discovery with no filters',
    noFilters.status === 200 &&
      Array.isArray(noFilters.body.providers) &&
      typeof noFilters.body.total === 'number' &&
      noFilters.body.page === 1,
  );

  const searched = await request(server, {
    method: 'GET',
    path: `/api/customers/discover?search=${searchToken}&page=1`,
    token: customerToken,
  });
  record(
    'search filter + pagination page 1',
    searched.status === 200 &&
      searched.body.total === 12 &&
      searched.body.providers.length === DISCOVERY_PAGE_SIZE &&
      searched.body.page === 1,
  );

  const page2 = await request(server, {
    method: 'GET',
    path: `/api/customers/discover?search=${searchToken}&page=2`,
    token: customerToken,
  });
  record(
    'pagination page 2',
    page2.status === 200 && page2.body.total === 12 && page2.body.providers.length === 2 && page2.body.page === 2,
  );

  const categoryFilter = await request(server, {
    method: 'GET',
    path: `/api/customers/discover?search=${searchToken}&category=UI/UX`,
    token: customerToken,
  });
  record(
    'category filter',
    categoryFilter.status === 200 &&
      categoryFilter.body.total === 3 &&
      categoryFilter.body.providers.every((item) => item.categories.includes('UI/UX')),
  );

  const budgetFilter = await request(server, {
    method: 'GET',
    path: `/api/customers/discover?search=${searchToken}&budgetMin=10000&budgetMax=20000`,
    token: customerToken,
  });
  record(
    'budget filters',
    budgetFilter.status === 200 &&
      budgetFilter.body.total === 5 &&
      budgetFilter.body.providers.every((item) => item.startingPrice >= 10000 && item.startingPrice <= 20000),
  );

  const ratingFilter = await request(server, {
    method: 'GET',
    path: `/api/customers/discover?search=${searchToken}&rating=4.5`,
    token: customerToken,
  });
  record(
    'rating filter',
    ratingFilter.status === 200 &&
      ratingFilter.body.total === 5 &&
      ratingFilter.body.providers.every((item) => item.rating >= 4.5),
  );

  const onlineFilter = await request(server, {
    method: 'GET',
    path: `/api/customers/discover?search=${searchToken}&online=online`,
    token: customerToken,
  });
  record(
    'online filter',
    onlineFilter.status === 200 &&
      onlineFilter.body.total === 7 &&
      onlineFilter.body.providers.every((item) => item.onlineStatus === 'online'),
  );

  const invalidQuery = await request(server, {
    method: 'GET',
    path: '/api/customers/discover?page=-1&rating=9',
    token: customerToken,
  });
  record('invalid discovery query rejected', invalidQuery.status === 400);

  const invalidCategory = await request(server, {
    method: 'GET',
    path: '/api/customers/discover?category=Marketing',
    token: customerToken,
  });
  record('unsupported discovery category rejected', invalidCategory.status === 400);

  const activeGig = await Gig.create({
    providerId,
    title: 'Active dashboard design',
    category: 'UI/UX',
    description: 'Complete dashboard design with components and interaction states.',
    packages: packages(),
    isActive: true,
  });
  const inactiveGig = await Gig.create({
    providerId,
    title: 'Hidden draft gig',
    category: 'Web',
    description: 'This gig should stay out of public provider listings for customers.',
    packages: packages(),
    isActive: false,
  });
  createdGigIds.push(String(activeGig._id), String(inactiveGig._id));

  const gigs = await request(server, {
    method: 'GET',
    path: `/api/providers/${providerId}/gigs`,
    token: customerToken,
  });
  record(
    'valid provider gigs returned',
    gigs.status === 200 &&
      gigs.body.gigs?.length === 1 &&
      gigs.body.gigs[0].title === 'Active dashboard design',
  );

  const profileWithGig = await request(server, {
    method: 'GET',
    path: `/api/users/${providerId}/profile`,
    token: customerToken,
  });
  record(
    'provider profile includes active gigs only',
    profileWithGig.body.gigs?.length === 1 && profileWithGig.body.gigs[0].id === String(activeGig._id),
  );

  const invalidGigId = await request(server, {
    method: 'GET',
    path: '/api/providers/bad-id/gigs',
    token: customerToken,
  });
  record('invalid provider ID rejected', invalidGigId.status === 400);

  const missingProvider = await request(server, {
    method: 'GET',
    path: `/api/providers/${new mongoose.Types.ObjectId()}/gigs`,
    token: customerToken,
  });
  record('provider not found', missingProvider.status === 404);

  const customerAsProvider = await request(server, {
    method: 'GET',
    path: `/api/providers/${customerId}/gigs`,
    token: customerToken,
  });
  record('customer ID is not a provider', customerAsProvider.status === 404);

  const health = await request(server, { method: 'GET', path: '/health' });
  record('health still returns 200', health.status === 200);
} catch (error) {
  record('phase 3 test runner', false, error.message);
} finally {
  if (createdGigIds.length > 0) {
    await Gig.deleteMany({ _id: { $in: createdGigIds } });
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

if (failed.length > 0) {
  process.exit(1);
}
