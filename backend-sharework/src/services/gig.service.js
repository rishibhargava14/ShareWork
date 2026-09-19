import Gig from '../models/Gig.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';
import { toSafeGig } from '../utils/safeUser.js';
import { persistUploads } from './file.service.js';
import { assertActiveCategory } from './category.service.js';

const EDITABLE_FIELDS = [
  'title',
  'category',
  'description',
  'packages',
  'faqs',
  'requirements',
  'isActive',
];

export const createGig = async (providerId, payload, files = []) => {
  await assertActiveCategory(payload.category);
  const gig = await Gig.create({
    providerId,
    title: payload.title,
    category: payload.category,
    description: payload.description,
    packages: payload.packages,
    faqs: payload.faqs ?? [],
    requirements: payload.requirements,
    portfolioImages: [],
  });

  const uploadList = Array.isArray(files) ? files : [];
  if (uploadList.length) {
    gig.portfolioImages = await persistUploads({
      files: uploadList,
      ownerId: providerId,
      kind: 'portfolio',
      gigId: gig._id,
    });
    await gig.save();
  }

  return { gig: toSafeGig(gig) };
};

export const updateGig = async (providerId, gigId, payload, files = []) => {
  const gig = await Gig.findById(gigId);

  if (!gig) {
    throw new AppError('Gig not found', HTTP_STATUS.NOT_FOUND);
  }

  if (String(gig.providerId) !== String(providerId)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }

  for (const field of EDITABLE_FIELDS) {
    if (payload[field] !== undefined) {
      if (field === 'category') {
        await assertActiveCategory(payload.category);
      }
      gig[field] = payload[field];
    }
  }

  const uploadList = Array.isArray(files) ? files : [];
  if (uploadList.length) {
    const uploaded = await persistUploads({
      files: uploadList,
      ownerId: providerId,
      kind: 'portfolio',
      gigId: gig._id,
    });
    gig.portfolioImages = [...(gig.portfolioImages ?? []), ...uploaded];
  }

  await gig.save();

  return { gig: toSafeGig(gig) };
};

export const getGig = async (gigId) => {
  const gig = await Gig.findById(gigId);

  if (!gig) {
    throw new AppError('Gig not found', HTTP_STATUS.NOT_FOUND);
  }

  return { gig: toSafeGig(gig) };
};
