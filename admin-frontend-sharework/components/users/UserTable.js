"use client";

import { Eye, Pause, Ban } from "lucide-react";

export default function UserTable({ users, onView, onBan, busyId }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-[20px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="text-[11px] uppercase tracking-widest text-zinc-500">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50/70 transition">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <img src={user.avatar} className="w-8 h-8 rounded-full" alt={user.name} />
                    <div>
                      <div className="text-[13px] font-medium">{user.name}</div>
                      <div className="text-[11px] text-zinc-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-[11px] px-2 py-1 rounded-full border ${
                      user.role === "Client"
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : user.role === "Freelancer"
                          ? "bg-violet-50 border-violet-200 text-violet-700"
                          : "bg-zinc-100 border-zinc-200 text-zinc-700"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-zinc-600">{user.joined}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-[11px] px-2 py-1 rounded-full ${
                      user.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    • {user.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`View ${user.name}`}
                      onClick={() => onView(user)}
                      className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center hover:bg-black"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={busyId === user.id || user.status !== "Active"}
                      onClick={() => onBan?.(user, true)}
                      className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-amber-100 text-zinc-600 hover:text-amber-700 flex items-center justify-center disabled:opacity-40"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={busyId === user.id}
                      onClick={() => onBan?.(user, user.status !== "Active" ? false : true)}
                      className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600 flex items-center justify-center disabled:opacity-40"
                    >
                      <Ban className="w-3.5 h-3.5" />
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
