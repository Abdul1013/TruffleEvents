"use client";

import { useEffect, useState } from "react";
import { getOrganizerEvents, type OrganizerEventSummary } from "@/lib/actions/events";
import { Calendar, MapPin, Plus, Layers, Ticket } from "lucide-react";
import Link from "next/link";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SellThroughBar({ sold, capacity }: { sold: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;
  const barColor =
    pct >= 80 ? "bg-[#10B981]" :
    pct >= 40 ? "bg-[#F59E0B]" :
    "bg-[#C05800]";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[#38240D]/70">
        <span>{sold.toLocaleString()} sold</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#38240D]/10">
        <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-[#38240D]/50">{capacity.toLocaleString()} capacity</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-xl border-2 border-[#38240D]/10 bg-white p-5 space-y-3">
      <div className="h-5 bg-[#38240D]/10 rounded w-2/3" />
      <div className="h-3 bg-[#38240D]/10 rounded w-1/3" />
      <div className="h-3 bg-[#38240D]/10 rounded w-1/2" />
      <div className="h-8 bg-[#38240D]/10 rounded mt-4" />
    </div>
  );
}

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<OrganizerEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrganizerEvents().then((res) => {
      if (res.success) setEvents(res.events);
      else setError(res.error);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.starts_at) > now);
  const past = events.filter((e) => new Date(e.starts_at) <= now);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-40 animate-pulse rounded bg-[#38240D]/10" />
          <div className="h-10 w-36 animate-pulse rounded-lg bg-[#38240D]/10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <Skeleton key={i} />)}
        </div>
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

  function EventCard({ event }: { event: OrganizerEventSummary }) {
    const isUpcoming = new Date(event.starts_at) > now;

    return (
      <div className="rounded-xl border-2 border-[#38240D] bg-white flex flex-col overflow-hidden">
        {/* Banner / placeholder */}
        <div className="h-32 bg-[#38240D]/5 overflow-hidden shrink-0">
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Ticket size={32} className="text-[#38240D]/20" />
            </div>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col gap-3">
          {/* Status + title */}
          <div>
            <span
              className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                isUpcoming
                  ? "bg-[#10B981]/10 text-[#10B981]"
                  : "bg-[#38240D]/10 text-[#38240D]/60"
              }`}
            >
              {isUpcoming ? "Upcoming" : "Past"}
            </span>
            <h3 className="mt-2 font-semibold text-[#38240D] line-clamp-2">{event.title}</h3>
          </div>

          {/* Date & venue */}
          <div className="space-y-1 text-xs text-[#713600]/70">
            <p className="flex items-center gap-1.5">
              <Calendar size={11} className="text-[#C05800] shrink-0" />
              {fmtDate(event.starts_at)}
            </p>
            {event.venue_name && (
              <p className="flex items-center gap-1.5">
                <MapPin size={11} className="text-[#C05800] shrink-0" />
                <span className="truncate">{event.venue_name}</span>
              </p>
            )}
          </div>

          {/* Tier count */}
          <p className="flex items-center gap-1.5 text-xs text-[#38240D]/60">
            <Layers size={11} className="text-[#C05800] shrink-0" />
            {event.tier_count} ticket tier{event.tier_count !== 1 ? "s" : ""}
          </p>

          {/* Sell-through bar */}
          {event.tier_count > 0 && (
            <SellThroughBar sold={event.total_sold} capacity={event.total_capacity} />
          )}

          {/* Actions */}
          <div className="mt-auto flex gap-2 pt-2">
            <Link
              href={`/organizer/events/${event.id}/tiers`}
              className="flex-1 rounded-lg border-2 border-[#713600] py-2 text-center text-xs font-semibold text-[#713600] hover:bg-[#713600] hover:text-white transition"
            >
              Manage Tiers
            </Link>
            <Link
              href={`/events/${event.id}`}
              className="flex-1 rounded-lg bg-[#38240D]/5 py-2 text-center text-xs font-semibold text-[#38240D] hover:bg-[#38240D]/10 transition"
            >
              View Public
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#38240D]">My Events</h2>
          <p className="mt-1 text-sm text-[#713600]">
            {events.length} event{events.length !== 1 ? "s" : ""} —{" "}
            {upcoming.length} upcoming
          </p>
        </div>
        <Link
          href="/organizer/events/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#713600] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C05800] transition min-h-[44px]"
        >
          <Plus size={16} />
          New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#C05800]/30 py-20 text-center">
          <Ticket size={40} className="mx-auto text-[#38240D]/20 mb-3" />
          <p className="text-[#38240D]/60 mb-4">You haven&apos;t created any events yet.</p>
          <Link
            href="/organizer/events/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#713600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#C05800] transition"
          >
            <Plus size={15} /> Create Your First Event
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#C05800]">
                Upcoming ({upcoming.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#38240D]/50">
                Past ({past.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 opacity-75">
                {past.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
