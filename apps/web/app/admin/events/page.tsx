"use client";

import { useEffect, useState } from "react";
import { getAdminAllEvents, type AdminEventRow } from "@/lib/actions/analytics";
import { Search, Calendar, MapPin, ExternalLink } from "lucide-react";
import Link from "next/link";

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

function SellThroughBadge({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "text-[#10B981] bg-[#10B981]/10" :
    pct >= 40 ? "text-[#F59E0B] bg-[#F59E0B]/10" :
    "text-[#38240D]/60 bg-[#38240D]/5";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {pct}%
    </span>
  );
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UPCOMING" | "PAST">("ALL");

  useEffect(() => {
    getAdminAllEvents().then((res) => {
      if (res.success) setEvents(res.events);
      else setError(res.error);
      setLoading(false);
    });
  }, []);

  const now = new Date();

  const filtered = events.filter((e) => {
    const matchesSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.organizer_name.toLowerCase().includes(search.toLowerCase()) ||
      e.venue_name?.toLowerCase().includes(search.toLowerCase());
    const isUpcoming = new Date(e.starts_at) > now;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "UPCOMING" && isUpcoming) ||
      (statusFilter === "PAST" && !isUpcoming);
    return matchesSearch && matchesStatus;
  });

  const upcomingCount = events.filter((e) => new Date(e.starts_at) > now).length;
  const totalCapacity = events.reduce((s, e) => s + e.total_capacity, 0);
  const totalSold = events.reduce((s, e) => s + e.total_sold, 0);
  const overallSellThrough =
    totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

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
        <h2 className="text-3xl font-bold text-[#38240D]">Event Management</h2>
        <p className="mt-1 text-sm text-[#713600]">
          All events across the platform
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border-2 border-[#38240D] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C05800]">Total Events</p>
          <p className="mt-2 text-3xl font-bold text-[#713600]">{events.length}</p>
        </div>
        <div className="rounded-xl border-2 border-[#38240D] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C05800]">Upcoming</p>
          <p className="mt-2 text-3xl font-bold text-[#10B981]">{upcomingCount}</p>
        </div>
        <div className="rounded-xl border-2 border-[#38240D] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C05800]">Tickets Sold</p>
          <p className="mt-2 text-3xl font-bold text-[#713600]">{totalSold.toLocaleString()}</p>
          <p className="mt-1 text-xs text-[#713600]/60">of {totalCapacity.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border-2 border-[#38240D] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C05800]">Sell-Through</p>
          <p className="mt-2 text-3xl font-bold text-[#713600]">{overallSellThrough}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38240D]/40" />
          <input
            type="text"
            placeholder="Search by title, organizer or venue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border-2 border-[#38240D]/20 bg-[#FDFBD4] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#713600]"
          />
        </div>

        <div className="flex gap-2">
          {(["ALL", "UPCOMING", "PAST"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                statusFilter === f
                  ? "bg-[#713600] text-white"
                  : "bg-[#38240D]/10 text-[#38240D] hover:bg-[#38240D]/20"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Events table */}
      <div className="rounded-xl border-2 border-[#38240D] bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-[#38240D]">
          Events ({filtered.length} shown)
        </h3>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#713600]/60">No events match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#38240D]/10 text-left text-xs font-semibold uppercase tracking-wider text-[#C05800]">
                  <th className="pb-3 pr-4">Event</th>
                  <th className="pb-3 pr-4">Organizer</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Tiers</th>
                  <th className="pb-3 pr-4">Sold / Cap</th>
                  <th className="pb-3 pr-4">Sell-Through</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38240D]/10">
                {filtered.map((e) => {
                  const isUpcoming = new Date(e.starts_at) > now;
                  const sellThrough =
                    e.total_capacity > 0
                      ? Math.round((e.total_sold / e.total_capacity) * 100)
                      : 0;

                  return (
                    <tr key={e.id} className="hover:bg-[#FDFBD4]/50">
                      <td className="py-3 pr-4">
                        <div>
                          <Link
                            href={`/events/${e.id}`}
                            className="font-medium text-[#38240D] hover:text-[#713600] hover:underline inline-flex items-center gap-1"
                          >
                            {e.title}
                            <ExternalLink size={11} className="shrink-0 opacity-50" />
                          </Link>
                          {e.venue_name && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-[#713600]/60">
                              <MapPin size={10} className="shrink-0" />{e.venue_name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#38240D]/80">{e.organizer_name}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <p className="flex items-center gap-1 text-xs text-[#713600]/80">
                          <Calendar size={10} className="shrink-0" />{fmtDate(e.starts_at)}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-center text-xs text-[#38240D]/70">
                        {e.tier_count}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#38240D]/80 whitespace-nowrap">
                        {e.total_sold.toLocaleString()} / {e.total_capacity.toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <SellThroughBadge pct={sellThrough} />
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isUpcoming
                              ? "bg-[#10B981]/10 text-[#10B981]"
                              : "bg-[#38240D]/10 text-[#38240D]/60"
                          }`}
                        >
                          {isUpcoming ? "Upcoming" : "Past"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
