export const RESET_OTP_SENT =
  "If an account exists for this email, a verification code has been sent.";

export const RESET_SUCCESS = "Password updated successfully. Please sign in with your new password.";

export const PASSWORDS_MISMATCH = "Passwords do not match.";

export const PASSWORD_REQUIREMENT = "Password must be at least 8 characters.";

export function mapResetOtpError(err) {
  const message = err?.message ?? "";
  const wait = err?.retryAfterSeconds;

  if (/expired/i.test(message)) {
    return "This code has expired. Please request a new code.";
  }
  if (/too many attempts/i.test(message)) {
    return "Too many incorrect attempts. Please request a new code.";
  }
  if (/invalid otp/i.test(message)) {
    return "Invalid verification code. Please try again.";
  }
  if (
    err?.status === 429 ||
    /please wait before requesting/i.test(message) ||
    /too many otp requests/i.test(message) ||
    /too many authentication/i.test(message)
  ) {
    if (typeof wait === "number" && wait > 0) {
      return `Please wait ${wait} seconds before requesting another code.`;
    }
    if (/too many otp requests/i.test(message) || /too many authentication/i.test(message)) {
      return "Too many OTP requests. Try again later.";
    }
    return "Please wait before requesting another code.";
  }

  return message || "Something went wrong. Try again.";
}

export function mapResetPasswordError(err) {
  const message = err?.message ?? "";
  if (
    /expired|too many attempts|invalid otp|please wait|too many otp|too many authentication/i.test(message) ||
    err?.status === 429
  ) {
    return mapResetOtpError(err);
  }
  if (err?.fields?.newPassword || /validation failed/i.test(message) || /at least 8/i.test(message)) {
    return PASSWORD_REQUIREMENT;
  }
  return message || "Something went wrong. Try again.";
}

export function validateResetPasswords(password, confirm) {
  const errors = {};
  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = PASSWORD_REQUIREMENT;
  } else if (password.length > 128) {
    errors.password = "Password must be 128 characters or fewer.";
  }
  if (!confirm) {
    errors.confirm = "Confirm your password.";
  } else if (password !== confirm) {
    errors.confirm = PASSWORDS_MISMATCH;
  }
  return errors;
}
