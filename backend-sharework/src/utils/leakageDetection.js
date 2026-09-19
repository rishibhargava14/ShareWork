const PATTERNS = Object.freeze({
  phone: /(?:\+91[-\s]?)?[6-9]\d{9}\b|\+\d{10,15}\b|\b\d{10}\b/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  upi: /[a-zA-Z0-9._-]+@(?:okicici|okhdfc|oksbi|ybl|upi|paytm|phonepe|ibl|axl|[a-z0-9-]{2,})\b(?!\.)/gi,
  link: /(?:https?:\/\/|www\.|t\.me\/|wa\.me\/|(?:www\.)?instagram\.com\/)[^\s]+/gi,
});

const MASKS = Object.freeze({
  phone: '**********',
  email: '***@***.com',
  upi: '***@upi',
  link: '[link removed]',
});

const DETECTION_ORDER = Object.freeze(['phone', 'email', 'upi', 'link']);
const CONTACT_TYPES = Object.freeze(['phone', 'email', 'upi']);

const resetRegex = (regex) => {
  regex.lastIndex = 0;
  return regex;
};

const stripLinks = (content) => content.replace(resetRegex(PATTERNS.link), ' ');

export const maskLeakage = (content, detectedType) => {
  const pattern = PATTERNS[detectedType];
  if (!pattern) {
    return content;
  }

  return content.replace(resetRegex(pattern), MASKS[detectedType]);
};

export const maskAllLeakage = (content) => {
  if (typeof content !== 'string' || content.length === 0) {
    return content;
  }

  return DETECTION_ORDER.reduce((next, type) => maskLeakage(next, type), content);
};

export const detectLeakage = (content) => {
  if (typeof content !== 'string' || content.length === 0) {
    return null;
  }

  const withoutLinks = stripLinks(content);

  for (const type of CONTACT_TYPES) {
    const source = type === 'phone' ? withoutLinks : content;
    if (resetRegex(PATTERNS[type]).test(source)) {
      return {
        detectedType: type,
        maskedContent: maskLeakage(content, type),
      };
    }
  }

  if (resetRegex(PATTERNS.link).test(content)) {
    return {
      detectedType: 'link',
      maskedContent: maskLeakage(content, 'link'),
    };
  }

  return null;
};
