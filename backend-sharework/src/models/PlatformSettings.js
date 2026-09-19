import mongoose from 'mongoose';
import { GIG_PACKAGE_PRICES } from '../constants/gigPackages.js';

const platformSettingsSchema = new mongoose.Schema(
  {
    feePercent: { type: Number, default: 10 },
    gstPercent: { type: Number, default: 18 },
    fixedPackages: { type: [Number], default: () => [...GIG_PACKAGE_PRICES] },
    maintenance: { type: Boolean, default: false },
  },
  { strict: true },
);

export default mongoose.model('PlatformSettings', platformSettingsSchema);
