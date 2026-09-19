"use client";

import { useEffect, useState } from "react";
import UserFilter from "@/components/users/UserFilter";
import UserTable from "@/components/users/UserTable";
import UserDetailsModal from "@/components/users/UserDetailsModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { formatDay, initialsAvatar, roleLabel } from "@/lib/format";

function mapUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleLabel(user.role),
    rawRole: user.role,
    joined: formatDay(user.createdAt),
    projects: "—",
    status: user.isBanned ? "Suspended" : "Active",
    avatar: user.avatar || initialsAvatar(user.name),
    isBanned: Boolean(user.isBanned),
    bannedReason: user.bannedReason || "",
    phone: user.phone || "",
  };
}

export default function UsersPage() {
  const [role, setRole] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const queryRole = role === "Clients" ? "customer" : role === "Freelancers" ? "provider" : "";

  const load = async (nextPage = 1) => {
    const params = new URLSearchParams({ page: String(nextPage) });
    if (queryRole) params.set("role", queryRole);
    if (query.trim()) params.set("q", query.trim());
    const res = await api(`/api/admin/users?${params.toString()}`);
    setUsers((res.users ?? []).map(mapUser));
    setTotal(res.total ?? 0);
    setPage(res.page ?? nextPage);
  };

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: "1" });
    const nextRole = role === "Clients" ? "customer" : role === "Freelancers" ? "provider" : "";
    if (nextRole) params.set("role", nextRole);
    api(`/api/admin/users?${params.toString()}`)
      .then((res) => {
        if (!active) return;
        setUsers((res.users ?? []).map(mapUser));
        setTotal(res.total ?? 0);
        setPage(res.page ?? 1);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load users.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [role]);

  const search = async () => {
    setLoading(true);
    try {
      await load(1);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (user) => {
    setSelected(user);
    setDetail(null);
    try {
      const res = await api(`/api/admin/users/${user.id}`);
      setDetail(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load user detail.");
    }
  };

  const banUser = async () => {
    if (!confirm || busyId) return;
    setBusyId(confirm.user.id);
    try {
      await api(`/api/admin/users/${confirm.user.id}/ban`, {
        method: "PUT",
        body: JSON.stringify({
          isBanned: confirm.isBanned,
          reason: confirm.isBanned ? "Banned from admin console" : undefined,
        }),
      });
      setSuccess(confirm.isBanned ? "User suspended." : "User restored.");
      setError("");
      await load(page);
      setConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update user.");
      setSuccess("");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-[1400px] space-y-4">
      <UserFilter
        role={role}
        setRole={setRole}
        query={query}
        setQuery={setQuery}
        onSearch={search}
      />
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {success ? <p className="text-[13px] text-emerald-700">{success}</p> : null}
      {loading ? <p className="text-[13px] text-zinc-500">Loading users…</p> : null}
      {!loading && users.length === 0 ? <p className="text-[13px] text-zinc-500">No users found.</p> : null}
      <UserTable
        users={users}
        onView={openDetail}
        onBan={(user, isBanned) => setConfirm({ user, isBanned })}
        busyId={busyId}
      />
      <div className="flex justify-between text-[12px] text-zinc-500">
        <span>{total} users</span>
        <div className="flex gap-2">
          <button disabled={page <= 1 || loading} onClick={() => load(page - 1)} className="h-8 px-3 rounded-lg border disabled:opacity-40">
            Prev
          </button>
          <button disabled={users.length === 0 || users.length >= total || loading} onClick={() => load(page + 1)} className="h-8 px-3 rounded-lg border disabled:opacity-40">
            Next
          </button>
        </div>
      </div>
      <UserDetailsModal user={selected} detail={detail} onClose={() => setSelected(null)} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.isBanned ? "Suspend user?" : "Restore user?"}
        body={
          confirm?.isBanned
            ? `This bans ${confirm?.user?.name} from signing in. Role and credentials are not changed.`
            : `This restores ${confirm?.user?.name}.`
        }
        confirmLabel={confirm?.isBanned ? "Suspend" : "Restore"}
        danger={Boolean(confirm?.isBanned)}
        busy={Boolean(busyId)}
        onCancel={() => setConfirm(null)}
        onConfirm={banUser}
      />
    </div>
  );
}
