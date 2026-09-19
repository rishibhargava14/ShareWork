"use client";

import { Search, SlidersHorizontal } from "lucide-react";

export default function UserFilter({ role, setRole, query, setQuery, onSearch }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-[16px] p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
      <div className="flex items-center gap-2">
        {["All", "Clients", "Freelancers"].map((item) => (
          <button
            key={item}
            onClick={() => setRole(item)}
            className={`h-8 px-4 rounded-xl text-[13px] font-medium transition ${
              role === item ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1 sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch?.();
            }}
            placeholder="Search users, email..."
            className="w-full h-9 pl-9 pr-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] focus:outline-none focus:border-zinc-300"
          />
        </div>
        <button
          type="button"
          onClick={() => onSearch?.()}
          className="h-9 w-9 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center"
        >
          <SlidersHorizontal className="w-4 h-4 text-zinc-600" />
        </button>
      </div>
    </div>
  );
}
