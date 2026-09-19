import mongoose from 'mongoose';
import Gig from '../models/Gig.js';
import Project from '../models/Project.js';
import ProviderProfile from '../models/ProviderProfile.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';
import { toSafeGig, toSafeProviderProfile, toSafeTransaction } from '../utils/safeUser.js';
import { notifyUser } from './notification.service.js';

// In-flight Project statuses used only for a read-only dashboard count.
// Not a Project-module rule and not a source-defined "active" contract.
const ACTIVE_PROJECT_STATUSES = Object.freeze(['escrow_funded', 'in_progress', 'delivered']);
const COUNTED_WITHDRAWAL_STATUSES = Object.freeze(['pending', 'completed']);

const toUserObjectId = (userId) => new mongoose.Types.ObjectId(String(userId));

const transactionsUnsupported = (error) => {
  const message = String(error.message || '');
  return (
    message.includes('Transaction numbers are only allowed') ||
    message.includes('replica set member') ||
    error.codeName === 'IllegalOperation'
  );
};

const requireProviderProfile = async (userId) => {
  const profile = await ProviderProfile.findOne({ userId });

  if (!profile) {
    throw new AppError('Provider profile not found', HTTP_STATUS.NOT_FOUND);
  }

  return profile;
};

const aggregateSum = async (userId, match, field, session) => {
  const pipeline = [
    { $match: { userId: toUserObjectId(userId), ...match } },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ];
  const [row] = await Transaction.aggregate(pipeline, session ? { session } : {});
  return row?.total ?? 0;
};

const calculateEarningsSummary = async (userId, session) => {
  const [total, pending, withdrawn] = await Promise.all([
    aggregateSum(userId, { type: 'escrow_release', status: 'completed' }, 'netAmount', session),
    aggregateSum(userId, { type: 'escrow_release', status: 'pending' }, 'netAmount', session),
    aggregateSum(
      userId,
      { type: 'withdrawal', status: { $in: [...COUNTED_WITHDRAWAL_STATUSES] } },
      'amount',
      session,
    ),
  ]);

  return {
    total,
    pending,
    withdrawn,
  };
};

const listOwnedTransactions = async (userId) => {
  const transactions = await Transaction.find({ userId: toUserObjectId(userId) })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  return transactions.map(toSafeTransaction);
};

export const listProviderGigs = async (providerId, requesterId) => {
  const provider = await User.findById(providerId);

  if (!provider || provider.role !== 'provider' || provider.isBanned) {
    throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND);
  }

  const filter = { providerId: provider._id };
  if (String(requesterId) !== String(provider._id)) {
    filter.isActive = true;
  }

  const gigs = await Gig.find(filter).sort({ createdAt: -1 }).lean();

  return {
    gigs: gigs.map(toSafeGig),
  };
};

export const getDashboardStats = async (userId) => {
  await requireProviderProfile(userId);

  const userObjectId = toUserObjectId(userId);
  const [profile, gigRows, activeProjects, earnings] = await Promise.all([
    ProviderProfile.findOne({ userId: userObjectId }).lean(),
    Gig.aggregate([
      { $match: { providerId: userObjectId } },
      { $group: { _id: null, views: { $sum: '$views' }, orders: { $sum: '$orders' } } },
    ]),
    Project.countDocuments({
      providerId: userObjectId,
      status: { $in: [...ACTIVE_PROJECT_STATUSES] },
    }),
    calculateEarningsSummary(userId),
  ]);

  const views = gigRows[0]?.views ?? 0;
  const orders = gigRows[0]?.orders ?? 0;

  return {
    earnings: {
      total: earnings.total,
      pending: earnings.pending,
      withdrawn: earnings.withdrawn,
    },
    activeProjects,
    rating: profile?.rating ?? 0,
    views,
    // Implementation formula only. Source lists "conversion" but does not define it.
    // When views exist: Gig.orders / Gig.views. Otherwise null — not a fake zero.
    conversion: views > 0 ? orders / views : null,
  };
};

export const getEarnings = async (userId) => {
  await requireProviderProfile(userId);

  const [summary, transactions] = await Promise.all([
    calculateEarningsSummary(userId),
    listOwnedTransactions(userId),
  ]);

  return {
    total: summary.total,
    pending: summary.pending,
    withdrawn: summary.withdrawn,
    transactions,
  };
};

export const updateAvailability = async (userId, { weeklySchedule, vacationMode }) => {
  const profile = await ProviderProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        'availability.weeklySchedule': weeklySchedule,
        'availability.vacationMode': vacationMode,
      },
    },
    { new: true, runValidators: true },
  );

  if (!profile) {
    throw new AppError('Provider profile not found', HTTP_STATUS.NOT_FOUND);
  }

  return {
    availability: toSafeProviderProfile(profile).availability,
  };
};

// Source socket handler: update ProviderProfile.availability.onlineStatus + User.isOnline.
// busy maps to isOnline=false because User.isOnline is a boolean, not a 3-state field.
const syncUserOnlineFlag = async (userId, onlineStatus) => {
  await User.findByIdAndUpdate(userId, {
    $set: { isOnline: onlineStatus === 'online' },
  });
};

export const toggleOnlineStatus = async (userId, { onlineStatus }) => {
  const profile = await ProviderProfile.findOneAndUpdate(
    { userId },
    { $set: { 'availability.onlineStatus': onlineStatus } },
    { new: true, runValidators: true },
  );

  if (!profile) {
    throw new AppError('Provider profile not found', HTTP_STATUS.NOT_FOUND);
  }

  await syncUserOnlineFlag(userId, onlineStatus);
  const user = await User.findById(userId).lean();

  return {
    onlineStatus: profile.availability?.onlineStatus ?? onlineStatus,
    isOnline: Boolean(user?.isOnline),
    availability: toSafeProviderProfile(profile).availability,
  };
};

const createWithdrawalRecord = async (userId, amount, upiId, session) => {
  const summary = await calculateEarningsSummary(userId);
  // Conservative safeguard only — NOT a source-defined wallet / availableBalance spec.
  // Ceiling = completed escrow_release.netAmount minus pending+completed withdrawal.amount.
  // Pending escrow_release is never treated as withdrawable provider funds.
  const conservativeCeiling = summary.total - summary.withdrawn;

  if (amount > conservativeCeiling) {
    throw new AppError(
      'Withdrawal exceeds conservative completed-release total. Pending escrow releases are not withdrawable.',
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const payload = {
    userId,
    type: 'withdrawal',
    amount,
    fee: 0,
    gst: 0,
    netAmount: amount,
    status: 'pending',
    upiId,
  };

  if (session) {
    const [transaction] = await Transaction.create([payload], { session });
    return transaction;
  }

  return Transaction.create(payload);
};

export const requestWithdrawal = async (userId, { amount, upiId }) => {
  await requireProviderProfile(userId);

  const persist = async (session) => createWithdrawalRecord(userId, amount, upiId, session);

  let transaction;

  try {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      transaction = await persist(session);
      await session.commitTransaction();
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    if (!transactionsUnsupported(error)) {
      throw error;
    }

    transaction = await persist(null);
  }

  await notifyUser({
    userId,
    type: 'payment',
    title: 'Withdrawal requested',
    message: `Withdrawal of ₹${amount} is pending. Funds have not been transferred.`,
    link: '/earnings',
  });

  return {
    transaction: toSafeTransaction(transaction),
    message: 'Withdrawal request created. Funds have not been transferred.',
  };
};
