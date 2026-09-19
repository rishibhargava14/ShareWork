import Requirement from '../models/Requirement.js';
import { toSafeRequirement } from '../utils/safeUser.js';
import { assertActiveCategory } from './category.service.js';

export const createRequirement = async (customerId, payload) => {
  await assertActiveCategory(payload.category);
  const requirement = await Requirement.create({
    customerId,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    budget: payload.budget,
    deadline: payload.deadline,
    skills: payload.skills,
    status: 'open',
  });

  return { requirement: toSafeRequirement(requirement) };
};

export const listRequirements = async (customerId) => {
  const requirements = await Requirement.find({ customerId }).sort({ createdAt: -1, _id: -1 }).lean();

  return {
    requirements: requirements.map(toSafeRequirement),
  };
};
