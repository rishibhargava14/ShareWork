import { DISCOVERY_PAGE_SIZE } from '../constants/pagination.js';
import ProviderProfile from '../models/ProviderProfile.js';
import { toDiscoveryProvider } from '../utils/safeUser.js';
import { assertKnownCategory } from './category.service.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildDiscoveryMatch = ({ category, budgetMin, budgetMax, rating, online, search }) => {
  const match = {};

  if (category) {
    match.categories = category;
  }

  if (rating !== undefined) {
    match.rating = { $gte: rating };
  }

  if (budgetMin !== undefined || budgetMax !== undefined) {
    match.startingPrice = {};
    if (budgetMin !== undefined) {
      match.startingPrice.$gte = budgetMin;
    }
    if (budgetMax !== undefined) {
      match.startingPrice.$lte = budgetMax;
    }
  }

  if (online) {
    match['availability.onlineStatus'] = online;
  }

  if (search) {
    const pattern = escapeRegex(search);
    match.$or = [
      { title: { $regex: pattern, $options: 'i' } },
      { bio: { $regex: pattern, $options: 'i' } },
      { skills: { $regex: pattern, $options: 'i' } },
    ];
  }

  return match;
};

export const discoverProviders = async (query) => {
  if (query.category) {
    await assertKnownCategory(query.category);
  }
  const page = query.page;
  const skip = (page - 1) * DISCOVERY_PAGE_SIZE;
  const match = buildDiscoveryMatch(query);

  const [result] = await ProviderProfile.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $match: {
        'user.role': 'provider',
        'user.isBanned': { $ne: true },
      },
    },
    { $sort: { rating: -1, _id: 1 } },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        items: [{ $skip: skip }, { $limit: DISCOVERY_PAGE_SIZE }],
      },
    },
  ]);

  const total = result?.metadata?.[0]?.total ?? 0;
  const providers = (result?.items ?? []).map((item) => toDiscoveryProvider(item, item.user));

  return {
    providers,
    total,
    page,
  };
};
