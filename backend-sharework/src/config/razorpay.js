import Razorpay from 'razorpay';
import { env } from './env.js';

let razorpayClient;

export const getRazorpayClient = () => {
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayClient;
};

export const setRazorpayClient = (client) => {
  if (env.NODE_ENV === 'production') {
    throw new Error('Razorpay client override is not allowed in production');
  }

  razorpayClient = client;
};

export const resetRazorpayClient = () => {
  razorpayClient = undefined;
};
