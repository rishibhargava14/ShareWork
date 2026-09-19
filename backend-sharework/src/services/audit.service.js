import AdminAuditLog from '../models/AdminAuditLog.js';

export const writeAudit = async ({
  adminId,
  action,
  targetType,
  targetId,
  projectId,
  previousState,
  currentState,
  metadata,
}) => {
  if (!adminId || !action) {
    return null;
  }

  return AdminAuditLog.create({
    adminId,
    action,
    targetType: targetType ?? '',
    targetId: targetId ? String(targetId) : '',
    projectId: projectId || undefined,
    previousState: previousState ?? null,
    currentState: currentState ?? null,
    metadata: metadata ?? null,
  });
};

export const listAuditLogs = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AdminAuditLog.find().sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    AdminAuditLog.countDocuments(),
  ]);

  return {
    logs: logs.map((log) => ({
      id: String(log._id),
      adminId: String(log.adminId),
      action: log.action,
      targetType: log.targetType ?? '',
      targetId: log.targetId ?? '',
      projectId: log.projectId ? String(log.projectId) : null,
      previousState: log.previousState ?? null,
      currentState: log.currentState ?? null,
      metadata: log.metadata ?? null,
      createdAt: log.createdAt,
    })),
    total,
    page,
  };
};
