import { MessageSquare, DollarSign, Lock } from "@/components/icons/HtmlIcons";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Chat-first",
    description: "No application spam. Direct chat with experts, share files, discuss scope.",
  },
  {
    icon: DollarSign,
    title: "Fixed Price Only",
    description: "Packages: Basic, Standard, Premium. No hourly tracking. Clear deliverables.",
  },
  {
    icon: Lock,
    title: "Escrow Locked",
    description: "Money locked in escrow after agreement. Released only on your approval.",
  },
];

export default function Features() {
  return (
    <section id="features" className="border-y border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-6 py-14 md:grid-cols-3 md:px-10">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="rounded-[12px] border border-zinc-200 bg-white p-5">
            <feature.icon size={20} className="text-zinc-900" />
            <h3 className="mt-3 text-[15px] font-semibold text-zinc-900">{feature.title}</h3>
            <p className="mt-1 text-[13px] text-zinc-600">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
