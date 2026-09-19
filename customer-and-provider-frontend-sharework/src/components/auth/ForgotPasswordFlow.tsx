"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { forgotPassword, resendResetOtp, resetPassword } from "@/lib/auth";
import {
  mapResetOtpError,
  mapResetPasswordError,
  RESET_OTP_SENT,
  RESET_SUCCESS,
  validateResetPasswords,
} from "@/lib/passwordReset";

type ResetStep = "forgot-email" | "reset-otp" | "new-password" | "success";

const inputClass =
  "h-10 w-full rounded-[8px] border border-zinc-300 px-3 text-[14px] outline-none focus:border-zinc-900";

export default function ForgotPasswordFlow({
  initialEmail = "",
  onBackToSignIn,
}: {
  initialEmail?: string;
  onBackToSignIn: (email: string) => void;
}) {
  const [step, setStep] = useState<ResetStep>("forgot-email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; otp?: string; password?: string; confirm?: string }>(
    {},
  );
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = (seconds?: number) => {
    setCooldown(Math.max(0, Math.ceil(seconds ?? 45)));
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const goToSignIn = () => {
    onBackToSignIn(email.trim());
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldErrors({ email: "Email is required." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldErrors({ email: "Enter a valid email address." });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      setEmail(trimmed);
      setOtp("");
      startCooldown(45);
      setMessage({ type: "success", text: RESET_OTP_SENT });
      setStep("reset-otp");
    } catch (err) {
      setMessage({ type: "error", text: mapResetOtpError(err as ApiError) });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueOtp = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!/^\d{6}$/.test(otp.trim())) {
      setFieldErrors({ otp: "Enter the 6-digit OTP." });
      return;
    }
    setFieldErrors({});
    setNewPassword("");
    setConfirmPassword("");
    setStep("new-password");
  };

  const handleResend = async () => {
    if (!email.trim() || cooldown > 0 || resending) return;
    setResending(true);
    setMessage(null);
    try {
      const result = await resendResetOtp(email.trim());
      startCooldown(result.retryAfterSeconds);
      setOtp("");
      setMessage({ type: "success", text: RESET_OTP_SENT });
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.status === 429) {
        startCooldown(apiError.retryAfterSeconds ?? 45);
      }
      setMessage({ type: "error", text: mapResetOtpError(apiError) });
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const errors = validateResetPasswords(newPassword, confirmPassword);
    if (errors.password || errors.confirm) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await resetPassword(email.trim(), otp.trim(), newPassword);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setCooldown(0);
      setStep("success");
    } catch (err) {
      const apiError = err as ApiError;
      const text = mapResetPasswordError(apiError);
      setMessage({ type: "error", text });
      if (/expired|invalid verification code|too many incorrect attempts/i.test(text)) {
        setStep("reset-otp");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-[18px] font-semibold text-zinc-900">
        {step === "success" ? "Password updated successfully." : "Forgot Password"}
      </h2>
      {step !== "success" && (
        <p className="mt-1 text-[13px] text-zinc-600">
          {step === "forgot-email" && "Enter the email for your account. We will send a verification code if it exists."}
          {step === "reset-otp" && `Enter the 6-digit code sent to ${email}.`}
          {step === "new-password" && "Choose a new password, then confirm it."}
        </p>
      )}

      {step === "forgot-email" && (
        <form onSubmit={handleSendOtp} noValidate className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-zinc-700">Email</span>
            <input
              name="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              placeholder="you@company.com"
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
              className={inputClass}
            />
            {fieldErrors.email && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.email}</p>}
          </label>
          {message && (
            <p className={`text-[12px] ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>{message.text}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-[8px] bg-zinc-900 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
          >
            {loading ? "Sending code…" : "Send OTP"}
          </button>
          <button type="button" onClick={goToSignIn} className="h-9 w-full text-[12px] font-medium text-zinc-600">
            Back to Sign In
          </button>
        </form>
      )}

      {step === "reset-otp" && (
        <form onSubmit={handleContinueOtp} noValidate className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-zinc-700">Verification code</span>
            <input
              name="reset-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              placeholder="6-digit OTP"
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setFieldErrors((current) => ({ ...current, otp: undefined }));
              }}
              className={inputClass}
            />
            {fieldErrors.otp && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.otp}</p>}
          </label>
          {message && (
            <p className={`text-[12px] ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>{message.text}</p>
          )}
          <button
            type="submit"
            className="h-10 w-full rounded-[8px] bg-zinc-900 text-[13px] font-medium text-white"
          >
            Continue
          </button>
          <button
            type="button"
            disabled={resending || cooldown > 0}
            onClick={handleResend}
            className="h-9 w-full text-[12px] font-medium text-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {resending ? "Sending a new OTP…" : cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setFieldErrors({});
              setStep("forgot-email");
            }}
            className="h-9 w-full text-[12px] font-medium text-zinc-600"
          >
            Back
          </button>
        </form>
      )}

      {step === "new-password" && (
        <form onSubmit={handleResetPassword} noValidate className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-zinc-700">New password</span>
            <input
              name="reset-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              placeholder="At least 8 characters"
              onChange={(e) => {
                setNewPassword(e.target.value);
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }}
              className={inputClass}
            />
            {fieldErrors.password && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>}
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-zinc-700">Confirm password</span>
            <input
              name="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              placeholder="Repeat new password"
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((current) => ({ ...current, confirm: undefined }));
              }}
              className={inputClass}
            />
            {fieldErrors.confirm && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.confirm}</p>}
          </label>
          {message && (
            <p className={`text-[12px] ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>{message.text}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-[8px] bg-zinc-900 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
          >
            {loading ? "Updating password…" : "Reset Password"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setFieldErrors({});
              setNewPassword("");
              setConfirmPassword("");
              setStep("reset-otp");
            }}
            className="h-9 w-full text-[12px] font-medium text-zinc-600"
          >
            Back
          </button>
        </form>
      )}

      {step === "success" && (
        <div className="mt-5 space-y-3">
          <p className="text-[12px] text-green-700">{RESET_SUCCESS}</p>
          <button
            type="button"
            onClick={goToSignIn}
            className="h-10 w-full rounded-[8px] bg-zinc-900 text-[13px] font-medium text-white"
          >
            Back to Sign In
          </button>
        </div>
      )}
    </div>
  );
}
