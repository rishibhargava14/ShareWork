import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import Escrow from '../../src/models/Escrow.js';
import Project from '../../src/models/Project.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';
import { hashPassword } from '../../src/utils/password.js';
import { calculateFee, lockEscrow, releaseEscrow } from '../../src/services/escrow.service.js';

const results = [];
const stamp = Date.now();
const createdUserIds = [];
const createdProjectIds = [];

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

await connectDb();

try {
  const math = calculateFee(15000);
  const basic = calculateFee(5000);
  const premium = calculateFee(35000);
  record(
    'fee calculation matches source example',
    math.fee === 1500 && math.gst === 270 && math.net === 13230 && math.feePercent === 10 && math.gstPercent === 18,
  );
  record(
    'fee calculation for 5000 package',
    basic.fee === 500 && basic.gst === 90 && basic.net === 4410,
  );
  record(
    'fee calculation for 35000 package',
    premium.fee === 3500 && premium.gst === 630 && premium.net === 30870,
  );

  const customer = await User.create({
    name: 'Escrow Customer',
    email: `esc-c-${stamp}@example.com`,
    phone: `+9175${String(stamp).slice(-8)}1`,
    passwordHash: await hashPassword('password12'),
    role: 'customer',
  });
  const provider = await User.create({
    name: 'Escrow Provider',
    email: `esc-p-${stamp}@example.com`,
    phone: `+9175${String(stamp).slice(-8)}2`,
    passwordHash: await hashPassword('password12'),
    role: 'provider',
  });
  createdUserIds.push(String(customer._id), String(provider._id));
  await ProviderProfile.create({
    userId: provider._id,
    title: 'Escrow Tester',
    categories: ['Web'],
    startingPrice: 5000,
  });

  const project = await Project.create({
    customerId: customer._id,
    providerId: provider._id,
    conversationId: new mongoose.Types.ObjectId(),
    title: 'Escrow math project',
    scope: 'Used only to verify lock and release accounting.',
    deliverables: ['Files'],
    fixedPrice: 15000,
    timelineDays: 7,
    status: 'agreement_pending',
    deadline: new Date(Date.now() + 86400000),
    escrow: { amount: 15000, status: 'pending' },
  });
  createdProjectIds.push(String(project._id));

  const locked = await lockEscrow({
    projectId: project._id,
    customerId: customer._id,
    providerId: provider._id,
    gatewayTransactionId: 'pay_test_escrow',
  });
  record('lock creates locked escrow', locked.escrow.status === 'locked' && locked.alreadyProcessed === false);
  record('lock uses project amount', locked.escrow.amount === 15000);
  record('lock fee/gst/net correct', locked.escrow.fee === 1500 && locked.escrow.gst === 270 && locked.escrow.net === 13230);

  const lockedAgain = await lockEscrow({
    projectId: project._id,
    customerId: customer._id,
    providerId: provider._id,
  });
  record('lock is idempotent', lockedAgain.alreadyProcessed === true);
  record('duplicate escrow not created', (await Escrow.countDocuments({ projectId: project._id })) === 1);

  let releasedEarly;
  try {
    await releaseEscrow(project._id);
    releasedEarly = false;
  } catch (error) {
    releasedEarly = error.statusCode === 400;
  }
  record('release only from delivered', releasedEarly);

  await Project.updateOne({ _id: project._id }, { $set: { status: 'delivered' } });
  const released = await releaseEscrow(project._id);
  record('release from delivered succeeds', released.alreadyProcessed === false && released.net === 13230);

  const txs = await Transaction.find({ projectId: project._id }).lean();
  const byType = Object.fromEntries(txs.map((item) => [item.type, item]));
  record('funding transaction exists', byType.escrow_fund?.userId.toString() === String(customer._id));
  record(
    'release transaction correct',
    byType.escrow_release?.userId.toString() === String(provider._id) &&
      byType.escrow_release.netAmount === 13230 &&
      byType.escrow_release.status === 'completed',
  );
  record('fee transaction correct', byType.fee?.amount === 1500 && byType.fee.userId.toString() === String(provider._id));
  record('gst transaction correct', byType.gst?.amount === 270 && byType.gst.userId.toString() === String(provider._id));

  const releasedAgain = await releaseEscrow(project._id);
  record('release is idempotent', releasedAgain.alreadyProcessed === true);
  record(
    'duplicate release transactions not created',
    (await Transaction.countDocuments({ projectId: project._id, type: 'escrow_release' })) === 1,
  );

  const completed = await Project.findById(project._id).lean();
  const escrow = await Escrow.findOne({ projectId: project._id }).lean();
  record('project completed and escrow released', completed.status === 'completed' && escrow.status === 'released');
} catch (error) {
  record('phase 7 escrow test runner', false, error.message);
} finally {
  if (createdProjectIds.length > 0) {
    await Transaction.deleteMany({ projectId: { $in: createdProjectIds } });
    await Escrow.deleteMany({ projectId: { $in: createdProjectIds } });
    await Project.deleteMany({ _id: { $in: createdProjectIds } });
  }
  if (createdUserIds.length > 0) {
    await ProviderProfile.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  await disconnectDb();
}

const failed = results.filter((item) => !item.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
