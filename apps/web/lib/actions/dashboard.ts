"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/actions/auth";

// ─── Attendee overview ────────────────────────────────────────────────────────

export interface AttendeeStats {
  activeTickets: number;
  upcomingEvents: number;
  attendedEvents: number;
}

export interface FeaturedEvent {
  id: string;
  title: string;
  venue_name: string | null;
  starts_at: string;
  banner_url: string | null;
  fromPrice: number | null;
}

export interface AttendeeOverview {
  stats: AttendeeStats;
  featured: FeaturedEvent[];
}

/**
 * Stats for the signed-in attendee plus a short list of upcoming public events.
 */
export async function getAttendeeOverview(): Promise<
  { success: true; data: AttendeeOverview } | { success: false; error: string }
> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { success: false, error: "Not authenticated" };

    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    // ── The attendee's own tickets (with event start time) ──────────────────
    const { data: rawTickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("status, event_id, events!inner ( starts_at )")
      .eq("owner_id", session.user.id);

    if (ticketsError) {
      console.error("[getAttendeeOverview] tickets:", ticketsError);
      return { success: false, error: "Failed to load your tickets" };
    }

    const now = Date.now();
    let activeTickets = 0;
    let attendedEvents = 0;
    const upcomingEventIds = new Set<string>();

    for (const t of rawTickets || []) {
      const ev = Array.isArray((t as any).events) ? (t as any).events[0] : (t as any).events;
      const startsMs = ev?.starts_at ? new Date(ev.starts_at).getTime() : 0;
      if (t.status === "ACTIVE") {
        activeTickets += 1;
        if (startsMs > now) upcomingEventIds.add((t as any).event_id);
      } else if (t.status === "USED") {
        attendedEvents += 1;
      }
    }

    // ── Featured: nearest upcoming public events ────────────────────────────
    const { data: rawEvents, error: eventsError } = await supabase
      .from("events")
      .select("id, title, venue_name, starts_at, banner_url, ticket_tiers ( price )")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(3);

    if (eventsError) {
      console.error("[getAttendeeOverview] events:", eventsError);
      return { success: false, error: "Failed to load events" };
    }

    const featured: FeaturedEvent[] = (rawEvents || []).map((e: any) => {
      const tiers: any[] = Array.isArray(e.ticket_tiers) ? e.ticket_tiers : [];
      const prices = tiers.map((t) => Number(t.price)).filter((p) => !Number.isNaN(p));
      return {
        id: e.id,
        title: e.title,
        venue_name: e.venue_name,
        starts_at: e.starts_at,
        banner_url: e.banner_url,
        fromPrice: prices.length > 0 ? Math.min(...prices) : null,
      };
    });

    return {
      success: true,
      data: {
        stats: { activeTickets, upcomingEvents: upcomingEventIds.size, attendedEvents },
        featured,
      },
    };
  } catch (err) {
    console.error("[getAttendeeOverview]", err);
    return { success: false, error: "Failed to load dashboard" };
  }
}

// ─── Admin overview ───────────────────────────────────────────────────────────

export interface AdminOverview {
  totalUsers: number;
  totalEvents: number;
  ticketsIssued: number;
  scansToday: number;
}

/**
 * Platform-wide counters for the admin system overview. Requires ADMIN role.
 */
export async function getAdminOverview(): Promise<
  { success: true; data: AdminOverview } | { success: false; error: string }
> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { success: false, error: "Not authenticated" };

    const supabase = await createClient();
    const { data: self } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (!self || self.role !== "ADMIN") return { success: false, error: "Admin access required" };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [usersRes, eventsRes, ticketsRes, scansRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("tickets").select("id", { count: "exact", head: true }),
      supabase
        .from("scan_events")
        .select("id", { count: "exact", head: true })
        .gte("scanned_at", startOfToday.toISOString()),
    ]);

    return {
      success: true,
      data: {
        totalUsers: usersRes.count ?? 0,
        totalEvents: eventsRes.count ?? 0,
        ticketsIssued: ticketsRes.count ?? 0,
        scansToday: scansRes.count ?? 0,
      },
    };
  } catch (err) {
    console.error("[getAdminOverview]", err);
    return { success: false, error: "Failed to load overview" };
  }
}

// ─── Gatekeeper overview ──────────────────────────────────────────────────────

export interface GatekeeperStats {
  validToday: number;
  duplicatesToday: number;
  rejectionsToday: number;
}

/**
 * Today's scan tallies for the signed-in gatekeeper, broken down by result.
 */
export async function getGatekeeperStats(): Promise<
  { success: true; data: GatekeeperStats } | { success: false; error: string }
> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { success: false, error: "Not authenticated" };

    const supabase = await createClient();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("scan_events")
      .select("result")
      .eq("gatekeeper_id", session.user.id)
      .gte("scanned_at", startOfToday.toISOString());

    if (error) {
      console.error("[getGatekeeperStats]", error);
      return { success: false, error: "Failed to load scan stats" };
    }

    let validToday = 0;
    let duplicatesToday = 0;
    let rejectionsToday = 0;
    for (const s of data || []) {
      if (s.result === "VALID") validToday += 1;
      else if (s.result === "DUPLICATE") duplicatesToday += 1;
      else if (s.result === "INVALID") rejectionsToday += 1;
    }

    return { success: true, data: { validToday, duplicatesToday, rejectionsToday } };
  } catch (err) {
    console.error("[getGatekeeperStats]", err);
    return { success: false, error: "Failed to load scan stats" };
  }
}
