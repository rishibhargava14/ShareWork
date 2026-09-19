"use client";

import { X } from "lucide-react";

export default function ProjectChatModal({ project, onClose }) {
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white h-full shadow-2xl flex flex-col">
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold">{project.title}</div>
            <div className="text-[11px] text-zinc-500">
              {project.id} • ₹{project.price.toLocaleString()} • {project.escrow}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
          <div className="bg-white border rounded-xl p-3 text-[12px]">
            <div className="font-medium mb-2">Project</div>
            <div className="text-zinc-600">{project.scope || project.title}</div>
            <div className="mt-2 text-[11px] text-zinc-500">
              {project.client} → {project.freelancer}
            </div>
            <div className="mt-2 text-[11px] text-zinc-500">
              Chat lives in the Customer/Provider app. Conversation: {project.conversationId || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
