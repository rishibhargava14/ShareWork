"use client";

import Logo from "@/components/Logo";
import { useSpaNav } from "@/components/app/SpaNav";
import { Search } from "lucide-react";

export default function Header() {
  const spa = useSpaNav();

  return (
    <header className="sticky top-0 z-50 border-b border-[#E4E5E7] bg-white">
      <div className="mx-auto flex h-[80px] max-w-[1400px] items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <button
            type="button"
            onClick={spa.goLanding}
            aria-label="ShareWork — home"
            className="shrink-0"
          >
            <Logo />
          </button>

          <button
            type="button"
            className="hidden text-[15px] font-semibold text-[#62646A] transition hover:text-[#1DBF73] xl:inline-flex"
          >
            Explore
          </button>
        </div>

        <nav className="flex items-center gap-2 md:gap-5">
          <button
            type="button"
            onClick={() => spa.goAuth("signup")}
            className="hidden text-[15px] font-semibold text-[#62646A] transition hover:text-[#222325] lg:inline-flex"
          >
            Become a Provider
          </button>

          <button
            type="button"
            onClick={() => spa.goAuth("login")}
            className="hidden rounded-[4px] px-3 py-2 text-[14px] font-semibold text-[#62646A] transition hover:text-[#222325] md:inline-flex"
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => spa.goAuth("signup")}
            className="inline-flex h-[32px] items-center rounded-[4px] border border-[#222325] bg-white px-[18px] text-[14px] font-bold text-[#222325] transition hover:bg-[#222325] hover:text-white"
          >
            Join
          </button>

          <button
            type="button"
            aria-label="Open menu"
            className="flex h-8 w-8 flex-col justify-center gap-1.5 lg:hidden"
          >
            <span className="block h-[2px] w-6 bg-[#222325]" />
            <span className="block h-[2px] w-6 bg-[#222325]" />
            <span className="block h-[2px] w-6 bg-[#222325]" />
          </button>
        </nav>
      </div>
    </header>
  );
}
