import { env } from '../config/env.js';
import { applyFeePercents } from '../constants/fees.js';
import { GIG_PACKAGE_PRICES } from '../constants/gigPackages.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import PlatformSettings from '../models/PlatformSettings.js';
import { AppError } from '../utils/AppError.js';

const toSettings = (doc) => ({
  feePercent: doc?.feePercent ?? env.PLATFORM_FEE_PERCENT,
  gstPercent: doc?.gstPercent ?? env.GST_ON_FEE_PERCENT,
  fixedPackages: doc?.fixedPackages ?? [...GIG_PACKAGE_PRICES],
  maintenance: Boolean(doc?.maintenance),
});

export const ensurePlatformSettings = async () => {
  const settings = await PlatformSettings.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        feePercent: env.PLATFORM_FEE_PERCENT,
        gstPercent: env.GST_ON_FEE_PERCENT,
        fixedPackages: [...GIG_PACKAGE_PRICES],
        maintenance: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  applyFeePercents(settings.feePercent, settings.gstPercent);
  return settings;
};

export const getPlatformSettings = async () => {
  const settings = await ensurePlatformSettings();
  return { settings: toSettings(settings) };
};

export const updatePlatformSettings = async (payload) => {
  if (
    payload.feePercent === undefined &&
    payload.gstPercent === undefined &&
    payload.maintenance === undefined
  ) {
    throw new AppError('No settings to update', HTTP_STATUS.BAD_REQUEST);
  }

  const $set = {};
  if (payload.feePercent !== undefined) $set.feePercent = payload.feePercent;
  if (payload.gstPercent !== undefined) $set.gstPercent = payload.gstPercent;
  if (payload.maintenance !== undefined) $set.maintenance = payload.maintenance;

  const settings = await PlatformSettings.findOneAndUpdate(
    {},
    { $set },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  applyFeePercents(settings.feePercent, settings.gstPercent);
  return { settings: toSettings(settings) };
};
