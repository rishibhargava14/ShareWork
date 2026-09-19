export default function PreviewCard() {
  return (
    <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-4">
      <div className="overflow-hidden rounded-[12px] border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <p className="text-[12px] text-zinc-500">sharework.app • Escrow flow</p>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-[12px] bg-[#2563EB] px-3 py-2 text-[13px] text-white">
              I can build your SaaS dashboard in 7 days for ₹15k flat.
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-[12px] bg-zinc-100 px-3 py-2 text-[13px] text-zinc-900">
              Perfect. Let&apos;s lock agreement?
            </div>
          </div>
        </div>
        <div className="mx-4 mb-4 rounded-[12px] border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-zinc-900">Final Agreement • ₹15,000</p>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">LOCKED</span>
          </div>
          <p className="mt-2 text-[12px] text-zinc-500">Escrow Funded • In Progress • Delivery → Approval → Payout</p>
        </div>
      </div>
    </div>
  );
}
