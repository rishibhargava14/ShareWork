import { ShieldAlert } from "lucide-react";

export default function LeakageBlocks({ logs = [] }) {
  const items = logs.slice(0, 4);

  return (
    <div className="bg-white border border-zinc-200 rounded-[20px] p-5">
      <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500" /> Recent Leakage Blocks
      </h3>
      {items.length === 0 ? (
        <p className="text-[12px] text-zinc-500">No leakage logs yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="w-1.5 self-stretch rounded-full bg-amber-500" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate">
                  {item.senderName || "User"} • {item.detectedType || item.action}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">{item.maskedContent || item.action}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
