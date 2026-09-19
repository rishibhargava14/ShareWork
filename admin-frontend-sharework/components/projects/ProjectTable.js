"use client";

import { MessageSquare, Eye } from "lucide-react";

export default function ProjectTable({ projects, onChat, onView }) {

  return (
    <div className="bg-white border border-zinc-200 rounded-[20px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="text-[11px] uppercase tracking-widest text-zinc-500">
              <th className="px-5 py-3 font-medium">Project</th>
              <th className="px-5 py-3 font-medium">Client → Freelancer</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Escrow</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-zinc-50/70">
                <td className="px-5 py-3.5">
                  <div className="text-[13px] font-medium">{project.title}</div>
                  <div className="text-[11px] text-zinc-500">{project.id}</div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-[12px]">{project.client}</div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-1">→ {project.freelancer}</div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-[13px] font-medium">₹{project.price.toLocaleString()}</div>
                  <div className="text-[11px] text-zinc-500">Fee ₹{project.fee}</div>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
                      project.escrow === "Paid"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : project.escrow === "Disputed"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : project.escrow === "Delivered"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {project.escrow}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-zinc-600">{project.date}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onChat(project)}
                      className="h-7 px-2.5 rounded-lg bg-zinc-900 text-white text-[11px] flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" /> Chat
                    </button>
                    <button
                      onClick={() => onView?.(project)}
                      className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
