export default function StatsCard({ label, value, delta, icon: Icon, color, bg }) {
  return (
    <div className={`${bg} border border-zinc-200 rounded-[16px] p-4 ${bg === "bg-zinc-900" ? "border-zinc-800" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`w-8 h-8 rounded-lg ${bg === "bg-zinc-900" ? "bg-white/10" : "bg-zinc-100"} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${bg === "bg-zinc-900" ? "text-white" : color}`} />
        </div>
        <span
          className={`text-[11px] px-2 py-1 rounded-full ${
            delta.startsWith("+")
              ? "bg-emerald-50 text-emerald-700"
              : delta.startsWith("-")
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
          }`}
        >
          {delta}
        </span>
      </div>
      <div className={`text-[22px] font-semibold tracking-tight mt-3 ${bg === "bg-zinc-900" ? "text-white" : "text-zinc-900"}`}>
        {value}
      </div>
      <div className={`text-[11px] uppercase tracking-widest mt-1 ${bg === "bg-zinc-900" ? "text-zinc-400" : "text-zinc-500"}`}>
        {label}
      </div>
    </div>
  );
}
