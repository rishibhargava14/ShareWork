"use client";

import { useEffect, useState } from "react";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import { forgotPassword, resendResetOtp, resetPassword } from "@/lib/auth";
import {
  mapResetOtpError,
  mapResetPasswordError,
  RESET_OTP_SENT,
  RESET_SUCCESS,
  validateResetPasswords,
} from "@/lib/passwordReset";

const inputClass =
  "w-full h-11 pl-10 pr-4 bg-[#0A0A0B] border border-zinc-800 rounded-xl text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition";

export default function ForgotPasswordFlow({ initialEmail = "", onBackToSignIn }) {
  const [step, setStep] = useState("forgot-email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = (seconds) => {
    setCooldown(Math.max(0, Math.ceil(seconds ?? 45)));
  };

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const goToSignIn = () => {
    onBackToSignIn(email.trim());
  };

  const handleSendOtp = async (e) => {
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
      setMessage({ type: "error", text: mapResetOtpError(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueOtp = (e) => {
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
      if (err?.status === 429) {
        startCooldown(err.retryAfterSeconds ?? 45);
      }
      setMessage({ type: "error", text: mapResetOtpError(err) });
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (e) => {
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
      const text = mapResetPasswordError(err);
      setMessage({ type: "error", text });
      if (/expired|invalid verification code|too many incorrect attempts/i.test(text)) {
        setStep("reset-otp");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-medium text-white">
          {step === "success" ? "Password updated successfully." : "Forgot Password"}
        </h2>
        {step !== "success" && (
          <p className="text-[13px] text-zinc-500 mt-1">
            {step === "forgot-email" && "Enter your admin email. If an account exists, a verification code will be sent."}
            {step === "reset-otp" && `Enter the 6-digit code sent to ${email}.`}
            {step === "new-password" && "Choose a new password, then confirm it."}
          </p>
        )}
      </div>

      {step === "forgot-email" && (
        <form onSubmit={handleSendOtp} noValidate className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }}
                className={inputClass}
                placeholder="you@company.com"
              />
            </div>
            {fieldErrors.email && <p className="text-[12px] text-red-400 mt-2">{fieldErrors.email}</p>}
          </div>
          {message && (
            <p className={`text-[12px] ${message.type === "error" ? "text-red-400" : "text-emerald-400"}`}>{message.text}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-white text-black rounded-xl text-[14px] font-medium hover:bg-zinc-200 transition disabled:opacity-60"
          >
            {loading ? "Sending code…" : "Send OTP"}
          </button>
          <button type="button" onClick={goToSignIn} className="w-full text-[12px] text-zinc-400 hover:text-white transition">
            Back to Sign In
          </button>
        </form>
      )}

      {step === "reset-otp" && (
        <form onSubmit={handleContinueOtp} noValidate className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2 block">Verification code</label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setFieldErrors((current) => ({ ...current, otp: undefined }));
              }}
              className="w-full h-11 px-4 bg-[#0A0A0B] border border-zinc-800 rounded-xl text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
              placeholder="6-digit OTP"
            />
            {fieldErrors.otp && <p className="text-[12px] text-red-400 mt-2">{fieldErrors.otp}</p>}
          </div>
          {message && (
            <p className={`text-[12px] ${message.type === "error" ? "text-red-400" : "text-emerald-400"}`}>{message.text}</p>
          )}
          <button type="submit" className="w-full h-11 bg-white text-black rounded-xl text-[14px] font-medium hover:bg-zinc-200 transition">
            Continue
          </button>
          <button
            type="button"
            disabled={resending || cooldown > 0}
            onClick={handleResend}
            className="w-full text-[12px] text-zinc-400 hover:text-white transition disabled:opacity-40"
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
            className="w-full text-[12px] text-zinc-400 hover:text-white transition"
          >
            Back
          </button>
        </form>
      )}

      {step === "new-password" && (
        <form onSubmit={handleResetPassword} noValidate className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2 block">New password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }}
                className={inputClass}
                placeholder="At least 8 characters"
              />
            </div>
            {fieldErrors.password && <p className="text-[12px] text-red-400 mt-2">{fieldErrors.password}</p>}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2 block">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((current) => ({ ...current, confirm: undefined }));
                }}
                className={inputClass}
                placeholder="Repeat new password"
              />
            </div>
            {fieldErrors.confirm && <p className="text-[12px] text-red-400 mt-2">{fieldErrors.confirm}</p>}
          </div>
          {message && (
            <p className={`text-[12px] ${message.type === "error" ? "text-red-400" : "text-emerald-400"}`}>{message.text}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-white text-black rounded-xl text-[14px] font-medium hover:bg-zinc-200 transition disabled:opacity-60"
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
            className="w-full text-[12px] text-zinc-400 hover:text-white transition"
          >
            Back
          </button>
        </form>
      )}

      {step === "success" && (
        <div className="space-y-4">
          <p className="text-[12px] text-emerald-400">{RESET_SUCCESS}</p>
          <button
            type="button"
            onClick={goToSignIn}
            className="w-full h-11 bg-white text-black rounded-xl text-[14px] font-medium hover:bg-zinc-200 transition"
          >
            Back to Sign In
          </button>
        </div>
      )}

      <div className="pt-4 border-t border-zinc-800/80">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5" />
          Password reset via ShareWork backend
        </div>
      </div>
    </div>
  );
}
