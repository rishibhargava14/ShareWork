"use client";

import Logo from "@/components/Logo";
import { useSpaNav } from "@/components/app/SpaNav";

export default function Header() {
  const spa = useSpaNav();
  return (
    <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-zinc-200 bg-white px-6 md:px-10">
      <button type="button" onClick={spa.goLanding} aria-label="ShareWork — home">
        <Logo />
      </button>
      <nav className="hidden items-center gap-8 text-[14px] font-medium text-zinc-600 md:flex">
        <span>Features</span>
        <span>How it works</span>
        <span>Pricing</span>
      </nav>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => spa.goAuth("login")} className="rounded-md px-4 py-2 text-[14px] font-medium hover:bg-zinc-50">
          Sign In
        </button>
        <button type="button" onClick={() => spa.goAuth("signup")} className="rounded-md bg-zinc-900 px-4 py-2 text-[14px] font-medium text-white">
          Get Started
        </button>
      </div>
    </header>
  );
}
