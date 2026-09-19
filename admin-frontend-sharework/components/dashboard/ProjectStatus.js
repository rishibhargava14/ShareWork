export default function ProjectStatus({ projects = [] }) {
  const total = projects.length || 1;
  const counts = {
    Completed: projects.filter((item) => item.status === "completed").length,
    "In Progress": projects.filter((item) => ["in_progress", "escrow_funded", "agreement_pending"].includes(item.status)).length,
    Delivered: projects.filter((item) => item.status === "delivered").length,
    Disputed: projects.filter((item) => item.status === "disputed").length,
    Cancelled: projects.filter((item) => item.status === "cancelled").length,
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-[20px] p-5">
      <h3 className="text-[14px] font-semibold">Project Status</h3>
      <p className="text-[12px] text-zinc-500 mt-0.5">{projects.length} projects</p>
      <div className="mt-6 space-y-4">
        {Object.entries(counts).map(([name, value]) => (
          <div key={name} className="space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-zinc-600">{name}</span>
              <span className="font-medium">{value}</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${Math.round((value / total) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
