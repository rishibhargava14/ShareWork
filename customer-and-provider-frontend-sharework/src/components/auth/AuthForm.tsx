"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Briefcase, Check, CodeXml } from "@/components/icons/HtmlIcons";
import { ApiError } from "@/lib/api";
import { resendEmailOtp, signIn, signUp, verifyEmailOtp, type Role } from "@/lib/auth";
import { useSpaNav } from "@/components/app/SpaNav";
import ForgotPasswordFlow from "@/components/auth/ForgotPasswordFlow";

type Mode = "login" | "signup";

interface FormValues {
  name: string;
  email: string;
  phone: string;
  otp: string;
  password: string;
}

const EMPTY: FormValues = { name: "", email: "", phone: "", otp: "", password: "" };

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
  const [role, setRole] = useState<Role | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues | "role", string>>>({});
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpPending, setOtpPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);

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
    const nextErr: Partial<Record<keyof FormValues | "role", string>> = {};
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
    if (!role || (role !== "customer" && role !== "provider")) nextErr.role = "Choose a role above.";
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
  const submitLabel = otpPending
    ? "Verify OTP"
    : `${mode === "signup" ? "Create Account" : "Sign In"}${role ? ` as ${role}` : ""}`;

  if (resetOpen) {
    return (
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
    );
  }

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label="Authentication mode" className="grid grid-cols-2 rounded-[8px] bg-zinc-100 p-1">
        {(["login", "signup"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={mode === tab}
            onClick={() => {
              setMode(tab);
              setErrors({});
              setMessage(null);
              setOtpPending(false);
              setCooldown(0);
            }}
            className={`rounded-[6px] px-4 py-2 text-[13px] font-medium ${
              mode === tab ? "bg-white text-zinc-900" : "text-zinc-500"
            }`}
          >
            {tab === "login" ? "Login" : "Signup"}
          </button>
        ))}
      </div>

      <p className="mb-3 mt-5 text-[12px] font-semibold text-zinc-700">SELECT YOUR ENTRY — Required</p>

      <div role="radiogroup" aria-label="Choose a role" className="grid grid-cols-2 gap-3">
        {(
          [
            {
              value: "customer" as const,
              label: "CUSTOMER",
              title: "I want to Hire",
              description: "Post projects, chat with experts, pay after agreement",
              color: "#2563EB",
              Icon: Briefcase,
            },
            {
              value: "provider" as const,
              label: "PROVIDER",
              title: "I want to Work",
              description: "Offer services, set fixed prices, get paid securely",
              color: "#16A34A",
              Icon: CodeXml,
            },
          ]
        ).map((card) => {
          const selected = role === card.value;
          return (
            <button
              key={card.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setRole(card.value);
                setErrors((e) => ({ ...e, role: undefined }));
              }}
              className={`rounded-[12px] border-2 p-4 text-left ${
                selected
                  ? card.value === "customer"
                    ? "border-[#2563EB] bg-[#EFF6FF]"
                    : "border-[#16A34A] bg-[#F0FDF4]"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-[8px] text-white" style={{ background: card.color }}>
                  <card.Icon size={18} />
                </span>
                {selected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: card.color }}>
                    <Check size={12} />
                  </span>
                )}
              </div>
              <p className="mt-3 text-[14px] font-semibold text-zinc-900">{card.title}</p>
              <p className="mt-0.5 text-[11px] font-bold tracking-widest" style={{ color: card.color }}>
                {card.label}
              </p>
              <p className="mt-2 text-[12px] leading-snug text-zinc-600">{card.description}</p>
            </button>
          );
        })}
      </div>

      {errors.role ? (
        <p className="mt-2 text-[11px] text-red-600">{errors.role}</p>
      ) : !role ? (
        <p className="mt-2 text-[11px] text-amber-600">Please select a role to continue — this is the only place role selection exists.</p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3">
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-zinc-700">Full Name</span>
            <input
              name="name"
              value={values.name}
              placeholder="Aarav Mehta"
              readOnly={otpPending}
              onChange={(e) => setField("name")(e.target.value)}
              className="h-10 w-full rounded-[8px] border border-zinc-300 px-3 text-[14px] outline-none focus:border-zinc-900"
            />
            {errors.name && <p className="mt-1 text-[11px] text-red-600">{errors.name}</p>}
          </label>
        )}

        {mode === "signup" && otpPending ? (
          <div className="space-y-4 rounded-[12px] border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <h2 className="text-[20px] font-bold text-zinc-900">Verify Your Email</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">We sent a 6-digit OTP to:</p>
            </div>

            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-zinc-700">Email</span>
              <input
                name="email"
                type="email"
                value={values.email}
                readOnly
                aria-readonly="true"
                className="h-10 w-full rounded-[8px] border border-zinc-300 bg-white px-3 text-[14px] outline-none"
              />
            </label>

            <p className="text-[12px] leading-relaxed text-zinc-600">Enter the OTP sent to your email to verify this account.</p>

            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-zinc-700">OTP</span>
              <input
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={values.otp}
                placeholder="6-digit OTP"
                onChange={(e) => setField("otp")(e.target.value)}
                className="h-10 w-full rounded-[8px] border border-zinc-300 bg-white px-3 text-[14px] outline-none focus:border-zinc-900"
                aria-describedby={errors.otp ? "signup-otp-error" : undefined}
              />
              {errors.otp && <p id="signup-otp-error" className="mt-1 text-[11px] text-red-600">{errors.otp}</p>}
            </label>
          </div>
        ) : (
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-zinc-700">Email</span>
            <input
              name="email"
              type="email"
              value={values.email}
              placeholder="you@company.com"
              readOnly={mode === "login" && otpPending}
              onChange={(e) => setField("email")(e.target.value)}
              className="h-10 w-full rounded-[8px] border border-zinc-300 px-3 text-[14px] outline-none focus:border-zinc-900"
            />
            {errors.email && <p className="mt-1 text-[11px] text-red-600">{errors.email}</p>}
          </label>
        )}

        {mode === "signup" && !otpPending && (
          <div>
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-zinc-700">Phone Number</span>
              <input
                name="phone"
                type="tel"
                value={values.phone}
                placeholder="+91 98xxxxxx10"
                onChange={(e) => setField("phone")(e.target.value)}
                className="h-10 w-full rounded-[8px] border border-zinc-300 px-3 text-[14px] outline-none focus:border-zinc-900"
              />
              {errors.phone && <p className="mt-1 text-[11px] text-red-600">{errors.phone}</p>}
            </label>
          </div>
        )}

        {mode === "login" && otpPending && (
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-zinc-700">OTP</span>
            <input
              name="otp"
              value={values.otp}
              placeholder="6-digit OTP"
              onChange={(e) => setField("otp")(e.target.value)}
              className="h-10 w-full rounded-[8px] border border-zinc-300 px-3 text-[14px] outline-none focus:border-zinc-900"
            />
            {errors.otp && <p className="mt-1 text-[11px] text-red-600">{errors.otp}</p>}
          </label>
        )}

        {!otpPending && (
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-zinc-700">Password</span>
            <input
              name="password"
              type="password"
              value={values.password}
              placeholder="••••••••"
              onChange={(e) => setField("password")(e.target.value)}
              className="h-10 w-full rounded-[8px] border border-zinc-300 px-3 text-[14px] outline-none focus:border-zinc-900"
            />
            {errors.password && <p className="mt-1 text-[11px] text-red-600">{errors.password}</p>}
          </label>
        )}

        {mode === "login" && !otpPending && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setErrors({});
                setResetOpen(true);
              }}
              className="text-[12px] font-medium text-zinc-600 hover:text-zinc-900"
            >
              Forgot Password?
            </button>
          </div>
        )}

        {message && (
          <p className={`text-[12px] ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>{message.text}</p>
        )}

        <button
          type="submit"
          disabled={loading || !role || (mode === "signup" && otpPending && !/^\d{6}$/.test(values.otp.trim()))}
          className={`h-10 w-full rounded-[8px] text-[13px] font-medium text-white ${
            !role ? "cursor-not-allowed bg-zinc-200 text-zinc-500" : customer ? "bg-[#2563EB]" : "bg-[#16A34A]"
          }`}
        >
          {loading ? (otpPending ? "Verifying…" : mode === "login" ? "Signing in…" : "Creating account…") : submitLabel}
        </button>

        {otpPending && (
          <button
            type="button"
            disabled={resending || cooldown > 0}
            onClick={handleResend}
            className="h-9 w-full text-[12px] font-medium text-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {resending
              ? "Sending a new OTP…"
              : cooldown > 0
                ? `Resend OTP in ${cooldown}s`
                : "Resend OTP"}
          </button>
        )}
      </form>
    </div>
  );
}
