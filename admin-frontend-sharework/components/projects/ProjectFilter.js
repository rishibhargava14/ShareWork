"use client";

import { Search } from "lucide-react";

export default function ProjectFilter({ query, setQuery, onSearch }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-[16px] p-3 flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch?.();
          }}
          placeholder="Search project ID, title..."
          className="w-full h-9 pl-9 pr-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] focus:outline-none focus:border-zinc-300"
        />
      </div>
      <button type="button" onClick={() => onSearch?.()} className="h-9 px-4 rounded-xl bg-zinc-900 text-white text-[13px]">Search</button>
    </div>
  );
}
