export default function PreviewCard() {
  return (
    <div className="relative h-[560px] overflow-hidden rounded-[4px] border border-[#E4E5E7] bg-[#F5F5F5] md:h-[620px]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f8f8ff] via-white to-[#e8f5e9]" />
      <div className="absolute right-10 top-10 h-72 w-72 rounded-full bg-[#1DBF73]/10 blur-3xl" />
      <div className="absolute bottom-10 left-10 h-80 w-80 rounded-full bg-[#2563EB]/10 blur-3xl" />

      <div className="absolute inset-0 flex items-end justify-center">
        <div className="relative h-[480px] w-[320px] overflow-hidden rounded-t-[24px] bg-gradient-to-b from-[#222325] to-[#3a3b3d] shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-4xl font-black text-white backdrop-blur">
            RD
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#1DBF73]" />
              <span className="text-[12px] font-semibold">
                Online • Available now
              </span>
            </div>
            <div className="mt-1 text-[18px] font-bold">
              Rohan Das • Phase3 Ops
            </div>
            <div className="text-[12px] text-white/70">
              Top Rated • 4.9 (42)
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-[6%] top-[20%] w-[200px] animate-[float_6s_ease-in-out_infinite] rounded-[8px] border border-[#E4E5E7] bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-[11px] font-bold text-white">
            AM
          </div>
          <div>
            <div className="text-[12px] font-bold leading-tight">
              Aarav delivered
            </div>
            <div className="text-[11px] text-[#62646A]">
              ★ 5.0 • 2 days ago
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-[8%] top-[12%] flex items-center gap-2 rounded-full border border-[#E4E5E7] bg-white px-4 py-2 text-[13px] font-semibold shadow-[0_8px_20px_rgba(0,0,0,0.1)]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#1DBF73]" />
        2,340 experts online
      </div>

      <div className="absolute bottom-[18%] left-[4%] w-[260px] rounded-[12px] border border-[#E4E5E7] bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
              PP
            </div>
            <span className="text-[13px] font-bold">Priya • Online</span>
          </div>
          <span className="rounded-[4px] bg-[#222325] px-2.5 py-1 text-[11px] font-bold text-white">
            Fixed ₹8.5k
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F5F5F5]">
          <div className="h-full w-[78%] rounded-full bg-[#1DBF73]" />
        </div>
        <div className="mt-3 flex gap-2">
          <div className="h-9 flex-1 rounded-[4px] border border-[#E4E5E7] bg-[#F5F5F5]" />
          <button
            type="button"
            className="w-[84px] rounded-[4px] bg-[#222325] text-[12px] font-bold text-white"
          >
            Approve
          </button>
        </div>
      </div>

      <div className="absolute bottom-[8%] right-[6%] flex -space-x-3">
        {["DP", "AM", "PP", "KS", "SG", "+2k"].map((item, index) => (
          <div
            key={item}
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold shadow-md ${
              index === 5
                ? "bg-white text-[#222325]"
                : "bg-[#222325] text-white"
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
