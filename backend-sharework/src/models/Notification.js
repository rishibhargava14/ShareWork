import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../constants/schemaEnums.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, enum: NOTIFICATION_TYPES },
    title: { type: String, trim: true },
    message: { type: String, trim: true },
    link: { type: String, trim: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true, strict: true },
);

export default mongoose.model('Notification', notificationSchema);
