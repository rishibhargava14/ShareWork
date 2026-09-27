import { ChevronLeftIcon, ChevronRightIcon, MoveLeft } from "lucide-react";

const CATEGORIES = [
  ["Programming & Tech", "Web Dev • Figma • IT Support", "1.2k+ experts", "⌘"],
  ["Graphics & Design", "Logo • Brand • UI/UX", "980+ experts", "◈"],
  ["Video & Animation", "Editing • Motion • Reels", "450+ experts", "▶"],
  ["Digital Marketing", "SEO • Social • Ads", "760+ experts", "◒"],
  ["Writing & Translation", "Content • Copy", "520+ experts", "✎"],
  ["Music & Audio", "Mixing • Voice", "210+ experts", "♫"],
  ["Business", "Phase3 Ops • Ops", "640+ experts", "▣"],
  ["AI Services", "AI Apps • Automation", "1.5k+ experts", "◎"],
  ["Architecture", "Interior • 3D", "330+ experts", "◇"],
];

const SERVICES = [
  ["Figma to React • UI Systems", "Dev Provider", "4.8", "₹5,000", "Figma", "React"],
  ["Next.js & Tailwind Specialist", "Aarav Mehta", "4.9", "₹12,000", "Next.js", "Tailwind"],
  ["Brand & Product Designer", "Priya Patel", "4.8", "₹8,500", "Brand", "Figma"],
  ["Video Editor • Motion", "Kabir Singh", "4.7", "₹6,000", "Premiere", "AfterFX"],
  ["Full-Stack SaaS Builder", "Sana Gupta", "5.0", "₹18,000", "Node", "Postgres"],
  ["Phase3 Ops • Automation", "Rohan Das", "4.9", "₹15,000", "Ops", "Zapier"],
];

export default function Features() {
  return (
    <>
      <section id="features" className="bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8">
          <h2 className="mb-8 text-[28px] font-extrabold tracking-[-0.02em] text-[#222325] md:text-[32px]">
            Browse by category
          </h2>

          <div className="grid grid-cols-2 border-l border-t border-[#E4E5E7] md:grid-cols-3 lg:grid-cols-5">
            {CATEGORIES.map(([title, description, count, icon]) => (
              <button
                key={title}
                type="button"
                className="group border-b border-r border-[#E4E5E7] p-6 text-left transition hover:bg-[#FAFAFA] md:p-7"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[4px] border border-transparent bg-[#F5F5F5] text-[22px] text-[#62646A] transition group-hover:border-[#E4E5E7] group-hover:bg-white group-hover:text-[#1DBF73]">
                  {icon}
                </div>
                <div className="text-[16px] font-bold leading-tight text-[#222325] transition group-hover:text-[#1DBF73]">
                  {title}
                </div>
                <div className="mt-1 text-[14px] text-[#62646A]">{description}</div>
                <div className="mt-2 text-[12px] font-medium text-[#95979D]">{count}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-14">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[28px] font-extrabold tracking-[-0.02em] text-[#222325] md:text-[32px]">
              Most popular Services
            </h2>
            <div className="hidden gap-2 sm:flex">
              <button className="h-9 w-9 flex items-center justify-center text-gray-700 rounded-full border border-[#E4E5E7] bg-white text-lg shadow-sm">
                <ChevronLeftIcon size={18}/>
              </button>
              <button className="h-9 w-9 flex items-center justify-center text-gray-700 rounded-full border border-[#E4E5E7] bg-white text-lg shadow-sm">
                <ChevronRightIcon size={18}/>
              </button>
            </div>
          </div>

          <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
            {SERVICES.map(([title, provider, rating, price, tag1, tag2], i) => (
              <article
                key={title}
                className="group w-[252px] shrink-0 cursor-pointer overflow-hidden rounded-[4px] border border-[#E4E5E7] bg-white transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
              >
                <div
                  className={`relative h-[168px] overflow-hidden ${
                    [
                      "bg-gradient-to-br from-violet-500 to-indigo-500",
                      "bg-gradient-to-br from-blue-500 to-cyan-500",
                      "bg-gradient-to-br from-emerald-500 to-teal-500",
                      "bg-gradient-to-br from-orange-500 to-amber-500",
                      "bg-gradient-to-br from-pink-500 to-rose-500",
                      "bg-gradient-to-br from-slate-700 to-slate-900",
                    ][i]
                  }`}
                >
                  <button className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#404145] shadow-sm">
                    ♡
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-[14px] font-bold leading-tight text-white">
                    {title}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#222325] text-[11px] font-bold text-white">
                      {provider
                        .split(" ")
                        .map((x) => x[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold text-[#222325]">
                        {provider}
                      </div>
                      <div className="text-[12px]">
                        <span className="font-bold text-[#FFBE5B]">★ {rating}</span>
                        <span className="text-[#95979D]"> • Top Rated</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    <span className="rounded-[4px] border border-[#E4E5E7] bg-[#F5F5F5] px-2 py-0.5 text-[11px] text-[#62646A]">
                      {tag1}
                    </span>
                    <span className="rounded-[4px] border border-[#E4E5E7] bg-[#F5F5F5] px-2 py-0.5 text-[11px] text-[#62646A]">
                      {tag2}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#E4E5E7] pt-3">
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-[#95979D]">
                      Starting at
                    </span>
                    <span className="text-[16px] font-extrabold text-[#222325]">
                      {price}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
