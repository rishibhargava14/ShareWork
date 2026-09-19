"use client";

import { Shield, Users, DollarSign, ArrowRight } from "@/components/icons/HtmlIcons";
import PreviewCard from "@/components/landing/PreviewCard";
import { useSpaNav } from "@/components/app/SpaNav";

export default function Hero() {
  const spa = useSpaNav();
  return (
    <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 py-20 md:grid-cols-[1.1fr_0.9fr] md:px-10 md:py-28">
      <div>
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-[12px] font-medium text-zinc-600">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Fixed price. No hourly surprises.
        </p>
        <h1 className="text-[42px] font-bold leading-[0.95] tracking-tight text-zinc-900 md:text-[56px]">
          Find Top Tech Talent
          <br />
          for Fixed Price
        </h1>
        <p className="mt-5 max-w-[480px] text-[16px] leading-relaxed text-zinc-600">
          Chat directly, agree on scope, fund escrow. Payment releases only after you approve delivery. No bidding wars.
        </p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => spa.goAuth("signup")}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-6 py-3 text-[14px] font-medium text-white"
          >
            Get Started <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => spa.goAuth("login")}
            className="rounded-md border border-zinc-200 px-6 py-3 text-[14px] font-medium text-zinc-700"
          >
            Sign In
          </button>
        </div>
        <div className="mt-10 flex items-center gap-6 text-[13px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Users size={14} /> 12k+ experts
          </span>
          <span className="inline-flex items-center gap-1">
            <Shield size={14} /> Escrow protected
          </span>
          <span className="inline-flex items-center gap-1">
            <DollarSign size={14} /> Fixed cost only
          </span>
        </div>
      </div>
      <PreviewCard />
    </section>
  );
}
