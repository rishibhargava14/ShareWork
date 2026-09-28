"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Briefcase, Check, CodeXml, Lock } from "@/components/icons/HtmlIcons";
import { ApiError } from "@/lib/api";
import { resendEmailOtp, signIn, signUp, verifyEmailOtp, type Role } from "@/lib/auth";
import { useSpaNav } from "@/components/app/SpaNav";
import ForgotPasswordFlow from "@/components/auth/ForgotPasswordFlow";

type Mode = "login" | "signup";

interface FormValues {
  name: string;
  confirm: string;
  email: string;
  phone: string;
  otp: string;
  password: string;
}

const EMPTY: FormValues = { name: "", confirm: "", email: "", phone: "", otp: "", password: "" };

const otpErrorText = (err: { message?: string }) => {
  const message = err.message ?? "Something went wrong. Try again.";
  if (/expired/i.test(message)) return "That code has expired. Tap Resend OTP to get a new one.";
  if (/too many attempts/i.test(message)) return "Too many incorrect tries. Tap Resend OTP to get a new code.";
  if (/too many otp requests/i.test(message)) return "Too many OTP requests. Try again later.";
  return message;
};

export default function AuthForm({ initialMode = "login" }: { initialMode?: Mode; next?: string }) {
  const spa = useSpaNav();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Role>("customer");
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues | "role" | "terms", string>>>({});
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpPending, setOtpPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const setField = (key: keyof FormValues) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  // verify/login already persist tokens+user via storeAuth; role is enough for destination
  // Do not await refreshSession()/GET /users/me here — Discover/Dashboard hydrate themselves
  const enterApp = (userRole: Role) => {
    spa.goApp(userRole === "provider" ? "dashboard" : "discover");
  };

  const validate = () => {
    const nextErr: Partial<Record<keyof FormValues | "role" | "terms", string>> = {};
    if (otpPending) {
      if (!/^\d{6}$/.test(values.otp.trim())) nextErr.otp = "Enter the 6-digit OTP.";
      setErrors(nextErr);
      return Object.keys(nextErr).length === 0;
    }
    if (mode === "signup" && !values.name.trim()) nextErr.name = "Full name is required.";
    if (!values.email.trim()) nextErr.email = "Email is required.";
    if (mode === "signup" && !values.phone.trim()) nextErr.phone = "Phone is required.";
    if (!values.password) nextErr.password = "Password is required.";
    if (mode === "signup" && values.password.length < 8) nextErr.password = "Password must be at least 8 characters.";
    if (mode === "signup" && values.confirm !== values.password) nextErr.confirm = "Passwords do not match.";
    if (mode === "signup" && !agreed) nextErr.terms = "Please accept the Terms and Privacy.";
    if (role !== "customer" && role !== "provider") nextErr.role = "Choose a role above.";
    setErrors(nextErr);
    return Object.keys(nextErr).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;
    const chosen = (role === "provider" ? role : "customer") as "customer" | "provider";
    setLoading(true);
    try {
      if (otpPending) {
        const user = await verifyEmailOtp({ email: values.email, otp: values.otp.trim() });
        enterApp(user.role);
        return;
      }

      if (mode === "login") {
        const result = await signIn({ email: values.email, password: values.password, role: chosen });
        if (result.requiresVerification || !result.user.isVerified) {
          setOtpPending(true);
          startCooldown(result.retryAfterSeconds);
          setMessage({ type: "success", text: "Enter the OTP sent to your email to verify this account." });
          setLoading(false);
          return;
        }
        enterApp(result.user.role);
        return;
      }

      const result = await signUp({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        role: chosen,
      });

      if (values.otp.trim()) {
        const user = await verifyEmailOtp({ email: values.email, otp: values.otp.trim() });
        enterApp(user.role);
        return;
      }

      setOtpPending(true);
      startCooldown(result.retryAfterSeconds);
      setMessage({ type: "success", text: "Account created. Enter the OTP sent to your email." });
      setLoading(false);
    } catch (err) {
      const apiError = err as ApiError;
      setErrors((prev) => ({ ...prev, ...(apiError.fields ?? {}) }));
      setMessage({
        type: "error",
        text: otpPending ? otpErrorText(apiError) : (apiError.message ?? "Something went wrong. Try again."),
      });
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!values.email.trim() || cooldown > 0 || resending) return;
    setResending(true);
    setMessage(null);
    try {
      const result = await resendEmailOtp({ email: values.email.trim(), purpose: "verify" });
      startCooldown(result.retryAfterSeconds);
      setValues((current) => ({ ...current, otp: "" }));
      setMessage({ type: "success", text: "A new OTP was sent to your email." });
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.status === 429) {
        startCooldown(apiError.retryAfterSeconds ?? 45);
      }
      setMessage({ type: "error", text: otpErrorText(apiError) });
    } finally {
      setResending(false);
    }
  };

  const customer = role === "customer";
  const accent = customer ? "#2563EB" : "#16A34A";
  const isSignup = mode === "signup";
  const submitLabel = otpPending
    ? "Verify OTP"
    : isSignup
      ? `Join as ${customer ? "Customer" : "Provider"}`
      : "Continue";

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setMessage(null);
    setOtpPending(false);
    setCooldown(0);
  };

  if (resetOpen) {
    return (
      <div className="p-6">
        <ForgotPasswordFlow
          initialEmail={values.email}
          onBackToSignIn={(email) => {
            setResetOpen(false);
            setValues({ ...EMPTY, email });
            setErrors({});
            setMessage(null);
            setLoading(false);
            setOtpPending(false);
            setResending(false);
            setCooldown(0);
          }}
        />
      </div>
    );
  }

  const labelClass = isSignup
    ? "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-600"
    : "mb-1.5 block text-[13px] font-semibold text-zinc-900";
  const wrapClass =
    "flex h-11 items-center gap-2 rounded-[8px] border border-zinc-300 bg-white px-3 focus-within:border-zinc-900";
  const inputClass = "h-full w-full bg-transparent text-[14px] outline-none placeholder:text-zinc-400";
  const plainInput =
    "h-11 w-full rounded-[8px] border border-zinc-300 bg-white px-3 text-[14px] outline-none placeholder:text-zinc-400 focus:border-zinc-900";

  const submitDisabled =
    loading ||
    (isSignup && !otpPending && !agreed) ||
    (otpPending && !/^\d{6}$/.test(values.otp.trim()));

  return (
    <div className="flex flex-col">
      <div className="px-6 pb-5 pt-6">
        <h2 className="pr-10 text-[22px] font-extrabold leading-tight text-zinc-900">
          {isSignup ? "Join ShareWork" : "Sign in to ShareWork"}
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          {isSignup ? "Choose how you want to use ShareWork" : "Welcome back"}
        </p>

        <div role="radiogroup" aria-label="Choose a role" className="mt-5 grid grid-cols-2 rounded-[8px] border border-zinc-200 bg-zinc-100 p-1">
          {(
            [
              { value: "customer" as const, title: "Customer", color: "#2563EB", Icon: Briefcase },
              { value: "provider" as const, title: "Provider", color: "#16A34A", Icon: CodeXml },
            ]
          ).map((card) => {
            const selected = role === card.value;
            return (
              <button
                key={card.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={otpPending}
                onClick={() => {
                  setRole(card.value);
                  setErrors((e) => ({ ...e, role: undefined }));
                }}
                className={`flex items-center justify-center gap-2 rounded-[6px] py-2.5 text-[13px] font-semibold ${
                  selected ? "bg-white shadow-sm" : "text-zinc-500"
                }`}
                style={selected ? { color: card.color } : undefined}
              >
                <card.Icon size={16} />
                {card.title}
              </button>
            );
          })}
        </div>

        {isSignup && (
          <div
            className="mt-3 flex items-start gap-2 rounded-[8px] border p-3 text-[11px] leading-relaxed"
            style={{
              borderColor: customer ? "#BFDBFE" : "#BBF7D0",
              background: customer ? "#EFF6FF" : "#F0FDF4",
              color: customer ? "#1E40AF" : "#166534",
            }}
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent }}>
              <Check size={10} />
            </span>
            <p>
              <b>{customer ? "Customer • Blue" : "Provider • Green"}</b> —{" "}
              {customer
                ? "Post projects, chat with verified experts, pay only after approval. Escrow protected."
                : "Get hired, chat with clients, deliver work and get paid securely through escrow."}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          {isSignup && !otpPending && (
            <>
              <label className="block">
                <span className={labelClass}>Full Name</span>
                <input
                  name="name"
                  value={values.name}
                  placeholder="Aarav Mehta"
                  onChange={(e) => setField("name")(e.target.value)}
                  className={plainInput}
                />
                {errors.name && <p className="mt-1 text-[11px] text-red-600">{errors.name}</p>}
              </label>
            </>
          )}

          {isSignup && otpPending ? (
            <div className="space-y-4 rounded-[12px] border border-zinc-200 bg-zinc-50 p-4">
              <div>
                <h3 className="text-[18px] font-bold text-zinc-900">Verify Your Email</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">We sent a 6-digit OTP to:</p>
              </div>
              <label className="block">
                <span className={labelClass}>Email</span>
                <input name="email" type="email" value={values.email} readOnly aria-readonly="true" className={plainInput} />
              </label>
              <p className="text-[12px] leading-relaxed text-zinc-600">Enter the OTP sent to your email to verify this account.</p>
              <label className="block">
                <span className={labelClass}>OTP</span>
                <input
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={values.otp}
                  placeholder="6-digit OTP"
                  onChange={(e) => setField("otp")(e.target.value)}
                  className={plainInput}
                  aria-describedby={errors.otp ? "signup-otp-error" : undefined}
                />
                {errors.otp && <p id="signup-otp-error" className="mt-1 text-[11px] text-red-600">{errors.otp}</p>}
              </label>
            </div>
          ) : (
            <label className="block">
              <span className={labelClass}>Email</span>
              <div className={wrapClass}>
                <MailIcon />
                <input
                  name="email"
                  type="email"
                  value={values.email}
                  placeholder="you@company.com"
                  readOnly={mode === "login" && otpPending}
                  onChange={(e) => setField("email")(e.target.value)}
                  className={inputClass}
                />
              </div>
              {errors.email && <p className="mt-1 text-[11px] text-red-600">{errors.email}</p>}
            </label>
          )}

          {isSignup && !otpPending && (
            <label className="block">
              <span className={labelClass}>Phone Number</span>
              <input
                name="phone"
                inputMode="numeric"
                value={values.phone}
                placeholder="+91 98xxxxxx10"
                onChange={(e) => setField("phone")(e.target.value.replace(/\D/g, ""))}
                className={plainInput}
              />
              {errors.phone && <p className="mt-1 text-[11px] text-red-600">{errors.phone}</p>}
            </label>
          )}

          {mode === "login" && otpPending && (
            <label className="block">
              <span className={labelClass}>OTP</span>
              <input
                name="otp"
                value={values.otp}
                placeholder="6-digit OTP"
                onChange={(e) => setField("otp")(e.target.value)}
                className={plainInput}
              />
              {errors.otp && <p className="mt-1 text-[11px] text-red-600">{errors.otp}</p>}
            </label>
          )}

          {!otpPending && (
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between">
                <span className={labelClass.replace("mb-1.5 block", "")}>Password</span>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(null);
                      setErrors({});
                      setResetOpen(true);
                    }}
                    className="text-[11px] font-medium text-zinc-600 underline hover:text-zinc-900"
                  >
                    Forgot password?
                  </button>
                )}
              </span>
              <div className={wrapClass}>
                <Lock size={16} className="shrink-0 text-zinc-400" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={values.password}
                  placeholder={isSignup ? "Min 8 characters" : "••••••••"}
                  onChange={(e) => setField("password")(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 text-zinc-400 hover:text-zinc-700"
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[11px] text-red-600">{errors.password}</p>}
            </label>
          )}

          {isSignup && !otpPending && (
            <label className="block">
              <span className={labelClass}>Confirm</span>
              <div className={wrapClass}>
                <Lock size={16} className="shrink-0 text-zinc-400" />
                <input
                  name="confirm"
                  type={showPassword ? "text" : "password"}
                  value={values.confirm}
                  placeholder="Repeat password"
                  onChange={(e) => setField("confirm")(e.target.value)}
                  className={inputClass}
                />
              </div>
              {errors.confirm && <p className="mt-1 text-[11px] text-red-600">{errors.confirm}</p>}
            </label>
          )}

          {isSignup && !otpPending && (
            <div>
              <label className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    setErrors((er) => ({ ...er, terms: undefined }));
                  }}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                />
                <span>
                  I agree to <b className="text-zinc-800 underline">Terms</b> and <b className="text-zinc-800 underline">Privacy</b>. Fixed-price escrow, 10% + GST 18% fee, anti-leakage.
                </span>
              </label>
              {errors.terms && <p className="mt-1 text-[11px] text-red-600">{errors.terms}</p>}
            </div>
          )}

          {message && (
            <p className={`text-[12px] ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>{message.text}</p>
          )}

          <button
            type="submit"
            disabled={submitDisabled}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            style={submitDisabled ? undefined : { background: accent }}
          >
            {loading ? (otpPending ? "Verifying…" : mode === "login" ? "Signing in…" : "Creating account…") : submitLabel}
            {isSignup && !loading && !otpPending && <ArrowRight size={14} />}
          </button>

          {otpPending && (
            <button
              type="button"
              disabled={resending || cooldown > 0}
              onClick={handleResend}
              className="h-9 w-full text-[12px] font-medium text-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              {resending ? "Sending a new OTP…" : cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
            </button>
          )}
        </form>

        {!isSignup && !otpPending && (
          <p className="mt-4 text-center text-[13px] text-zinc-600">
            Not a member yet?{" "}
            <button type="button" onClick={() => switchMode("signup")} className="font-bold text-[#16A34A] hover:underline">
              Join now
            </button>
          </p>
        )}
        {isSignup && (
          <p className="mt-3 text-center text-[10px] leading-relaxed text-zinc-400">
            By joining you confirm role is fixed at signup. Use different email for other role.
          </p>
        )}
      </div>

      <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 text-[12px] text-zinc-600">
        {isSignup ? (
          <div className="flex items-center justify-between">
            <span>Already a member?</span>
            <button type="button" onClick={() => switchMode("login")} className="font-bold text-zinc-900 underline">
              Sign In
            </button>
          </div>
        ) : (
          <p className="leading-relaxed">Your role is fixed at signup and decides your dashboard. Use different email for other role. Escrow keeps funds safe.</p>
        )}
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-400" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m3 3 18 18" />}
    </svg>
  );
}
