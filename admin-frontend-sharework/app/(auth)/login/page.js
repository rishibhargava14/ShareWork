"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldCheck, ChevronRight, KeyRound } from "lucide-react";
import ForgotPasswordFlow from "@/components/auth/ForgotPasswordFlow";
import { loginAdmin, resendAdminOtp, verifyAdminOtp } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const handleContinue = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const result = await loginAdmin({ email, password });
      if (result.requiresOtp) {
        setOtpStep(true);
        setInfo("Enter the 6-digit code sent to your email.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message ?? "Invalid credentials");
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await verifyAdminOtp({ email, otp });
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message ?? "Invalid OTP");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    try {
      await resendAdminOtp(email);
      setInfo("A new code was sent if the account exists.");
    } catch (err) {
      setError(err?.message ?? "Could not resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4 font-[Inter] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/30 via-transparent to-transparent" />
      <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-[100px]" />

      <div className="w-full max-w-[420px] relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] tracking-widest uppercase text-zinc-400 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            admin.sharework.com
          </div>
          <h1 className="text-[32px] font-semibold tracking-tight text-white">ShareWork</h1>
          <p className="text-[13px] text-zinc-500 mt-1 tracking-wide uppercase">Admin Console</p>
        </div>

        <div className="bg-[#141416] border border-zinc-800 rounded-[20px] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_80px_rgba(0,0,0,0.5)]">
          {resetOpen ? (
            <ForgotPasswordFlow
              initialEmail={email}
              onBackToSignIn={(resetEmail) => {
                setResetOpen(false);
                setEmail(resetEmail);
                setPassword("");
                setOtp("");
                setOtpStep(false);
                setError("");
                setLoading(false);
              }}
            />
          ) : otpStep ? (
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <h2 className="text-[18px] font-medium text-white">Enter OTP</h2>
                <p className="text-[13px] text-zinc-500 mt-1">A login code was sent to {email}.</p>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2 block">Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full h-11 pl-10 pr-4 bg-[#0A0A0B] border border-zinc-800 rounded-xl text-[14px] text-white tracking-[0.4em] focus:outline-none focus:border-zinc-700"
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
              {info ? <p className="text-[12px] text-emerald-400">{info}</p> : null}
              {error ? <p className="text-[12px] text-red-400">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-white text-black rounded-xl text-[14px] font-medium hover:bg-zinc-200 transition disabled:opacity-60"
              >
                {loading ? "Verifying…" : "Verify and continue"}
              </button>
              <div className="flex justify-between text-[12px]">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setOtpStep(false);
                    setOtp("");
                    setError("");
                    setInfo("");
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  Back
                </button>
                <button type="button" disabled={loading} onClick={handleResend} className="text-zinc-400 hover:text-white">
                  Resend code
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleContinue} className="space-y-5">
              <div>
                <h2 className="text-[18px] font-medium text-white">Welcome back</h2>
                <p className="text-[13px] text-zinc-500 mt-1">Enter your credentials to access the panel.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 bg-[#0A0A0B] border border-zinc-800 rounded-xl text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 bg-[#0A0A0B] border border-zinc-800 rounded-xl text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setResetOpen(true);
                      }}
                      className="text-[12px] text-zinc-400 hover:text-white transition"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>
              </div>

              {error && <p className="text-[12px] text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-white text-black rounded-xl text-[14px] font-medium hover:bg-zinc-200 transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Continue"} {!loading && <ChevronRight className="w-4 h-4" />}
              </button>

              <div className="pt-4 border-t border-zinc-800/80 mt-6">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Password plus email OTP. JWT is issued only after OTP verification.
                </div>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-6">© 2025 ShareWork Inc • Admin v2.4.1</p>
      </div>
    </div>
  );
}
