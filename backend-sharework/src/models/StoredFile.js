import mongoose from 'mongoose';

export const STORED_FILE_KINDS = Object.freeze(['portfolio', 'deliverable', 'attachment']);

const storedFileSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: STORED_FILE_KINDS,
      required: true,
      index: true,
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true },
    gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', index: true },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    storageKey: { type: String, required: true, trim: true, unique: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, strict: true },
);

storedFileSchema.index({ createdAt: 1 });

export default mongoose.model('StoredFile', storedFileSchema);
