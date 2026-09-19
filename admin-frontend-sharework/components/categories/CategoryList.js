export default function CategoryList({ categories, onToggle, onDelete, busy }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {categories.map((category) => (
        <div key={category.id} className="bg-white border border-zinc-200 rounded-[20px] p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl ${category.color} flex items-center justify-center text-[18px] text-white`}>
            {category.icon}
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-medium">{category.name}</div>
            <div className="text-[12px] text-zinc-500">
              {category.gigs ?? category.projects ?? 0} gigs • {category.isActive ? "Active" : "Inactive"}
              {category.isSystem ? " • System" : ""}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              disabled={busy}
              onClick={() => onToggle?.(category)}
              className="h-8 px-3 rounded-lg border border-zinc-200 text-[11px] disabled:opacity-50"
            >
              {category.isActive ? "Deactivate" : "Activate"}
            </button>
            {!category.isSystem ? (
              <button
                disabled={busy}
                onClick={() => onDelete?.(category)}
                className="h-8 px-3 rounded-lg border border-zinc-200 text-[11px] text-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
