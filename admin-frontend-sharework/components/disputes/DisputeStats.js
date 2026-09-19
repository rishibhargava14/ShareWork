export default function DisputeStats({ openCount = 0, resolvedCount = 0 }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-[20px] p-5">
      <h3 className="text-[13px] font-semibold">Dispute Stats</h3>
      <div className="mt-4 space-y-3">
        <div className="flex justify-between text-[12px]">
          <span className="text-zinc-500">Open</span>
          <span className="font-medium">{openCount}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-zinc-500">Resolved</span>
          <span className="font-medium">{resolvedCount}</span>
        </div>
      </div>
    </div>
  );
}
