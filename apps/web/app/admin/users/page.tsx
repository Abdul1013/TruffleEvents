"use client";

import { useEffect, useState } from "react";
import { getAdminUsers, updateUserRole, type UserRow } from "@/lib/actions/analytics";
import { Search, Shield, ChevronDown } from "lucide-react";

const ROLES = ["ADMIN", "ORGANIZER", "ATTENDEE", "GATEKEEPER"] as const;

const ROLE_BADGE: Record<string, string> = {
  ADMIN:      "bg-[#713600] text-white",
  ORGANIZER:  "bg-[#C05800] text-white",
  ATTENDEE:   "bg-[#38240D]/10 text-[#38240D]",
  GATEKEEPER: "bg-[#10B981]/10 text-[#10B981]",
};

const ROLE_COUNTS: Record<string, string> = {
  ADMIN: "bg-[#713600]/10 text-[#713600]",
  ORGANIZER: "bg-[#C05800]/10 text-[#C05800]",
  ATTENDEE: "bg-[#38240D]/10 text-[#38240D]",
  GATEKEEPER: "bg-[#10B981]/10 text-[#10B981]",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Skeleton({ h = "h-12" }: { h?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#38240D]/10 ${h}`} />;
}

function RoleSelect({
  userId,
  currentRole,
  onRoleChanged,
}: {
  userId: string;
  currentRole: string;
  onRoleChanged: (userId: string, newRole: string) => void;
}) {
  const [selected, setSelected] = useState(currentRole);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleChange(role: string) {
    if (role === currentRole) return;
    setSaving(true);
    setFeedback(null);
    const result = await updateUserRole(userId, role);
    setSaving(false);
    if (result.success) {
      setSelected(role);
      onRoleChanged(userId, role);
      setFeedback({ ok: true, msg: "Saved" });
    } else {
      setFeedback({ ok: false, msg: result.error ?? "Failed" });
    }
    setTimeout(() => setFeedback(null), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          className="appearance-none rounded-lg border-2 border-[#38240D]/20 bg-[#FDFBD4] px-3 py-1.5 pr-8 text-xs font-semibold text-[#38240D] outline-none focus:border-[#713600] disabled:opacity-60 cursor-pointer"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#38240D]/60" />
      </div>
      {saving && <span className="text-xs text-[#713600]/60">Saving…</span>}
      {feedback && (
        <span className={`text-xs font-semibold ${feedback.ok ? "text-[#10B981]" : "text-[#EF4444]"}`}>
          {feedback.msg}
        </span>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    getAdminUsers().then((res) => {
      if (res.success) setUsers(res.users);
      else setError(res.error);
      setLoading(false);
    });
  }, []);

  function handleRoleChanged(userId: string, newRole: string) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleCounts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} h="h-24" />)}
        </div>
        <Skeleton h="h-10" />
        <Skeleton h="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-6 text-[#EF4444]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#38240D]">User Management</h2>
        <p className="mt-1 text-sm text-[#713600]">
          {users.length} registered account{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Role breakdown cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r} className="rounded-xl border-2 border-[#38240D] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C05800]">{r}</p>
            <p className="mt-2 text-3xl font-bold text-[#713600]">{roleCounts[r] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38240D]/40" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border-2 border-[#38240D]/20 bg-[#FDFBD4] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#713600]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["ALL", ...ROLES].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                roleFilter === r
                  ? "bg-[#713600] text-white"
                  : "bg-[#38240D]/10 text-[#38240D] hover:bg-[#38240D]/20"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-xl border-2 border-[#38240D] bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-[#38240D]">
          Accounts ({filtered.length} shown)
        </h3>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#713600]/60">No users match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#38240D]/10 text-left text-xs font-semibold uppercase tracking-wider text-[#C05800]">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Current Role</th>
                  <th className="pb-3 pr-4">Change Role</th>
                  <th className="pb-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38240D]/10">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FDFBD4]/50">
                    <td className="py-3 pr-4 font-medium text-[#38240D]">{u.full_name}</td>
                    <td className="py-3 pr-4 text-xs text-[#713600]/80">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <Shield size={10} />
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <RoleSelect
                        userId={u.id}
                        currentRole={u.role}
                        onRoleChanged={handleRoleChanged}
                      />
                    </td>
                    <td className="py-3 text-xs text-[#713600]/70 whitespace-nowrap">
                      {fmtDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
