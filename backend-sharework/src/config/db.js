import dns from 'node:dns';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '1.1.1.1']);
import { env } from './env.js';
import { ensurePlatformSettings } from '../services/platformSettings.service.js';

export const isMongoConnected = () => mongoose.connection.readyState === 1;

export const connectDb = async () => {
  try {
    mongoose.set('strictQuery', true);

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB error:', error.message);
    });

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    try {
      await mongoose.connection.db.collection('adminusers').dropIndex('email_1');
    } catch (error) {
      const ignorable = error?.code === 26 || error?.code === 27;
      if (!ignorable) {
        console.warn('Could not drop leftover adminusers.email_1 index:', error.message);
      }
    }

    await ensurePlatformSettings();

    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

export const disconnectDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('MongoDB disconnected');
  }
};
