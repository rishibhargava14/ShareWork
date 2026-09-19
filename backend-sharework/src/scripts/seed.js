import { env } from '../config/env.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { GIG_PACKAGE_TIERS } from '../constants/gigPackages.js';
import AdminUser from '../models/AdminUser.js';
import Conversation from '../models/Conversation.js';
import CustomerProfile from '../models/CustomerProfile.js';
import Gig from '../models/Gig.js';
import ProviderProfile from '../models/ProviderProfile.js';
import Requirement from '../models/Requirement.js';
import User from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { ensureDefaultCategories } from '../services/category.service.js';

const SEED_PASSWORD = 'ShareWorkDev1!';

const CUSTOMER = Object.freeze({
  email: 'customer@sharework.dev',
  phone: '+919900000001',
  name: 'Dev Customer',
});

const PROVIDER = Object.freeze({
  email: 'provider@sharework.dev',
  phone: '+919900000002',
  name: 'Dev Provider',
});

const ADMIN = Object.freeze({
  email: 'admin@sharework.dev',
  phone: '+919900000003',
  name: 'Dev Admin',
});

const seedPackages = () => [
  {
    name: 'Basic',
    description: 'Basic landing page package for local frontend testing',
    fixedPrice: GIG_PACKAGE_TIERS.Basic,
    deliveryDays: 3,
    revisions: 1,
    features: ['1 page'],
  },
  {
    name: 'Standard',
    description: 'Standard multi-page site package for local frontend testing',
    fixedPrice: GIG_PACKAGE_TIERS.Standard,
    deliveryDays: 7,
    revisions: 2,
    features: ['5 pages'],
  },
  {
    name: 'Premium',
    description: 'Premium product package for local frontend testing',
    fixedPrice: GIG_PACKAGE_TIERS.Premium,
    deliveryDays: 14,
    revisions: 4,
    features: ['Unlimited pages'],
  },
];

const upsertUser = async ({ email, phone, name, role }, passwordHash) => {
  const existing = await User.findOne({ email });

  if (existing) {
    existing.name = name;
    existing.phone = phone;
    existing.role = role;
    existing.passwordHash = passwordHash;
    existing.isVerified = true;
    existing.isBanned = false;
    existing.bannedReason = undefined;
    await existing.save();
    return existing;
  }

  return User.create({
    name,
    email,
    phone,
    passwordHash,
    role,
    isVerified: true,
  });
};

const run = async () => {
  if (env.NODE_ENV === 'production') {
    console.error('Seed refuses to run when NODE_ENV=production.');
    process.exit(1);
  }

  await connectDb();

  try {
    const passwordHash = await hashPassword(SEED_PASSWORD);
    const customer = await upsertUser({ ...CUSTOMER, role: 'customer' }, passwordHash);
    const provider = await upsertUser({ ...PROVIDER, role: 'provider' }, passwordHash);
    const admin = await upsertUser({ ...ADMIN, role: 'admin' }, passwordHash);

    await AdminUser.findOneAndUpdate(
      { userId: admin._id },
      { $setOnInsert: { userId: admin._id } },
      { upsert: true, new: true },
    );

    await CustomerProfile.findOneAndUpdate(
      { userId: customer._id },
      {
        $set: {
          companyName: 'ShareWork Dev Customer',
          bio: 'Local development customer for frontend integration.',
          country: 'India',
          preferredCategories: ['Web', 'UI/UX'],
        },
        $setOnInsert: { userId: customer._id },
      },
      { upsert: true, new: true },
    );

    await ProviderProfile.findOneAndUpdate(
      { userId: provider._id },
      {
        $set: {
          title: 'ShareWork Dev Designer',
          bio: 'Local development provider for frontend integration.',
          skills: ['Figma', 'React', 'UI'],
          categories: ['Web', 'UI/UX'],
          experienceLevel: 'intermediate',
          startingPrice: 5000,
          rating: 4.8,
          reviewsCount: 12,
          isAvailable: true,
          availability: {
            onlineStatus: 'online',
            weeklySchedule: [],
            capacityAvailable: 3,
          },
        },
        $setOnInsert: { userId: provider._id },
      },
      { upsert: true, new: true },
    );

    const gig = await Gig.findOneAndUpdate(
      { providerId: provider._id, title: 'ShareWork Dev Web Gig' },
      {
        $set: {
          category: 'Web',
          description: 'Deterministic development gig used by frontend integration.',
          packages: seedPackages(),
          isActive: true,
        },
        $setOnInsert: { providerId: provider._id, title: 'ShareWork Dev Web Gig' },
      },
      { upsert: true, new: true },
    );

    const existingConversation = await Conversation.findOne({
      participants: { $all: [customer._id, provider._id], $size: 2 },
      gigId: gig._id,
    });

    if (!existingConversation) {
      await Conversation.create({
        participants: [customer._id, provider._id],
        gigId: gig._id,
        lastMessage: 'Seed conversation ready for frontend integration.',
        lastMessageAt: new Date(),
        unreadCount: {},
      });
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 21);

    await Requirement.findOneAndUpdate(
      { customerId: customer._id, title: 'ShareWork Dev Landing Page' },
      {
        $set: {
          description: 'Need a marketing landing page for local frontend integration tests.',
          category: 'Web',
          budget: 15000,
          deadline,
          skills: ['React', 'Figma'],
          status: 'open',
        },
        $setOnInsert: { customerId: customer._id, title: 'ShareWork Dev Landing Page' },
      },
      { upsert: true, new: true },
    );

    await ensureDefaultCategories();

    console.log('Seed complete for local development.');
    console.log(`Base URL: http://localhost:${env.PORT}`);
    console.log('Local seed accounts: customer@sharework.dev, provider@sharework.dev, admin@sharework.dev');
    console.log('Development password is documented in README. Do not use these accounts in production.');
  } finally {
    await disconnectDb();
  }
};

run().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
