import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

const source = ts.transpileModule(read("src/lib/passwordReset.ts"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helpers = await import(`data:text/javascript,${encodeURIComponent(source)}`);

let passed = 0;
const check = (name, ok) => {
  if (!ok) throw new Error(`FAIL: ${name}`);
  passed += 1;
  console.log(`ok ${name}`);
};

check("generic forgot copy does not enumerate accounts", helpers.RESET_OTP_SENT.includes("If an account exists"));
check(
  "invalid OTP copy",
  helpers.mapResetOtpError({ message: "Invalid OTP" }) === "Invalid verification code. Please try again.",
);
check(
  "expired OTP copy",
  helpers.mapResetOtpError({ message: "OTP has expired. Request a new code." }) ===
    "This code has expired. Please request a new code.",
);
check(
  "locked OTP copy",
  helpers.mapResetOtpError({ message: "Too many attempts. Request a new code." }) ===
    "Too many incorrect attempts. Please request a new code.",
);
check(
  "cooldown copy uses retryAfterSeconds",
  helpers.mapResetOtpError({ message: "Please wait before requesting another OTP", status: 429, retryAfterSeconds: 12 }) ===
    "Please wait 12 seconds before requesting another code.",
);
check(
  "rate limit copy",
  helpers.mapResetOtpError({ message: "Too many OTP requests. Try again later.", status: 429 }) ===
    "Too many OTP requests. Try again later.",
);
check(
  "network fallback copy",
  helpers.mapResetOtpError({ message: "" }) === "Something went wrong. Try again.",
);
check(
  "weak password copy",
  helpers.mapResetPasswordError({ message: "Validation failed", fields: { newPassword: "too short" } }) ===
    helpers.PASSWORD_REQUIREMENT,
);

const mismatch = helpers.validateResetPasswords("newpass12", "otherpass");
check("password mismatch is client-side", mismatch.confirm === helpers.PASSWORDS_MISMATCH);
const weak = helpers.validateResetPasswords("short", "short");
check("weak password is client-side", weak.password === helpers.PASSWORD_REQUIREMENT);

const auth = read("src/lib/auth.ts");
check("auth helper posts forgot-password", auth.includes('"/api/auth/forgot-password"'));
check("auth helper posts reset-password", auth.includes('"/api/auth/reset-password"'));
check("resendResetOtp uses purpose reset", /purpose:\s*"reset"/.test(auth) || auth.includes('purpose: "reset"'));
check("forgot helper does not send role", /forgotPassword[\s\S]*role:\s*"customer"/.test(auth) === false);

const form = read("src/components/auth/AuthForm.tsx");
check("login always has Forgot Password control", form.includes("Forgot Password?"));
check("forgot control is not gated on a failed password", !form.includes("Invalid credentials") || !/Invalid credentials[\s\S]*Forgot Password\?/.test(form));
check("AuthForm opens reset flow", form.includes("setResetOpen(true)"));
check("customer and provider share AuthForm", form.includes('value: "provider"') && form.includes('value: "customer"'));

const flow = read("src/components/auth/ForgotPasswordFlow.tsx");
check("reset UI has email, OTP, new password, confirm, success", ["Send OTP", "Resend OTP", "Reset Password", "Back to Sign In", "Confirm password"].every((bit) => flow.includes(bit)));
check("reset flow does not persist OTP in web storage", !/localStorage|sessionStorage/.test(flow));
check("reset flow does not auto-login", !/signIn\(|storeAuth\(|setTokens\(/.test(flow));
check("resend calls purpose reset helper", flow.includes("resendResetOtp"));

assert.equal(passed > 0, true);
console.log(`\n${passed} customer/provider password-reset checks passed`);
