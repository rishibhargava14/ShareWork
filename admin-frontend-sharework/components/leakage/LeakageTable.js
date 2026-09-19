"use client";

function typeClass(type) {
  if (type === "phone") return "bg-blue-100 text-blue-700";
  if (type === "email") return "bg-violet-100 text-violet-700";
  if (type === "upi") return "bg-emerald-100 text-emerald-700";
  return "bg-amber-100 text-amber-700";
}

export default function LeakageTable({ logs = [] }) {
  if (logs.length === 0) {
    return <p className="text-[13px] text-zinc-500">No leakage logs yet.</p>;
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-[20px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="text-[11px] uppercase tracking-widest text-zinc-500">
              <th className="px-5 py-3 font-medium">User & Type</th>
              <th className="px-5 py-3 font-medium">Masked Snippet</th>
              <th className="px-5 py-3 font-medium">Chat</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {logs.map((item) => (
              <tr key={item.id} className="hover:bg-amber-50/40">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-medium ${typeClass(item.detectedType)}`}>
                      {(item.detectedType || "L")[0].toUpperCase()}
                    </span>
                    <div>
                      <div className="text-[13px] font-medium">{item.senderName || "User"}</div>
                      <div className="text-[11px] text-zinc-500">{item.detectedType || "unknown"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 max-w-[300px]">
                  <div className="text-[12px] font-mono bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1.5 truncate">
                    {item.maskedContent || "—"}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[12px] font-mono">{item.conversationId?.slice(-8)}</td>
                <td className="px-5 py-3.5 text-[12px]">{item.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
