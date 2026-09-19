import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const helperSource = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "passwordReset.js"), "utf8");
const {
  mapResetOtpError,
  mapResetPasswordError,
  PASSWORD_REQUIREMENT,
  PASSWORDS_MISMATCH,
  RESET_OTP_SENT,
  validateResetPasswords,
} = await import(`data:text/javascript,${encodeURIComponent(helperSource)}`);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

let passed = 0;
const check = (name, ok) => {
  if (!ok) throw new Error(`FAIL: ${name}`);
  passed += 1;
  console.log(`ok ${name}`);
};

check("generic forgot copy does not enumerate accounts", RESET_OTP_SENT.includes("If an account exists"));
check("invalid OTP copy", mapResetOtpError({ message: "Invalid OTP" }) === "Invalid verification code. Please try again.");
check(
  "expired OTP copy",
  mapResetOtpError({ message: "OTP has expired. Request a new code." }) === "This code has expired. Please request a new code.",
);
check(
  "locked OTP copy",
  mapResetOtpError({ message: "Too many attempts. Request a new code." }) ===
    "Too many incorrect attempts. Please request a new code.",
);
check(
  "cooldown copy uses retryAfterSeconds",
  mapResetOtpError({ message: "Please wait before requesting another OTP", status: 429, retryAfterSeconds: 12 }) ===
    "Please wait 12 seconds before requesting another code.",
);
check("weak password copy", mapResetPasswordError({ message: "Validation failed", fields: { newPassword: "x" } }) === PASSWORD_REQUIREMENT);
check("password mismatch is client-side", validateResetPasswords("newpass12", "otherpass").confirm === PASSWORDS_MISMATCH);

const login = read("app/(auth)/login/page.js");
check("admin forgot control opens recovery flow", login.includes("Forgot Password?") && login.includes("setResetOpen(true)"));
check("admin no longer uses seeded-account toast as recovery", !login.includes("Use the seeded admin account from the backend."));
check("admin forgot is not a mock toast", !login.includes("showToast"));

const auth = read("lib/auth.js");
check("admin helper posts forgot-password", auth.includes('"/api/auth/forgot-password"'));
check("admin helper posts reset-password", auth.includes('"/api/auth/reset-password"'));
check("admin resend uses purpose reset", auth.includes('purpose: "reset"'));

const flow = read("components/auth/ForgotPasswordFlow.js");
check("admin reset UI covers email, OTP, password, success", ["Send OTP", "Resend OTP", "Reset Password", "Back to Sign In"].every((bit) => flow.includes(bit)));
check("admin reset flow does not persist OTP in web storage", !/localStorage|sessionStorage/.test(flow));
check("admin reset flow does not auto-login", !/loginAdmin\(|setTokens\(/.test(flow));
check("admin reset does not hard-code seeded admin email", !flow.includes("admin@sharework.dev"));

assert.equal(passed > 0, true);
console.log(`\n${passed} admin password-reset checks passed`);
