"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { PublicUser } from "@/models/User";
import { ErrorNote, Loader } from "@/components/app/ui";
import { logout, refreshSession } from "@/lib/auth";
import { useSpaNav } from "@/components/app/SpaNav";
import { useAsync } from "@/lib/use-async";
import type { ExpressProviderProfile, ExpressUser } from "@/lib/express";

type MeResponse = {
  user: ExpressUser & { email?: string };
  profile: ExpressProviderProfile | null;
};

export default function ProfileForm({ onSaved }: { onSaved?: (profile: PublicUser) => void }) {
  const spa = useSpaNav();
  const me = useAsync<MeResponse>(() => api("/api/users/me"), []);
  const user = me.data?.user;
  const profile = me.data?.profile;
  const role = user?.role;
  const isCustomer = role === "customer";
  const accent = isCustomer ? "#2563EB" : "#16A34A";
  const [draft, setDraft] = useState<{ name: string; bio: string; country: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [saved, setSaved] = useState(false);
  const name = draft?.name ?? user?.name ?? "";
  const bio = draft?.bio ?? profile?.bio ?? "";
  const country = draft?.country ?? profile?.country ?? "";

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const body: { name: string; bio: string; country?: string } = { name: name.trim(), bio: bio.trim() };
      if (isCustomer && country.trim().length >= 2) body.country = country.trim();
      const res = await api<MeResponse>("/api/users/me", { method: "PUT", body: JSON.stringify(body) });
      await refreshSession();
      setDraft(null);
      me.reload();
      if (res.user && onSaved) {
        onSaved({
          id: res.user.id,
          name: res.user.name,
          email: res.user.email ?? "",
          role: res.user.role,
          status: "active",
          bio: res.profile?.bio,
          skills: res.profile?.skills ?? [],
          createdAt: res.user.createdAt ?? "",
        });
      }
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err : new Error("Could not save profile."));
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await logout();
    spa.goLanding();
  };

  if (me.loading && !user) return <Loader label="Loading profile…" />;
  if (me.error && !user) return <ErrorNote error={me.error} />;
  if (!user) return <Loader label="Loading profile…" />;

  return (
    <div className="rounded-[12px] border border-zinc-200 bg-white p-5">
      <div className="flex gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full text-[18px] font-bold text-white" style={{ background: accent }}>
          {user.name?.[0] || "U"}
        </div>
        <div>
          <div className="font-semibold">{user.name}</div>
          <div className="text-[12px] text-zinc-600">{user.email}</div>
          <div className="mt-2 w-fit rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] text-white">
            {(role || "customer").toUpperCase()} • Fixed price only
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-zinc-700">Name</span>
          <input
            value={name}
            onChange={(e) => setDraft({ name: e.target.value, bio, country })}
            className="h-10 w-full rounded-[8px] border border-zinc-300 px-3 text-[14px] outline-none focus:border-zinc-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-zinc-700">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setDraft({ name, bio: e.target.value, country })}
            rows={3}
            className="w-full rounded-[8px] border border-zinc-300 px-3 py-2 text-[14px] outline-none focus:border-zinc-900"
          />
        </label>
        {isCustomer ? (
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-zinc-700">Country</span>
            <input
              value={country}
              onChange={(e) => setDraft({ name, bio, country: e.target.value })}
              className="h-10 w-full rounded-[8px] border border-zinc-300 px-3 text-[14px] outline-none focus:border-zinc-900"
            />
          </label>
        ) : null}
        {saveError ? <ErrorNote error={saveError} /> : null}
        {saved ? <p className="text-[12px] text-green-700">Profile saved.</p> : null}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="h-9 w-full rounded-[8px] text-[12px] font-medium text-white disabled:opacity-60"
          style={{ background: accent }}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        <div className="rounded-[10px] border border-zinc-200 p-3">
          <div className="text-[12px] font-medium">Account role</div>
          <div className="mt-1 text-[11px] text-zinc-600">
            Role is set at signup. Customer and Provider are separate accounts on this backend.
          </div>
        </div>
        <button type="button" onClick={signOut} className="h-9 w-full rounded-[8px] border border-zinc-200 text-[12px]">
          Sign Out → Landing
        </button>
      </div>
    </div>
  );
}
