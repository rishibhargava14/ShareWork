"use client";

import { useSpaNav } from "@/components/app/SpaNav";
import PreviewCard from "@/components/landing/PreviewCard";
import { Search } from "lucide-react";

export default function Hero() {
  const spa = useSpaNav();

  const popular = [
    "Website Design",
    "Figma",
    "React",
    "UI/UX",
    "Logo Design",
    "Video Editing",
    "Architecture",
    "Branding",
  ];

  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 pb-10 pt-8 md:px-8 md:pb-12 md:pt-[56px] lg:grid-cols-2">
        <div>
          <h1 className="text-[38px] font-extrabold leading-[0.96] tracking-[-0.04em] text-[#222325] md:text-[56px]">
            Find the perfect
            <br />
            <span className="font-extrabold italic text-[#1DBF73]">
              expert professional
            </span>
            <br />
            services for your
            <br />
            <span className="font-semibold text-[#62646A]">Business</span>
          </h1>

          <p className="mt-5 max-w-[520px] text-[18px] leading-7 text-[#62646A]">
            Fixed-price only. Chat → Agreement → Escrow → Delivery → Payment.
            No hourly surprises. Trusted by 2,340+ businesses.
          </p>

          <div className="mt-8 flex h-[60px] max-w-[580px] overflow-hidden rounded-[4px] border border-[#C5C6C9] bg-white shadow-[0_6px_20px_rgba(0,0,0,0.08)] focus-within:border-[#222325]">
            <div className="flex min-w-0 flex-1 items-center gap-3 px-5">
              <span className="text-[22px] text-[#95979D]"><Search size={18}/></span>
              <input
                aria-label="Search for any service"
                placeholder="Search for any service..."
                className="w-full outline-none text-[16px] placeholder:text-[#95979D]"
              />
            </div>
            <button
              type="button"
              className="bg-[#222325] px-8 text-[16px] font-bold text-white transition hover:bg-[#404145]"
            >
              Search
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <span className="text-[14px] font-bold text-[#404145]">Popular:</span>
            {popular.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-full border border-[#E4E5E7] bg-white px-3 py-1.5 text-[14px] font-semibold transition hover:border-[#222325] hover:bg-[#222325] hover:text-white"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => spa.goAuth("signup")}
              className="rounded-[4px] bg-[#222325] px-6 py-3 text-[14px] font-bold text-white transition hover:bg-[#404145]"
            >
              Join ShareWork
            </button>
            <button
              type="button"
              onClick={() => spa.goAuth("login")}
              className="rounded-[4px] border border-[#222325] bg-white px-6 py-3 text-[14px] font-bold text-[#222325] transition hover:bg-[#222325] hover:text-white"
            >
              Sign In
            </button>
          </div>
        </div>

        <PreviewCard />
      </div>

      <div className="border-y border-[#E4E5E7] bg-[#FAFAFA]">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center gap-8 overflow-x-auto px-4 md:px-8">
          <span className="whitespace-nowrap text-[16px] font-semibold text-[#B5B6BA]">
            Trusted by:
          </span>
          {["Meta", "Google", "NETFLIX", "P&G", "PayPal", "Payoneer"].map(
            (name) => (
              <span
                key={name}
                className="whitespace-nowrap text-[17px] font-extrabold uppercase tracking-tight text-[#B5B6BA]"
              >
                {name}
              </span>
            ),
          )}
          <span className="ml-auto hidden whitespace-nowrap text-[14px] font-medium text-[#95979D] lg:block">
            Fixed-price escrow • No hourly surprises • 10% + GST 18%
          </span>
        </div>
      </div>
    </section>
  );
}
