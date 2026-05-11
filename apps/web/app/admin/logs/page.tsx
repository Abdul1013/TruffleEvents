"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getAdminLogs, type AdminLogs } from "@/lib/actions/analytics";

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  primary: "#713600",
  accent: "#C05800",
  dark: "#38240D",
  valid: "#10B981",
  duplicate: "#F59E0B",
  invalid: "#EF4444",
};

const RESULT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  VALID:     { label: "Valid",     bg: "bg-[#10B981]/10", text: "text-[#10B981]" },
  DUPLICATE: { label: "Duplicate", bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]" },
  INVALID:   { label: "Invalid",   bg: "bg-[#EF4444]/10", text: "text-[#EF4444]" },
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN:      "bg-[#713600] text-white",
  ORGANIZER:  "bg-[#C05800] text-white",
  ATTENDEE:   "bg-[#38240D]/10 text-[#38240D]",
  GATEKEEPER: "bg-[#10B981]/10 text-[#10B981]",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Skeleton({ h = "h-40" }: { h?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#38240D]/10 ${h}`} />;
}

function KpiCard({ label, value, sub, color = C.primary }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border-2 border-[#38240D] bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#C05800]">{label}</p>
      <p className="mt-2 text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[#713600]/70">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-[#38240D] bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-[#38240D]">{title}</h3>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminLogsPage() {
  const [data, setData] = useState<AdminLogs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanFilter, setScanFilter] = useState<string>("ALL");
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    getAdminLogs().then((res) => {
      if (res.success) setData(res.data);
      else setError(res.error);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} h="h-28" />)}
        </div>
        <Skeleton h="h-72" />
        <Skeleton h="h-96" />
        <Skeleton h="h-72" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { scanEvents, dailyScans, users, totals } = data;

  const filteredScans =
    scanFilter === "ALL"
      ? scanEvents
      : scanEvents.filter((s) => s.result === scanFilter);

  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.role.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  const validRate =
    totals.totalScans > 0
      ? ((totals.validScans / totals.totalScans) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#38240D]">Audit Logs</h2>
        <p className="mt-1 text-sm text-[#713600]">
          Global scan events and user creation history
        </p>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Users" value={totals.totalUsers.toString()} sub="registered accounts" />
        <KpiCard label="Scans (14 days)" value={totals.totalScans.toString()} sub="in scan window" color={C.valid} />
        <KpiCard label="Valid Rate" value={`${validRate}%`} sub="of all scans" color={C.valid} />
        <KpiCard label="Scans Today" value={totals.todayScans.toString()} sub="UTC today" color={C.accent} />
      </div>

      {/* ── Daily scan activity chart ───────────────────────────────────── */}
      <Section title="Daily Scan Activity (Last 14 Days)">
        {dailyScans.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyScans} margin={{ top: 0, right: 16, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#38240D11" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: C.dark }}
                tickFormatter={(d) => d.slice(5)}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: C.dark }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderColor: C.dark, borderRadius: 8 }}
                formatter={(v, name) => [Number(v ?? 0), String(name)]}
              />
              <Legend wrapperStyle={{ paddingTop: 24 }} />
              <Bar dataKey="valid"     name="Valid"     stackId="a" fill={C.valid}     radius={[0,0,0,0]} />
              <Bar dataKey="duplicate" name="Duplicate" stackId="a" fill={C.duplicate} radius={[0,0,0,0]} />
              <Bar dataKey="invalid"   name="Invalid"   stackId="a" fill={C.invalid}   radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-40 items-center justify-center text-[#713600]/60">
            No scan activity yet.
          </div>
        )}
      </Section>

      {/* ── Scan events table ───────────────────────────────────────────── */}
      <Section title={`Scan Events (${filteredScans.length} shown)`}>
        {/* Filter pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          {["ALL", "VALID", "DUPLICATE", "INVALID"].map((f) => (
            <button
              key={f}
              onClick={() => setScanFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                scanFilter === f
                  ? "bg-[#713600] text-white"
                  : "bg-[#38240D]/10 text-[#38240D] hover:bg-[#38240D]/20"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filteredScans.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#713600]/60">No scan events found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#38240D]/10 text-left text-xs font-semibold uppercase tracking-wider text-[#C05800]">
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">Result</th>
                  <th className="pb-3 pr-4">Ticket ID</th>
                  <th className="pb-3">Gatekeeper</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38240D]/10">
                {filteredScans.map((s) => {
                  const cfg = RESULT_CONFIG[s.result] ?? RESULT_CONFIG.INVALID;
                  return (
                    <tr key={s.id} className="hover:bg-[#FDFBD4]/50">
                      <td className="py-2.5 pr-4 text-xs text-[#713600]/80 whitespace-nowrap">
                        {fmtTime(s.scanned_at)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-[#38240D]/70">
                        {s.ticket_id.slice(0, 8)}…
                      </td>
                      <td className="py-2.5 text-xs text-[#38240D]">
                        {s.gatekeeper_name}
                        <span className="ml-1 text-[#713600]/60">({s.gatekeeper_email})</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── User creation log ───────────────────────────────────────────── */}
      <Section title={`User Accounts (${users.length} total)`}>
        {/* Search */}
        <input
          type="text"
          placeholder="Search by name, email or role…"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="mb-4 w-full rounded-lg border-2 border-[#38240D]/20 bg-[#FDFBD4] px-3 py-2 text-sm outline-none focus:border-[#713600]"
        />

        {filteredUsers.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#713600]/60">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#38240D]/10 text-left text-xs font-semibold uppercase tracking-wider text-[#C05800]">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38240D]/10">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FDFBD4]/50">
                    <td className="py-2.5 pr-4 font-medium text-[#38240D]">
                      {u.full_name}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-[#713600]/80">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-700"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-[#713600]/70 whitespace-nowrap">
                      {fmtTime(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
