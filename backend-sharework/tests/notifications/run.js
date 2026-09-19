import http from 'node:http';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import Notification from '../../src/models/Notification.js';
import User from '../../src/models/User.js';
import { notifyUser } from '../../src/services/notification.service.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdNotificationIds = [];

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
    name: `Notify ${role} ${label}`,
    email: `notify-${role}-${label}-${stamp}@example.com`,
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
  const customer = await createUser('customer', '1');
  const provider = await createUser('provider', '1');
  const tokenC = signAccessToken(customer);
  const tokenP = signAccessToken(provider);

  const own = await notifyUser({
    userId: customer._id,
    type: 'system',
    title: 'Hello',
    message: 'Customer note',
    link: '/projects/1',
  });
  const other = await notifyUser({
    userId: provider._id,
    type: 'payment',
    title: 'Paid',
    message: 'Provider note',
    link: '/earnings',
  });
  createdNotificationIds.push(String(own._id), String(other._id));

  const unauth = await request(server, { method: 'GET', path: '/api/notifications' });
  record('unauthenticated notifications rejected', unauth.status === 401);

  const listed = await request(server, { method: 'GET', path: '/api/notifications?page=1', token: tokenC });
  record(
    'customer lists only own notifications',
    listed.status === 200 &&
      listed.body.notifications.some((item) => item.id === String(own._id)) &&
      listed.body.notifications.every((item) => item.userId === String(customer._id)) &&
      !listed.body.notifications.some((item) => item.id === String(other._id)),
  );

  const unread = await request(server, { method: 'GET', path: '/api/notifications/unread-count', token: tokenC });
  record('unread count is own unread only', unread.status === 200 && unread.body.unreadCount >= 1);

  const steal = await request(server, {
    method: 'PATCH',
    path: `/api/notifications/${other._id}/read`,
    token: tokenC,
  });
  record('cannot mark another user notification read', steal.status === 403);

  const mark = await request(server, {
    method: 'PATCH',
    path: `/api/notifications/${own._id}/read`,
    token: tokenC,
  });
  record('owner can mark notification read', mark.status === 200 && mark.body.notification?.isRead === true);

  const markAll = await request(server, {
    method: 'PATCH',
    path: '/api/notifications/read-all',
    token: tokenP,
  });
  record('provider can mark all own notifications read', markAll.status === 200);
  const providerUnread = await request(server, {
    method: 'GET',
    path: '/api/notifications/unread-count',
    token: tokenP,
  });
  record('provider unread is zero after mark all', providerUnread.status === 200 && providerUnread.body.unreadCount === 0);
} catch (error) {
  record('phase 3 notification test runner', false, error.message);
} finally {
  if (createdNotificationIds.length > 0) {
    await Notification.deleteMany({ _id: { $in: createdNotificationIds } });
  }
  if (createdUserIds.length > 0) {
    await Notification.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
}

const failed = results.filter((item) => !item.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
