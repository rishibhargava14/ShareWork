export default function Logo({
  className = "",
  markOnly = false,
  accent = "ink",
  size = "lg",
}: {
  className?: string;
  markOnly?: boolean;
  accent?: "ink" | "blue" | "green";
  size?: "sm" | "lg";
}) {
  const app = accent === "blue" || accent === "green";
  const sm = size === "sm" || app;
  const mark = sm
    ? "h-7 w-7 rounded-[6px] text-[13px] text-white"
    : "h-8 w-8 rounded-[6px] text-[13px] text-white";
  const markStyle =
    accent === "blue" ? { background: "#2563EB" } : accent === "green" ? { background: "#16A34A" } : { background: "#18181b" };
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span className={`flex items-center justify-center font-bold ${mark}`} style={markStyle}>
        S
      </span>
      {!markOnly && <span className={sm ? "text-[14px] text-zinc-900" : "text-[20px] text-zinc-900"}>ShareWork</span>}
    </span>
  );
}
