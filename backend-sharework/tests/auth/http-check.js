import http from 'node:http';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import User from '../../src/models/User.js';

const request = (server, { method, path, body, token }) =>
  new Promise((resolve, reject) => {
    const address = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: address.port,
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

await connectDb();
const app = createApp();
const server = http.createServer(app);

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const stamp = Date.now();
const email = `http-auth-${stamp}@example.com`;
const phone = `+91970000${String(stamp).slice(-6)}`;
let userId = null;

try {
  const health = await request(server, { method: 'GET', path: '/health' });
  console.log('HEALTH', health.status, health.body);

  const signup = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: 'Http Customer',
      email,
      phone,
      password: 'password12',
      role: 'customer',
    },
  });
  console.log('SIGNUP', signup.status, {
    success: signup.body?.success,
    hasToken: Boolean(signup.body?.token),
    hasRefresh: Boolean(signup.body?.refreshToken),
    hasHash: Boolean(signup.body?.user?.passwordHash),
    hasOtp: Boolean(signup.body?.otp),
  });
  userId = signup.body?.user?.id;

  const verify = await request(server, {
    method: 'POST',
    path: '/api/auth/verify-otp',
    body: { email, otp: '123456' },
  });
  console.log('VERIFY_OTP', verify.status, verify.body);

  const login = await request(server, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email, password: 'password12', role: 'customer' },
  });
  console.log('LOGIN', login.status, {
    success: login.body?.success,
    hasToken: Boolean(login.body?.token),
  });

  const forgot = await request(server, {
    method: 'POST',
    path: '/api/auth/forgot-password',
    body: { email },
  });
  console.log('FORGOT', forgot.status, forgot.body);

  const meMissing = await request(server, { method: 'GET', path: '/api/users/me' });
  console.log('ME_NO_TOKEN', meMissing.status, meMissing.body?.message);

  const meBad = await request(server, {
    method: 'GET',
    path: '/api/users/me',
    token: 'not-a-jwt',
  });
  console.log('ME_BAD_TOKEN', meBad.status, meBad.body?.message);

  const me = await request(server, {
    method: 'GET',
    path: '/api/users/me',
    token: login.body?.token,
  });
  console.log('ME', me.status, {
    email: me.body?.user?.email,
    role: me.body?.user?.role,
    hasProfile: Boolean(me.body?.profile),
    hasHash: Boolean(me.body?.user?.passwordHash),
  });

  const adminSignup = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: 'Http Admin',
      email: `http-admin-${stamp}@example.com`,
      phone: `+91971111${String(stamp).slice(-6)}`,
      password: 'password12',
      role: 'admin',
    },
  });
  console.log('ADMIN_SIGNUP', adminSignup.status, adminSignup.body?.message);
} finally {
  if (userId) {
    await CustomerProfile.deleteOne({ userId });
    await User.deleteOne({ _id: userId });
  }
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
}
