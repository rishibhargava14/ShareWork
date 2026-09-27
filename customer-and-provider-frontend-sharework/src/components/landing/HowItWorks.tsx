"use client";

import { MessageSquare, FileText, Lock, Package, CreditCard } from "@/components/icons/HtmlIcons";
import { useSpaNav } from "@/components/app/SpaNav";

const STEPS = [
  { step: "01", title: "Chat", description: "Talk to expert, share requirements", icon: MessageSquare },
  { step: "02", title: "Agreement", description: "Title, scope, price, timeline, revisions", icon: FileText },
  { step: "03", title: "Escrow", description: "Fund escrow — money locked safely", icon: Lock },
  { step: "04", title: "Delivery", description: "Provider submits work for review", icon: Package },
  { step: "05", title: "Payment", description: "Approve & release — auto payout", icon: CreditCard },
];

export default function HowItWorks() {
  const spa = useSpaNav();

  return (
    <section id="how-it-works" className="border-y border-[#E4E5E7] bg-[#F5F5F5]">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.slice(0, 3).map((item) => (
            <article
              key={item.step}
              className="rounded-[4px] border border-[#E4E5E7] bg-white p-6 transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
            >
              <div className="mb-3 flex items-center gap-2 text-[#FFBE5B]">
                <item.icon size={16} />
                <span className="text-[12px] font-bold text-[#95979D]">
                  {item.step}
                </span>
              </div>
              <h3 className="text-[18px] font-bold text-[#222325]">{item.title}</h3>
              <p className="mt-1 text-[13px] leading-5 text-[#62646A]">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-[4px] border border-[#E4E5E7] bg-[#222325] p-6 text-white md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#1DBF73]">
                Simple workflow
              </p>
              <h2 className="mt-2 text-[28px] font-extrabold tracking-tight">
                Chat → Agreement → Escrow → Delivery → Payment
              </h2>
              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-white/65">
                Fixed-price projects keep scope, payment and delivery clear from
                the beginning.
              </p>
            </div>
            <button
              type="button"
              onClick={() => spa.goAuth("signup")}
              className="shrink-0 rounded-[4px] bg-white px-5 py-3 text-[14px] font-bold text-[#222325] transition hover:bg-[#1DBF73]"
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
