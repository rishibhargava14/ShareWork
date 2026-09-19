import Gig from '../models/Gig.js';
import User from '../models/User.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';
import {
  toPublicCustomerProfile,
  toPublicProviderProfile,
  toPublicUser,
  toSafeCustomerProfile,
  toSafeGig,
  toSafeProviderProfile,
  toSafeUser,
} from '../utils/safeUser.js';
import { loadProfile } from './auth.service.js';

const serializeOwnerProfile = (user, profile) => {
  if (user.role === 'customer') {
    return toSafeCustomerProfile(profile);
  }

  if (user.role === 'provider') {
    return toSafeProviderProfile(profile);
  }

  return null;
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (user.isBanned) {
    throw new AppError('Account is not available', HTTP_STATUS.FORBIDDEN);
  }

  const profile = await loadProfile(user);

  return {
    user: toSafeUser(user),
    profile: serializeOwnerProfile(user, profile),
  };
};

export const updateCurrentUser = async (userId, { name, avatar, bio, country }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (user.isBanned) {
    throw new AppError('Account is not available', HTTP_STATUS.FORBIDDEN);
  }

  if (name !== undefined) {
    user.name = name;
  }

  if (avatar !== undefined) {
    user.avatar = avatar;
  }

  await user.save();

  const profile = await loadProfile(user);

  if (profile && (bio !== undefined || country !== undefined)) {
    if (bio !== undefined) {
      if (user.role === 'customer' && bio.length > 500) {
        throw new AppError('Bio cannot exceed 500 characters', HTTP_STATUS.BAD_REQUEST);
      }

      profile.bio = bio;
    }

    if (country !== undefined) {
      if (user.role !== 'customer') {
        throw new AppError('Country is only supported on customer profiles', HTTP_STATUS.BAD_REQUEST);
      }

      profile.country = country;
    }

    await profile.save();
  }

  return {
    user: toSafeUser(user),
    profile: serializeOwnerProfile(user, profile),
  };
};

export const getPublicProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user || user.isBanned || user.role === 'admin') {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const profile = await loadProfile(user);

  if (user.role === 'customer') {
    return {
      user: toPublicUser(user),
      profile: toPublicCustomerProfile(profile),
      rating: null,
      gigs: [],
    };
  }

  const gigs = await Gig.find({ providerId: user._id, isActive: true })
    .sort({ createdAt: -1 })
    .lean();

  return {
    user: toPublicUser(user),
    profile: toPublicProviderProfile(profile),
    rating: profile?.rating ?? 0,
    gigs: gigs.map(toSafeGig),
  };
};
