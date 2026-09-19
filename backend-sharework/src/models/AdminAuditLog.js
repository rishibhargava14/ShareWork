import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: { type: String, required: true, trim: true, maxlength: 80, index: true },
    targetType: { type: String, trim: true, maxlength: 40 },
    targetId: { type: String, trim: true, maxlength: 64, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    previousState: { type: mongoose.Schema.Types.Mixed },
    currentState: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, strict: true },
);

adminAuditLogSchema.index({ createdAt: -1, _id: -1 });

export default mongoose.model('AdminAuditLog', adminAuditLogSchema);
