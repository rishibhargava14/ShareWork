export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^\+?[\d\s()-]{7,15}$/;

export interface FieldError {
  field: string;
  message: string;
}

export interface Validated<T> {
  valid: boolean;
  value: T;
  errors: FieldError[];
}

export function validateEmail(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return "Email is required.";
  if (!EMAIL_RE.test(value.trim())) return "Enter a valid email address.";
  return null;
}

export function validatePassword(value: unknown): string | null {
  if (typeof value !== "string" || !value) return "Password is required.";
  return null;
}

export function validateName(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return "Full name is required.";
  if (value.trim().length < 2) return "Name must be at least 2 characters.";
  return null;
}

export function validatePhone(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return "Phone is required.";
  return null;
}

export function validateOtp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return "OTP is required.";
  if (!/^\d{6}$/.test(value.trim())) return "OTP must be a 6-digit code.";
  return null;
}

export function validateRole(value: unknown, allowed: readonly string[]): string | null {
  if (typeof value !== "string" || !allowed.includes(value)) {
    return "Please choose a valid role.";
  }
  return null;
}

export function validatePrice(value: unknown): string | null {
  const num = Number(value);
  if (typeof value === "string" && value.trim() === "") return "Price is required.";
  if (!Number.isFinite(num) || num <= 0) return "Enter a price greater than 0.";
  if (num > 1_000_000) return "Price is unrealistically high.";
  return null;
}

export function validatePositiveInt(value: unknown, label = "Value"): string | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return `${label} must be a positive number.`;
  if (!Number.isInteger(num)) return `${label} must be a whole number.`;
  return null;
}

export function validateRequired(value: unknown, label: string): string | null {
  if (typeof value !== "string" || !value.trim()) return `${label} is required.`;
  return null;
}

export function validateLength(value: unknown, label: string, max: number): string | null {
  if (typeof value !== "string" || value.trim().length > max) {
    return `${label} must be ${max} characters or fewer.`;
  }
  return null;
}

/** Returns [fieldErrorMap, cleaned] — first error per field. */
export function collect(errors: Array<{ field: string; message: string | null } | null>) {
  const map: Record<string, string> = {};
  for (const err of errors) {
    if (err && err.message && !map[err.field]) map[err.field] = err.message;
  }
  return map;
}