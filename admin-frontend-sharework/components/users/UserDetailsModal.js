"use client";

import { X } from "lucide-react";
import { formatInr } from "@/lib/format";

export default function UserDetailsModal({ user, detail, onClose }) {
  if (!user) return null;
  const profile = detail?.profile;
  const gigs = detail?.gigs ?? [];
  const projects = detail?.projects ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-white h-full shadow-2xl overflow-y-auto">
        <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="font-semibold">User Detail</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <img src={user.avatar} className="w-14 h-14 rounded-full" alt={user.name} />
            <div>
              <div className="text-[16px] font-semibold">{user.name}</div>
              <div className="text-[12px] text-zinc-500">
                {user.email} • {user.role}
              </div>
              <div className="mt-2 flex gap-2">
                <span className={`text-[11px] px-2 py-1 rounded-full ${user.isBanned ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {user.isBanned ? "Banned" : "Active"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Phone</span>
              <span className="font-medium">{user.phone || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Joined</span>
              <span className="font-medium">{user.joined || "—"}</span>
            </div>
            {user.bannedReason ? (
              <div className="flex justify-between">
                <span className="text-zinc-500">Ban reason</span>
                <span className="font-medium">{user.bannedReason}</span>
              </div>
            ) : null}
            {profile?.totalSpent != null ? (
              <div className="flex justify-between">
                <span className="text-zinc-500">Total spent</span>
                <span className="font-medium">{formatInr(profile.totalSpent)}</span>
              </div>
            ) : null}
            {profile?.totalEarnings != null ? (
              <div className="flex justify-between">
                <span className="text-zinc-500">Earnings</span>
                <span className="font-medium">{formatInr(profile.totalEarnings)}</span>
              </div>
            ) : null}
            {profile?.rating != null ? (
              <div className="flex justify-between">
                <span className="text-zinc-500">Rating</span>
                <span className="font-medium">{profile.rating} ({profile.reviewsCount ?? 0})</span>
              </div>
            ) : null}
          </div>

          {gigs.length > 0 ? (
            <div>
              <h4 className="text-[13px] font-semibold mb-2">Gigs</h4>
              <div className="space-y-2">
                {gigs.map((gig) => (
                  <div key={gig.id} className="border border-zinc-200 rounded-xl p-3 text-[12px]">
                    <div className="font-medium">{gig.title}</div>
                    <div className="text-zinc-500">{gig.category} • {gig.isActive ? "Active" : "Inactive"}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {projects.length > 0 ? (
            <div>
              <h4 className="text-[13px] font-semibold mb-2">Projects</h4>
              <div className="space-y-2">
                {projects.map((project) => (
                  <div key={project.id} className="border border-zinc-200 rounded-xl p-3 text-[12px]">
                    <div className="font-medium">{project.title}</div>
                    <div className="text-zinc-500">{project.status} • {formatInr(project.fixedPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {detail === null && <p className="text-[12px] text-zinc-500">Loading detail…</p>}
        </div>
      </div>
    </div>
  );
}
