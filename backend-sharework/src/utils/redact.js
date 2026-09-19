const SECRET_PATTERNS = [
  /mongodb(\+srv)?:\/\/[^\s)'"]+/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /x-razorpay-signature/gi,
];

export const redactSecrets = (value) => {
  let text = String(value ?? '');
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, '[redacted]');
  }
  return text;
};
