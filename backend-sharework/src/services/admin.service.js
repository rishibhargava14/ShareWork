import { DISCOVERY_PAGE_SIZE } from '../constants/pagination.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import CustomerProfile from '../models/CustomerProfile.js';
import Dispute from '../models/Dispute.js';
import Escrow from '../models/Escrow.js';
import Gig from '../models/Gig.js';
import LeakageLog from '../models/LeakageLog.js';
import Project from '../models/Project.js';
import ProviderProfile from '../models/ProviderProfile.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { forceReleaseEscrow, refundEscrow, splitEscrow } from './escrow.service.js';
import { writeAudit, listAuditLogs } from './audit.service.js';
import {
  createCategory as createCategoryRecord,
  deleteCategory as deleteCategoryRecord,
  listCategories as listCategoryRecords,
  updateCategory as updateCategoryRecord,
} from './category.service.js';
import { notifyUsers } from './notification.service.js';
import { getPlatformSettings, updatePlatformSettings } from './platformSettings.service.js';
import { AppError } from '../utils/AppError.js';
import {
  toAdminDispute,
  toAdminEscrow,
  toAdminLeakageLog,
  toAdminUser,
  toSafeGig,
  toSafeProject,
  toSafeProviderProfile,
  toSafeCustomerProfile,
  toSafeTransaction,
} from '../utils/safeUser.js';

const ADMIN_PAGE_SIZE = DISCOVERY_PAGE_SIZE;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sumCompletedPlatformRevenue = async () => {
  const [result] = await Transaction.aggregate([
    {
      $match: {
        type: { $in: ['fee', 'gst'] },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$amount' },
      },
    },
  ]);

  return result?.revenue ?? 0;
};

const sumEscrowByStatus = async (status) => {
  const [result] = await Escrow.aggregate([
    { $match: { status } },
    { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return { amount: result?.amount ?? 0, count: result?.count ?? 0 };
};

const userNamesByIds = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean).map((id) => String(id)))];
  if (unique.length === 0) return {};
  const users = await User.find({ _id: { $in: unique } }).select('name').lean();
  return Object.fromEntries(users.map((user) => [String(user._id), user.name]));
};

const actorId = (actor) => actor?.id ?? actor?._id;

export const getStats = async () => {
  const [
    users,
    customers,
    providers,
    projects,
    activeProjects,
    completedProjects,
    leakageCount,
    revenue,
    locked,
    released,
    refunded,
    split,
    disputesOpen,
    pendingWithdrawals,
    pendingWithdrawalSum,
    transactions,
  ] = await Promise.all([
    User.countDocuments({ role: { $in: ['customer', 'provider'] } }),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'provider' }),
    Project.countDocuments(),
    Project.countDocuments({ status: { $in: ['in_progress', 'delivered', 'escrow_funded'] } }),
    Project.countDocuments({ status: 'completed' }),
    LeakageLog.countDocuments(),
    sumCompletedPlatformRevenue(),
    sumEscrowByStatus('locked'),
    sumEscrowByStatus('released'),
    sumEscrowByStatus('refunded'),
    sumEscrowByStatus('split'),
    Dispute.countDocuments({ status: { $in: ['open', 'in_review'] } }),
    Transaction.countDocuments({ type: 'withdrawal', status: 'pending' }),
    Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'pending' } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
    Transaction.countDocuments(),
  ]);

  return {
    users,
    customers,
    providers,
    projects,
    activeProjects,
    completedProjects,
    escrowLocked: locked.count,
    escrowLockedAmount: locked.amount,
    escrowReleasedAmount: released.amount,
    escrowRefundedAmount: refunded.amount,
    escrowSplitAmount: split.amount,
    leakageCount,
    revenue,
    disputesOpen,
    pendingWithdrawals,
    pendingWithdrawalsAmount: pendingWithdrawalSum[0]?.amount ?? 0,
    transactions,
  };
};

export const listUsers = async ({ role, page, q, isBanned } = {}) => {
  const filter = role ? { role } : { role: { $in: ['customer', 'provider'] } };
  if (isBanned === true || isBanned === false) {
    filter.isBanned = isBanned;
  }
  if (q) {
    const pattern = escapeRegex(q);
    filter.$or = [
      { name: { $regex: pattern, $options: 'i' } },
      { email: { $regex: pattern, $options: 'i' } },
    ];
  }
  const skip = (page - 1) * ADMIN_PAGE_SIZE;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(ADMIN_PAGE_SIZE).lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map(toAdminUser),
    total,
    page,
  };
};

export const getUser = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user || !['customer', 'provider'].includes(user.role)) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const [profile, gigs, projects] = await Promise.all([
    user.role === 'provider'
      ? ProviderProfile.findOne({ userId: user._id }).lean()
      : CustomerProfile.findOne({ userId: user._id }).lean(),
    user.role === 'provider' ? Gig.find({ providerId: user._id }).sort({ updatedAt: -1 }).lean() : [],
    Project.find({ $or: [{ customerId: user._id }, { providerId: user._id }] })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean(),
  ]);

  return {
    user: toAdminUser(user),
    profile:
      user.role === 'provider' ? toSafeProviderProfile(profile) : toSafeCustomerProfile(profile),
    gigs: gigs.map(toSafeGig),
    projects: projects.map(toSafeProject),
  };
};

export const listProjects = async ({ status, q, page } = {}) => {
  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (q) {
    const pattern = escapeRegex(q);
    filter.$or = [{ title: { $regex: pattern, $options: 'i' } }];
  }

  const query = Project.find(filter).sort({ updatedAt: -1, _id: -1 });
  if (page) {
    query.skip((page - 1) * ADMIN_PAGE_SIZE).limit(ADMIN_PAGE_SIZE);
  }

  const [projects, total] = await Promise.all([
    query.lean(),
    Project.countDocuments(filter),
  ]);
  const names = await userNamesByIds(projects.flatMap((project) => [project.customerId, project.providerId]));

  return {
    projects: projects.map((project) => ({
      ...toSafeProject(project),
      customerName: names[String(project.customerId)] ?? 'Customer',
      providerName: names[String(project.providerId)] ?? 'Provider',
    })),
    total,
    page: page ?? 1,
  };
};

export const getProject = async (projectId) => {
  const project = await Project.findById(projectId).lean();
  if (!project) {
    throw new AppError('Project not found', HTTP_STATUS.NOT_FOUND);
  }

  const [escrow, transactions, disputes, names] = await Promise.all([
    Escrow.findOne({ projectId }).lean(),
    Transaction.find({ projectId }).sort({ createdAt: -1, _id: -1 }).lean(),
    Dispute.find({ projectId }).sort({ createdAt: -1, _id: -1 }).lean(),
    userNamesByIds([project.customerId, project.providerId]),
  ]);

  return {
    project: {
      ...toSafeProject(project),
      customerName: names[String(project.customerId)] ?? 'Customer',
      providerName: names[String(project.providerId)] ?? 'Provider',
    },
    escrow: escrow ? toAdminEscrow(escrow) : null,
    transactions: transactions.map(toSafeTransaction),
    disputes: disputes.map(toAdminDispute),
  };
};

export const listEscrows = async () => {
  const escrows = await Escrow.find().sort({ createdAt: -1, _id: -1 }).lean();
  const names = await userNamesByIds(escrows.flatMap((escrow) => [escrow.customerId, escrow.providerId]));

  return {
    escrows: escrows.map((escrow) => ({
      ...toAdminEscrow(escrow),
      customerName: names[String(escrow.customerId)] ?? 'Customer',
      providerName: names[String(escrow.providerId)] ?? 'Provider',
    })),
  };
};

export const listTransactions = async ({ type, status, page = 1 } = {}) => {
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  const skip = (page - 1) * ADMIN_PAGE_SIZE;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(ADMIN_PAGE_SIZE).lean(),
    Transaction.countDocuments(filter),
  ]);

  const names = await userNamesByIds(transactions.map((item) => item.userId));
  const projects = await Project.find({
    _id: { $in: transactions.map((item) => item.projectId).filter(Boolean) },
  })
    .select('title')
    .lean();
  const titles = Object.fromEntries(projects.map((item) => [String(item._id), item.title]));

  return {
    transactions: transactions.map((item) => ({
      ...toSafeTransaction(item),
      userName: names[String(item.userId)] ?? 'User',
      projectTitle: item.projectId ? titles[String(item.projectId)] ?? '' : '',
    })),
    total,
    page,
  };
};

export const listWithdrawals = async ({ status, page = 1 } = {}) => {
  const filter = { type: 'withdrawal' };
  if (status) filter.status = status;
  const skip = (page - 1) * ADMIN_PAGE_SIZE;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(ADMIN_PAGE_SIZE).lean(),
    Transaction.countDocuments(filter),
  ]);
  const names = await userNamesByIds(transactions.map((item) => item.userId));

  return {
    withdrawals: transactions.map((item) => ({
      ...toSafeTransaction(item),
      providerName: names[String(item.userId)] ?? 'Provider',
    })),
    total,
    page,
  };
};

export const listLeakageLogs = async () => {
  const logs = await LeakageLog.find().sort({ createdAt: -1, _id: -1 }).lean();
  const names = await userNamesByIds(logs.map((log) => log.senderId));

  return {
    logs: logs.map((log) => ({
      ...toAdminLeakageLog(log),
      senderName: names[String(log.senderId)] ?? 'User',
    })),
  };
};

export const listDisputes = async ({ status } = {}) => {
  const filter = {};
  if (status) {
    filter.status = status;
  }

  const disputes = await Dispute.find(filter).sort({ createdAt: -1, _id: -1 }).lean();
  const projects = await Project.find({ _id: { $in: disputes.map((item) => item.projectId) } }).lean();
  const projectById = Object.fromEntries(projects.map((project) => [String(project._id), project]));
  const names = await userNamesByIds(
    disputes.flatMap((item) => {
      const project = projectById[String(item.projectId)];
      return [item.raisedBy, project?.customerId, project?.providerId];
    }),
  );

  return {
    disputes: disputes.map((item) => {
      const project = projectById[String(item.projectId)];
      return {
        ...toAdminDispute(item),
        projectTitle: project?.title ?? '',
        amount: project?.fixedPrice ?? 0,
        customerName: names[String(project?.customerId)] ?? 'Customer',
        providerName: names[String(project?.providerId)] ?? 'Provider',
        raisedByName: names[String(item.raisedBy)] ?? 'User',
      };
    }),
  };
};

export const listCategories = async () => listCategoryRecords({ includeInactive: true });

export const createCategory = async (payload, actor) => {
  const result = await createCategoryRecord(payload);
  await writeAudit({
    adminId: actorId(actor),
    action: 'category.create',
    targetType: 'category',
    targetId: result.category.id,
    currentState: result.category,
  });
  return result;
};

export const updateCategory = async (categoryId, payload, actor) => {
  const result = await updateCategoryRecord(categoryId, payload);
  await writeAudit({
    adminId: actorId(actor),
    action: 'category.update',
    targetType: 'category',
    targetId: categoryId,
    currentState: result.category,
  });
  return result;
};

export const deleteCategory = async (categoryId, actor) => {
  const result = await deleteCategoryRecord(categoryId);
  await writeAudit({
    adminId: actorId(actor),
    action: 'category.delete',
    targetType: 'category',
    targetId: categoryId,
  });
  return result;
};

export const getSettings = async () => getPlatformSettings();

export const updateSettings = async (payload, actor) => {
  const previous = await getPlatformSettings();
  const result = await updatePlatformSettings(payload);
  await writeAudit({
    adminId: actorId(actor),
    action: 'settings.update',
    targetType: 'settings',
    previousState: previous.settings,
    currentState: result.settings,
  });
  return result;
};

export const resolveDispute = async (disputeId, { resolution, refund, split }, actor) => {
  if (refund === true && split === true) {
    throw new AppError('Cannot refund and split in the same resolution', HTTP_STATUS.BAD_REQUEST);
  }

  const dispute = await Dispute.findById(disputeId);

  if (!dispute) {
    throw new AppError('Dispute not found', HTTP_STATUS.NOT_FOUND);
  }

  if (dispute.status === 'resolved') {
    throw new AppError('Dispute is already resolved', HTTP_STATUS.BAD_REQUEST);
  }

  const previousStatus = dispute.status;
  let financial = null;

  if (split === true) {
    financial = await splitEscrow(dispute.projectId, { disputeId: dispute._id });
  } else if (refund === true) {
    financial = await refundEscrow(dispute.projectId, { disputeId: dispute._id });
  } else {
    const project = await Project.findById(dispute.projectId);
    if (project?.status === 'disputed') {
      project.status = 'in_progress';
      await project.save();
    }
  }

  dispute.status = 'resolved';
  dispute.resolution = resolution;
  await dispute.save();

  const project = await Project.findById(dispute.projectId).select('customerId providerId').lean();
  if (project) {
    await notifyUsers([project.customerId, project.providerId], {
      type: 'system',
      title: 'Dispute resolved',
      message: resolution,
      link: `/projects/${project._id}`,
    });
  }

  await writeAudit({
    adminId: actorId(actor),
    action: split ? 'dispute.split' : refund ? 'dispute.refund' : 'dispute.resolve',
    targetType: 'dispute',
    targetId: disputeId,
    projectId: dispute.projectId,
    previousState: { status: previousStatus },
    currentState: { status: dispute.status, resolution },
    metadata: financial
      ? {
          alreadyProcessed: financial.alreadyProcessed,
          customerRefund: financial.customerRefund,
          net: financial.net,
        }
      : null,
  });

  return {
    dispute: toAdminDispute(dispute),
    financial: financial
      ? {
          alreadyProcessed: financial.alreadyProcessed,
          escrowStatus: financial.escrow?.status,
          projectStatus: financial.project?.status,
          customerRefund: financial.customerRefund,
          providerNet: financial.net,
        }
      : null,
  };
};

export const forceReleaseProject = async (projectId, actor) => {
  const released = await forceReleaseEscrow(projectId);

  await writeAudit({
    adminId: actorId(actor),
    action: 'escrow.force_release',
    targetType: 'project',
    targetId: projectId,
    projectId,
    currentState: {
      escrowStatus: released.escrow?.status,
      projectStatus: released.project?.status,
      alreadyProcessed: released.alreadyProcessed,
    },
  });

  return {
    escrow: toAdminEscrow(released.escrow),
    project: toSafeProject(released.project),
    alreadyProcessed: released.alreadyProcessed,
    net: released.net ?? null,
  };
};

export const setUserBanStatus = async (userId, { isBanned, reason }, actor) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const previous = { isBanned: user.isBanned, bannedReason: user.bannedReason };
  user.isBanned = isBanned;
  user.bannedReason = isBanned ? reason : '';
  await user.save();

  await writeAudit({
    adminId: actorId(actor),
    action: isBanned ? 'user.ban' : 'user.unban',
    targetType: 'user',
    targetId: userId,
    previousState: previous,
    currentState: { isBanned: user.isBanned, bannedReason: user.bannedReason },
  });

  return {
    user: toAdminUser(user),
  };
};

export const listAdminAuditLogs = async (query) => listAuditLogs(query);
