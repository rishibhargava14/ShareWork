export const GIG_PACKAGE_NAMES = Object.freeze(['Basic', 'Standard', 'Premium']);

export const GIG_PACKAGE_TIERS = Object.freeze({
  Basic: 5000,
  Standard: 15000,
  Premium: 35000,
});

export const GIG_PACKAGE_PRICES = Object.freeze(Object.values(GIG_PACKAGE_TIERS));

export const GIG_PACKAGE_COUNT = GIG_PACKAGE_NAMES.length;

export const SERVICE_CATEGORIES = Object.freeze(['UI/UX', 'Web', 'App', 'Figma', 'IT']);
