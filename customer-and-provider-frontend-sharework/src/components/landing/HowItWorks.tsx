"use client";

import { MessageSquare, FileText, Lock, Package, CreditCard } from "@/components/icons/HtmlIcons";
import { useSpaNav } from "@/components/app/SpaNav";

const STEPS = [
  { step: "01", title: "Chat", description: "Talk to expert, share requirements", icon: MessageSquare },
  { step: "02", title: "Agreement", description: "Title, scope, price, timeline, revisions", icon: FileText },
  { step: "03", title: "Escrow", description: "Fund escrow - money locked safely", icon: Lock },
  { step: "04", title: "Delivery", description: "Provider submits work for review", icon: Package },
  { step: "05", title: "Payment", description: "Approve & release - auto payout", icon: CreditCard },
];

export default function HowItWorks() {
  const spa = useSpaNav();
  return (
    <section id="how-it-works" className="bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-10">
        <h2 className="text-[28px] font-bold tracking-tight text-zinc-900">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {STEPS.map((item) => (
            <article key={item.step} className="rounded-[12px] border border-zinc-200 bg-white p-4 hover:bg-zinc-50">
              <div className="flex items-center justify-between">
                <span className="rounded bg-zinc-900 px-2 py-1 text-[11px] font-bold text-white">{item.step}</span>
                <item.icon size={16} className="text-zinc-500" />
              </div>
              <h3 className="mt-4 text-[14px] font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-1 text-[12px] text-zinc-600">{item.description}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-[12px] border border-zinc-200 p-5 md:flex-row">
          <div>
            <p className="font-semibold text-zinc-900">Ready to start? No role needed on landing.</p>
            <p className="text-[13px] text-zinc-600">Choose Customer or Provider after you click Get Started - on auth page.</p>
          </div>
          <button type="button" onClick={() => spa.goAuth("signup")} className="rounded-md bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white">
            Get Started →
          </button>
        </div>
      </div>
    </section>
  );
}
