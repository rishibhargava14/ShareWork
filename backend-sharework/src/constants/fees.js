import { env } from '../config/env.js';

let override = null;

export const applyFeePercents = (feePercent, gstPercent) => {
  override = {
    feePercent: Number(feePercent),
    gstPercent: Number(gstPercent),
  };
};

export const getFeePercents = () =>
  override ?? {
    feePercent: env.PLATFORM_FEE_PERCENT,
    gstPercent: env.GST_ON_FEE_PERCENT,
  };
