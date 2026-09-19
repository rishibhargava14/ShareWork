import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { GIG_PACKAGE_TIERS } from '../../src/constants/gigPackages.js';
import Conversation from '../../src/models/Conversation.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import Gig from '../../src/models/Gig.js';
import LeakageLog from '../../src/models/LeakageLog.js';
import Message from '../../src/models/Message.js';
import Project from '../../src/models/Project.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';
import { activateSignup } from '../helpers/activateSignup.js';
import { installMemoryStorage, uninstallMemoryStorage } from '../helpers/mockStorage.js';
import StoredFile from '../../src/models/StoredFile.js';
import {
  CHAT_CLIENT_EVENTS,
  CHAT_SERVER_EVENTS,
  handleJoinConversation,
  handleSendMessage,
  handleTyping,
  handleUpdateOnlineStatus,
  parseConversationId,
  toSafeSocketError,
} from '../../src/sockets/chat.socket.js';
import { detectLeakage } from '../../src/utils/leakageDetection.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdGigIds = [];
const createdConversationIds = [];
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
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
};

const signup = async (server, role, label) => {
  const suffix = { 'cust-a': '1', 'cust-b': '2', 'prov-a': '3', 'prov-b': '4' }[label] ?? '5';
  const response = await request(server, {
    method: 'POST',
    path: '/api/auth/signup',
    body: {
      name: `${role} ${label}`,
      email: `${label}-${stamp}@example.com`,
      phone: `+9187${String(stamp).slice(-8)}${suffix}`,
      password: 'password12',
      role,
    },
  });

  if (response.body?.user?.id) {
    createdUserIds.push(response.body.user.id);
  }

  return activateSignup(response);
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

const agreementBody = (overrides = {}) => ({
  title: 'Landing page build',
  scope: 'Design and develop a marketing landing page with the agreed sections.',
  deliverables: ['Figma file', 'Exported assets'],
  fixedPrice: 15000,
  timelineDays: 7,
  revisions: 2,
  terms: 'Work stays on ShareWork until approval.',
  ...overrides,
});

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

const fakeSocket = (userId, role) => {
  const joined = [];
  return {
    userId,
    userRole: role,
    join(room) {
      joined.push(room);
    },
    joined,
  };
};

const trackConversation = (response) => {
  if (response.body?.conversation?.id) {
    createdConversationIds.push(response.body.conversation.id);
  }
  return response;
};

await connectDb();
const app = createApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  installMemoryStorage();
  record('phone leakage detected', detectLeakage('Call me at 9876543210')?.detectedType === 'phone');
  record('email leakage detected', detectLeakage('Mail me at leak@example.com')?.detectedType === 'email');
  record('upi leakage detected', detectLeakage('Pay provider@oksbi')?.detectedType === 'upi');
  record('link leakage detected', detectLeakage('See https://example.com/docs')?.detectedType === 'link');
  record('telegram link classified as link', detectLeakage('Join t.me/sharework now')?.detectedType === 'link');
  record(
    'wa.me with digits classified as link',
    detectLeakage('Chat on wa.me/919876543210')?.detectedType === 'link',
  );
  record(
    'instagram link classified as link',
    detectLeakage('See instagram.com/sharework')?.detectedType === 'link',
  );
  record(
    'standalone phone still blocked when a link is also present',
    detectLeakage('Call 9876543210 and also t.me/sharework')?.detectedType === 'phone',
  );
  record(
    'clean text is not leakage',
    detectLeakage('Can we start the 5000 Basic package next week?') === null,
  );
  record(
    'socket client events documented',
    CHAT_CLIENT_EVENTS.includes('join_conversation') &&
      CHAT_CLIENT_EVENTS.includes('send_message') &&
      CHAT_CLIENT_EVENTS.includes('typing') &&
      CHAT_CLIENT_EVENTS.includes('update_online_status'),
  );
  record(
    'socket server events documented',
    CHAT_SERVER_EVENTS.includes('new_message') &&
      CHAT_SERVER_EVENTS.includes('agreement_created') &&
      CHAT_SERVER_EVENTS.includes('online_status') &&
      CHAT_SERVER_EVENTS.includes('typing'),
  );

  const customerA = await signup(server, 'customer', 'cust-a');
  const customerB = await signup(server, 'customer', 'cust-b');
  const providerA = await signup(server, 'provider', 'prov-a');
  const providerB = await signup(server, 'provider', 'prov-b');
  const tokenCA = customerA.body.token;
  const tokenCB = customerB.body.token;
  const tokenPA = providerA.body.token;
  const tokenPB = providerB.body.token;
  const customerAId = customerA.body.user.id;
  const providerAId = providerA.body.user.id;
  const providerBId = providerB.body.user.id;

  const admin = await User.create({
    name: 'Phase6 Admin',
    email: `admin-${stamp}@example.com`,
    phone: `+9186${String(stamp).slice(-8)}9`,
    passwordHash: await hashPassword('password12'),
    role: 'admin',
    isVerified: true,
  });
  createdUserIds.push(String(admin._id));
  const adminToken = signAccessToken(admin);

  const gigA = await Gig.create({
    providerId: providerAId,
    title: 'Provider A conversation test gig title',
    category: 'Web',
    description: 'Gig used only to verify conversation gig ownership checks in Phase 6.',
    packages: validPackages(),
  });
  createdGigIds.push(String(gigA._id));

  const gigB = await Gig.create({
    providerId: providerBId,
    title: 'Provider B conversation test gig title',
    category: 'UI/UX',
    description: 'Gig used only to reject mismatched provider/gig conversation creates.',
    packages: validPackages(),
  });
  createdGigIds.push(String(gigB._id));

  const unauthList = await request(server, { method: 'GET', path: '/api/conversations' });
  record('unauthenticated list rejected', unauthList.status === 401);

  const unauthCreate = await request(server, {
    method: 'POST',
    path: '/api/conversations',
    body: { providerId: providerAId },
  });
  record('unauthenticated create rejected', unauthCreate.status === 401);

  const providerCreate = await request(server, {
    method: 'POST',
    path: '/api/conversations',
    token: tokenPA,
    body: { providerId: providerBId },
  });
  record('provider cannot start conversation', providerCreate.status === 403);

  const adminCreate = await request(server, {
    method: 'POST',
    path: '/api/conversations',
    token: adminToken,
    body: { providerId: providerAId },
  });
  record('admin cannot start conversation', adminCreate.status === 403);

  const invalidProvider = await request(server, {
    method: 'POST',
    path: '/api/conversations',
    token: tokenCA,
    body: { providerId: customerB.body.user.id },
  });
  record('invalid provider rejected', invalidProvider.status === 404);

  const badGig = await request(server, {
    method: 'POST',
    path: '/api/conversations',
    token: tokenCA,
    body: { providerId: providerAId, gigId: String(gigB._id) },
  });
  record('mismatched gig/provider rejected', badGig.status === 400);

  const injected = await request(server, {
    method: 'POST',
    path: '/api/conversations',
    token: tokenCA,
    body: { providerId: providerAId, participants: [customerB.body.user.id, providerAId] },
  });
  record('arbitrary participants rejected', injected.status === 400);

  const created = trackConversation(
    await request(server, {
      method: 'POST',
      path: '/api/conversations',
      token: tokenCA,
      body: { providerId: providerAId, gigId: String(gigA._id) },
    }),
  );
  record(
    'customer can create conversation',
    created.status === 201 &&
      created.body.conversation?.participants?.some((item) => item.id === customerAId) &&
      created.body.conversation?.participants?.some((item) => item.id === providerAId) &&
      created.body.conversation.gigId === String(gigA._id),
  );
  record('create response omits auth fields', !hasSensitive(created.body));

  const reused = await request(server, {
    method: 'POST',
    path: '/api/conversations',
    token: tokenCA,
    body: { providerId: providerAId, gigId: String(gigA._id) },
  });
  record(
    'equivalent conversation is reused',
    reused.status === 201 && reused.body.conversation?.id === created.body.conversation.id,
  );

  const listedA = await request(server, { method: 'GET', path: '/api/conversations', token: tokenCA });
  const listedB = await request(server, { method: 'GET', path: '/api/conversations', token: tokenCB });
  const listedP = await request(server, { method: 'GET', path: '/api/conversations', token: tokenPA });
  record(
    'customer lists only own conversations',
    listedA.status === 200 &&
      listedA.body.conversations?.length === 1 &&
      listedA.body.conversations[0].id === created.body.conversation.id,
  );
  record('other customer does not see conversation', listedB.status === 200 && listedB.body.conversations?.length === 0);
  record(
    'provider participant can list conversation',
    listedP.status === 200 && listedP.body.conversations?.some((item) => item.id === created.body.conversation.id),
  );

  const convId = created.body.conversation.id;
  const unauthMessages = await request(server, {
    method: 'GET',
    path: `/api/conversations/${convId}/messages`,
  });
  record('unauthenticated messages rejected', unauthMessages.status === 401);

  const outsiderMessages = await request(server, {
    method: 'GET',
    path: `/api/conversations/${convId}/messages`,
    token: tokenCB,
  });
  record('non-participant messages rejected', outsiderMessages.status === 403);

  const outsiderSend = await request(server, {
    method: 'POST',
    path: `/api/conversations/${convId}/messages`,
    token: tokenCB,
    body: { type: 'text', content: 'I should not be able to write here.' },
  });
  record('non-participant send rejected', outsiderSend.status === 403);

  const spoofSender = await request(server, {
    method: 'POST',
    path: `/api/conversations/${convId}/messages`,
    token: tokenCA,
    body: { type: 'text', content: 'Hello from the customer.', senderId: providerBId },
  });
  record('senderId from body rejected', spoofSender.status === 400);

  const textMsg = await request(server, {
    method: 'POST',
    path: `/api/conversations/${convId}/messages`,
    token: tokenCA,
    body: { type: 'text', content: 'Hello from the customer.' },
  });
  record(
    'participant can send text',
    textMsg.status === 201 &&
      textMsg.body.message?.content === 'Hello from the customer.' &&
      textMsg.body.message.senderId === customerAId &&
      textMsg.body.message.isMasked === false,
  );

  const fileForm = new FormData();
  fileForm.append('type', 'file');
  fileForm.append('content', 'Here is the reference file.');
  fileForm.append('file', new Blob(['%PDF-1.4 brief'], { type: 'application/pdf' }), 'brief.pdf');
  const fileMsg = await request(server, {
    method: 'POST',
    path: `/api/conversations/${convId}/messages`,
    token: tokenPA,
    form: fileForm,
  });
  record(
    'participant can send stored file reference',
    fileMsg.status === 201 &&
      String(fileMsg.body.message?.fileUrl || '').startsWith('/api/files/') &&
      fileMsg.body.message?.fileName === 'brief.pdf',
  );

  const peerFile = await request(server, {
    method: 'GET',
    path: fileMsg.body.message.fileUrl,
    token: tokenCA,
  });
  record('conversation peer can download attachment', peerFile.status === 200);

  const outsiderFile = await request(server, {
    method: 'GET',
    path: fileMsg.body.message.fileUrl,
    token: tokenCB,
  });
  record('outsider cannot download attachment', outsiderFile.status === 403);

  const badFile = await request(server, {
    method: 'POST',
    path: `/api/conversations/${convId}/messages`,
    token: tokenPA,
    body: {
      type: 'file',
      content: 'Remote fetch should not happen.',
      fileUrl: 'http://169.254.169.254/latest/meta-data',
    },
  });
  record('arbitrary remote file URL rejected', badFile.status === 400);

  const listedMessages = await request(server, {
    method: 'GET',
    path: `/api/conversations/${convId}/messages`,
    token: tokenPA,
  });
  record(
    'participants can list messages',
    listedMessages.status === 200 &&
      listedMessages.body.messages?.length === 2 &&
      listedMessages.body.messages[0].content === 'Hello from the customer.',
  );
  record('message list omits auth fields', !hasSensitive(listedMessages.body));

  const phoneLeak = 'Reach me on 9876543210 after five';
  const leakedPhone = await request(server, {
    method: 'POST',
    path: `/api/conversations/${convId}/messages`,
    token: tokenCA,
    body: { type: 'text', content: phoneLeak },
  });
  record(
    'phone leakage blocked',
    leakedPhone.status === 400 && leakedPhone.body.details?.code === 'LEAKAGE_BLOCKED',
  );
  record(
    'raw phone is not returned',
    !JSON.stringify(leakedPhone.body).includes('9876543210'),
  );

  const phoneLog = await LeakageLog.findOne({ conversationId: convId, detectedType: 'phone' }).lean();
  record(
    'phone leakage log created',
    phoneLog?.action === 'blocked' && phoneLog.content.includes('9876543210'),
  );

  const blockedSend = await request(server, {
    method: 'POST',
    path: `/api/conversations/${convId}/messages`,
    token: tokenPA,
    body: { type: 'text', content: 'Are you still there?' },
  });
  record('blocked conversation rejects further messages', blockedSend.status === 403);

  const openConv = trackConversation(
    await request(server, {
      method: 'POST',
      path: '/api/conversations',
      token: tokenCA,
      body: { providerId: providerBId, gigId: String(gigB._id) },
    }),
  );
  const openId = openConv.body.conversation.id;

  const leakedEmail = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId}/messages`,
    token: tokenCA,
    body: { type: 'text', content: 'Mail me at leak@example.com please' },
  });
  record('email leakage blocked', leakedEmail.status === 400 && !JSON.stringify(leakedEmail.body).includes('leak@example.com'));

  const openConv2 = trackConversation(
    await request(server, {
      method: 'POST',
      path: '/api/conversations',
      token: tokenCB,
      body: { providerId: providerAId },
    }),
  );
  const openId2 = openConv2.body.conversation.id;

  const leakedUpi = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId2}/messages`,
    token: tokenCB,
    body: { type: 'text', content: 'Send it to provider@oksbi now' },
  });
  record('upi leakage blocked', leakedUpi.status === 400 && !JSON.stringify(leakedUpi.body).includes('provider@oksbi'));

  const openConv3 = trackConversation(
    await request(server, {
      method: 'POST',
      path: '/api/conversations',
      token: tokenCB,
      body: { providerId: providerBId },
    }),
  );
  const openId3 = openConv3.body.conversation.id;

  const leakedLink = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/messages`,
    token: tokenCB,
    body: { type: 'text', content: 'Review this https://example.com/docs please' },
  });
  record(
    'link leakage masked and stored',
    leakedLink.status === 201 &&
      leakedLink.body.message?.isMasked === true &&
      leakedLink.body.message.content.includes('[link removed]') &&
      !leakedLink.body.message.content.includes('https://example.com'),
  );

  const clean = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/messages`,
    token: tokenPB,
    body: { type: 'text', content: 'Can we start the 5000 Basic package next week?' },
  });
  record('clean text allowed after masked link', clean.status === 201);

  const customerAgreement = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement`,
    token: tokenCB,
    body: agreementBody(),
  });
  record('customer cannot create agreement', customerAgreement.status === 403);

  const outsiderAgreement = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement`,
    token: tokenPA,
    body: agreementBody(),
  });
  record('non-participant provider cannot create agreement', outsiderAgreement.status === 403);

  const badPrice = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement`,
    token: tokenPB,
    body: agreementBody({ fixedPrice: 10000 }),
  });
  record('invalid fixed price rejected', badPrice.status === 400);

  const hourly = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement`,
    token: tokenPB,
    body: { ...agreementBody(), hourlyRate: 500 },
  });
  record('hourly rate field rejected', hourly.status === 400);

  const agreement = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement`,
    token: tokenPB,
    body: agreementBody(),
  });
  record(
    'provider creates system_agreement',
    agreement.status === 201 &&
      agreement.body.message?.type === 'system_agreement' &&
      agreement.body.message.agreement?.status === 'pending' &&
      agreement.body.message.agreement.fixedPrice === 15000 &&
      agreement.body.message.senderId === providerBId,
  );

  const providerApprove = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement/${agreement.body.message.id}/approve`,
    token: tokenPB,
  });
  record('provider cannot approve agreement', providerApprove.status === 403);

  const unrelated = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement/${new mongoose.Types.ObjectId()}/approve`,
    token: tokenCB,
  });
  record('unrelated agreement id rejected', unrelated.status === 404);

  const approved = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement/${agreement.body.message.id}/approve`,
    token: tokenCB,
  });
  if (approved.body?.project?.id) {
    createdProjectIds.push(approved.body.project.id);
  }
  record(
    'customer can approve agreement',
    approved.status === 200 &&
      approved.body.project?.status === 'agreement_pending' &&
      approved.body.project.customerId === customerB.body.user.id &&
      approved.body.project.providerId === providerBId &&
      approved.body.project.fixedPrice === 15000 &&
      approved.body.project.escrow?.status === 'pending' &&
      approved.body.message?.agreement?.status === 'approved',
  );

  const txs = await Transaction.countDocuments({
    $or: [{ userId: customerB.body.user.id }, { userId: providerBId }],
  });
  record('approval does not create payment transactions', txs === 0);

  const duplicateApprove = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement/${agreement.body.message.id}/approve`,
    token: tokenCB,
  });
  record('finalized agreement cannot be approved again', duplicateApprove.status === 400);

  const secondAgreement = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement`,
    token: tokenPB,
    body: agreementBody({ title: 'Second landing revision pack' }),
  });
  const rejected = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement/${secondAgreement.body.message.id}/reject`,
    token: tokenCB,
    body: { reason: 'Scope is too broad for this week.' },
  });
  record(
    'customer can reject agreement',
    rejected.status === 200 &&
      rejected.body.message?.agreement?.status === 'rejected' &&
      rejected.body.reason === 'Scope is too broad for this week.',
  );
  const rejectProjects = await Project.countDocuments({
    conversationId: openId3,
    title: 'Second landing revision pack',
  });
  record('rejection does not create a project', rejectProjects === 0);

  const joinOk = fakeSocket(customerB.body.user.id, 'customer');
  await handleJoinConversation(joinOk, { conversationId: openId3 });
  record('socket join requires participant', joinOk.joined.includes(openId3));

  const joinOutsider = fakeSocket(customerAId, 'customer');
  let joinDenied = false;
  try {
    await handleJoinConversation(joinOutsider, { conversationId: openId3 });
  } catch {
    joinDenied = true;
  }
  record(
    'socket join rejects non-participant',
    joinDenied && !joinOutsider.joined.includes(openId3),
  );

  let invalidJoin = false;
  try {
    parseConversationId({ conversationId: 'not-an-id' });
  } catch {
    invalidJoin = true;
  }
  record('socket join rejects invalid conversation id', invalidJoin);

  const spoofed = await handleSendMessage(fakeSocket(customerB.body.user.id, 'customer'), {
    conversationId: openId3,
    type: 'text',
    content: 'Socket sender must come from auth.',
    senderId: providerBId,
    userId: providerBId,
  });
  record(
    'socket send_message uses authenticated sender',
    spoofed.message?.senderId === customerB.body.user.id,
  );

  let crossSend = false;
  try {
    await handleSendMessage(fakeSocket(customerB.body.user.id, 'customer'), {
      conversationId: convId,
      type: 'text',
      content: 'Should not reach another conversation.',
    });
  } catch (error) {
    crossSend = error.statusCode === 403;
  }
  record('socket send_message cannot target another conversation', crossSend);

  const socketLeak = 'Socket leak 9123456789 please';
  let socketLeakError;
  try {
    await handleSendMessage(fakeSocket(customerB.body.user.id, 'customer'), {
      conversationId: openId3,
      type: 'text',
      content: socketLeak,
    });
  } catch (error) {
    socketLeakError = error;
  }
  const socketSafeError = toSafeSocketError(socketLeakError);
  const socketLog = await LeakageLog.findOne({
    conversationId: openId3,
    detectedType: 'phone',
    senderId: customerB.body.user.id,
  }).lean();
  record(
    'socket send_message applies anti-leakage',
    socketLeakError?.details?.code === 'LEAKAGE_BLOCKED' &&
      socketLog?.action === 'blocked' &&
      !JSON.stringify(socketSafeError).includes('9123456789'),
  );

  let typingDenied = false;
  try {
    await handleTyping(fakeSocket(customerAId, 'customer'), {
      conversationId: openId3,
      isTyping: true,
    });
  } catch (error) {
    typingDenied = error.statusCode === 403;
  }
  record('socket typing cannot target unauthorized conversation', typingDenied);

  const typingOk = await handleTyping(fakeSocket(customerB.body.user.id, 'customer'), {
    conversationId: openId3,
    isTyping: true,
  });
  record(
    'socket typing allows participant',
    typingOk.conversationId === openId3 && typingOk.userId === customerB.body.user.id,
  );

  const customerBefore = await User.findById(customerAId).lean();
  await handleUpdateOnlineStatus(fakeSocket(providerAId, 'provider'), {
    status: 'busy',
    userId: customerAId,
  });
  const providerAfter = await ProviderProfile.findOne({ userId: providerAId }).lean();
  const customerAfter = await User.findById(customerAId).lean();
  record(
    'update_online_status ignores payload userId',
    providerAfter?.availability?.onlineStatus === 'busy' &&
      Boolean(customerAfter?.isOnline) === Boolean(customerBefore?.isOnline),
  );

  let customerStatusDenied = false;
  try {
    await handleUpdateOnlineStatus(fakeSocket(customerAId, 'customer'), { status: 'online' });
  } catch (error) {
    customerStatusDenied = error.statusCode === 403;
  }
  record('update_online_status is provider-only via Phase 5 service', customerStatusDenied);

  record(
    'socket error sanitizes leaked contacts',
    toSafeSocketError(new Error('Call me at 9876543210')).message.includes('**********') &&
      !toSafeSocketError(new Error('Call me at 9876543210')).message.includes('9876543210'),
  );

  const rejectAgain = await request(server, {
    method: 'POST',
    path: `/api/conversations/${openId3}/agreement/${secondAgreement.body.message.id}/reject`,
    token: tokenCB,
    body: { reason: 'Still no.' },
  });
  record('finalized agreement cannot be rejected again', rejectAgain.status === 400);

  const health = await request(server, { method: 'GET', path: '/health' });
  record('health still returns 200', health.status === 200);
} catch (error) {
  record('phase 6 test runner', false, error.message);
} finally {
  uninstallMemoryStorage();
  if (createdConversationIds.length > 0) {
    await StoredFile.deleteMany({ conversationId: { $in: createdConversationIds } });
    await Message.deleteMany({ conversationId: { $in: createdConversationIds } });
    await LeakageLog.deleteMany({ conversationId: { $in: createdConversationIds } });
    await Conversation.deleteMany({ _id: { $in: createdConversationIds } });
  }
  if (createdProjectIds.length > 0) {
    await Project.deleteMany({ _id: { $in: createdProjectIds } });
  }
  if (createdGigIds.length > 0) {
    await Gig.deleteMany({ _id: { $in: createdGigIds } });
  }
  if (createdUserIds.length > 0) {
    await Conversation.deleteMany({ participants: { $in: createdUserIds } });
    await Message.deleteMany({ senderId: { $in: createdUserIds } });
    await LeakageLog.deleteMany({ senderId: { $in: createdUserIds } });
    await Project.deleteMany({
      $or: [{ customerId: { $in: createdUserIds } }, { providerId: { $in: createdUserIds } }],
    });
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
