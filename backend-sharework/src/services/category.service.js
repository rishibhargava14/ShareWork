import Category from '../models/Category.js';
import Gig from '../models/Gig.js';
import ProviderProfile from '../models/ProviderProfile.js';
import Requirement from '../models/Requirement.js';
import { SERVICE_CATEGORIES } from '../constants/gigPackages.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';

const slugify = (name) =>
  String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const toSafeCategory = (category, counts = {}) => ({
  id: String(category._id),
  name: category.name,
  slug: category.slug,
  isActive: Boolean(category.isActive),
  isSystem: Boolean(category.isSystem),
  gigs: counts[category.name] ?? 0,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

export const ensureDefaultCategories = async () => {
  const existing = await Category.find({ name: { $in: [...SERVICE_CATEGORIES] } })
    .select('name')
    .lean();
  const have = new Set(existing.map((item) => item.name));
  const missing = SERVICE_CATEGORIES.filter((name) => !have.has(name));

  if (missing.length === 0) {
    return;
  }

  await Category.insertMany(
    missing.map((name) => ({
      name,
      slug: slugify(name),
      isActive: true,
      isSystem: true,
    })),
    { ordered: false },
  ).catch((error) => {
    if (error.code !== 11000) {
      throw error;
    }
  });
};

const gigCountsByName = async () => {
  const rows = await Gig.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
};

export const listCategories = async ({ includeInactive = false } = {}) => {
  await ensureDefaultCategories();
  const filter = includeInactive ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ isSystem: -1, name: 1, _id: 1 }).lean();
  const counts = await gigCountsByName();
  return {
    categories: categories.map((item) => toSafeCategory(item, counts)),
  };
};

export const assertActiveCategory = async (name) => {
  await ensureDefaultCategories();
  const category = await Category.findOne({ name });
  if (!category || !category.isActive) {
    throw new AppError('Invalid category', HTTP_STATUS.BAD_REQUEST);
  }
  return category;
};

export const assertKnownCategory = async (name) => {
  await ensureDefaultCategories();
  const category = await Category.findOne({ name });
  if (!category) {
    throw new AppError('Invalid category', HTTP_STATUS.BAD_REQUEST);
  }
  return category;
};

export const createCategory = async ({ name }) => {
  await ensureDefaultCategories();
  const trimmed = String(name).trim();
  const slug = slugify(trimmed);
  if (!slug) {
    throw new AppError('Invalid category name', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const category = await Category.create({
      name: trimmed,
      slug,
      isActive: true,
      isSystem: false,
    });
    return { category: toSafeCategory(category) };
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('Category already exists', HTTP_STATUS.CONFLICT);
    }
    throw error;
  }
};

export const updateCategory = async (categoryId, { name, isActive }) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
  }

  if (name !== undefined) {
    if (category.isSystem) {
      throw new AppError('System category names cannot be renamed', HTTP_STATUS.BAD_REQUEST);
    }
    const trimmed = String(name).trim();
    const slug = slugify(trimmed);
    if (!slug) {
      throw new AppError('Invalid category name', HTTP_STATUS.BAD_REQUEST);
    }
    category.name = trimmed;
    category.slug = slug;
  }

  if (isActive !== undefined) {
    category.isActive = isActive;
  }

  try {
    await category.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('Category already exists', HTTP_STATUS.CONFLICT);
    }
    throw error;
  }

  const counts = await gigCountsByName();
  return { category: toSafeCategory(category, counts) };
};

export const deleteCategory = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
  }

  if (category.isSystem) {
    throw new AppError('System categories cannot be deleted', HTTP_STATUS.BAD_REQUEST);
  }

  const [gigCount, requirementCount, providerCount] = await Promise.all([
    Gig.countDocuments({ category: category.name }),
    Requirement.countDocuments({ category: category.name }),
    ProviderProfile.countDocuments({ categories: category.name }),
  ]);

  if (gigCount + requirementCount + providerCount > 0) {
    throw new AppError('Category is in use and cannot be deleted', HTTP_STATUS.BAD_REQUEST);
  }

  await category.deleteOne();
  return { deleted: true, id: String(categoryId) };
};
