"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/actions/auth";

// ─── Organizer types ──────────────────────────────────────────────────────────

export interface EventSalesSummary {
  event_id: string;
  title: string;
  starts_at: string;
  total_capacity: number;
  total_sold: number;
  revenue: number;
  sell_through: number; // 0–100 %
}

export interface DailySale {
  date: string; // "YYYY-MM-DD"
  tickets: number;
  revenue: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
}

export interface OrganizerAnalytics {
  events: EventSalesSummary[];
  dailySales: DailySale[];
  statusBreakdown: StatusBreakdown[];
  totals: { revenue: number; sold: number; capacity: number; events: number };
}

// ─── Admin types ──────────────────────────────────────────────────────────────

export interface ScanEventRow {
  id: string;
  result: string;
  scanned_at: string;
  ticket_id: string;
  gatekeeper_email: string;
  gatekeeper_name: string;
}

export interface DailyScanCount {
  date: string;
  valid: number;
  duplicate: number;
  invalid: number;
}

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export interface AdminLogs {
  scanEvents: ScanEventRow[];
  dailyScans: DailyScanCount[];
  users: UserRow[];
  totals: {
    totalUsers: number;
    totalScans: number;
    validScans: number;
    todayScans: number;
  };
}

// ─── Organizer analytics ──────────────────────────────────────────────────────

/**
 * Fetches all analytics data for the authenticated organizer.
 * RLS + explicit organizer_id filter guarantees organizers only see their own data.
 */
export async function getOrganizerAnalytics(): Promise<
  { success: true; data: OrganizerAnalytics } | { success: false; error: string }
> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { success: false, error: "Not authenticated" };

    const supabase = await createClient();

    // Verify role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (!profile || !["ORGANIZER", "ADMIN"].includes(profile.role)) {
      return { success: false, error: "Access denied" };
    }

    // ── Events with tier aggregates ─────────────────────────────────────────
    const { data: rawEvents, error: eventsError } = await supabase
      .from("events")
      .select(
        `id, title, starts_at,
         ticket_tiers ( price, capacity, sold )`
      )
      .eq("organizer_id", session.user.id) // S2-022: hard gate
      .order("starts_at", { ascending: false });

    if (eventsError) {
      console.error("[getOrganizerAnalytics] events:", eventsError);
      return { success: false, error: "Failed to load events" };
    }

    const events: EventSalesSummary[] = (rawEvents || []).map((e: any) => {
      const tiers: any[] = e.ticket_tiers || [];
      const total_capacity = tiers.reduce((s: number, t: any) => s + t.capacity, 0);
      const total_sold = tiers.reduce((s: number, t: any) => s + t.sold, 0);
      const revenue = tiers.reduce(
        (s: number, t: any) => s + t.price * t.sold,
        0
      );
      return {
        event_id: e.id,
        title: e.title,
        starts_at: e.starts_at,
        total_capacity,
        total_sold,
        revenue,
        sell_through:
          total_capacity > 0
            ? Math.round((total_sold / total_capacity) * 100)
            : 0,
      };
    });

    // ── Ticket status breakdown ─────────────────────────────────────────────
    const eventIds = events.map((e) => e.event_id);

    let statusBreakdown: StatusBreakdown[] = [];
    if (eventIds.length > 0) {
      const { data: tickets } = await supabase
        .from("tickets")
        .select("status")
        .in("event_id", eventIds);

      const counts: Record<string, number> = {};
      for (const t of tickets || []) {
        counts[t.status] = (counts[t.status] || 0) + 1;
      }
      statusBreakdown = Object.entries(counts).map(([status, count]) => ({
        status,
        count,
      }));
    }

    // ── Daily ticket sales (last 30 days) ──────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let dailySales: DailySale[] = [];
    if (eventIds.length > 0) {
      const { data: recentTickets } = await supabase
        .from("tickets")
        .select("issued_at, tier_id, ticket_tiers!inner(price)")
        .in("event_id", eventIds)
        .gte("issued_at", thirtyDaysAgo.toISOString());

      const byDay: Record<string, { tickets: number; revenue: number }> = {};
      for (const t of recentTickets || []) {
        const day = t.issued_at.slice(0, 10);
        const price = (t as any).ticket_tiers?.price ?? 0;
        if (!byDay[day]) byDay[day] = { tickets: 0, revenue: 0 };
        byDay[day].tickets += 1;
        byDay[day].revenue += price;
      }
      dailySales = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v }));
    }

    const totals = {
      revenue: events.reduce((s, e) => s + e.revenue, 0),
      sold: events.reduce((s, e) => s + e.total_sold, 0),
      capacity: events.reduce((s, e) => s + e.total_capacity, 0),
      events: events.length,
    };

    return { success: true, data: { events, dailySales, statusBreakdown, totals } };
  } catch (err) {
    console.error("[getOrganizerAnalytics]", err);
    return { success: false, error: "Failed to load analytics" };
  }
}

// ─── Admin user management ───────────────────────────────────────────────────

export interface AdminEventRow {
  id: string;
  title: string;
  venue_name: string;
  starts_at: string;
  ends_at: string;
  organizer_name: string;
  total_capacity: number;
  total_sold: number;
  tier_count: number;
}

const VALID_ROLES = ["ADMIN", "ORGANIZER", "ATTENDEE", "GATEKEEPER"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

/**
 * Returns all profiles for admin user management.
 * Requires ADMIN role.
 */
export async function getAdminUsers(): Promise<
  { success: true; users: UserRow[] } | { success: false; error: string }
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

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: "Failed to load users" };

    return {
      success: true,
      users: (data || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        created_at: u.created_at,
      })),
    };
  } catch (err) {
    console.error("[getAdminUsers]", err);
    return { success: false, error: "Failed to load users" };
  }
}

/**
 * Updates a user's role. Admin only. Prevents self-role change.
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!VALID_ROLES.includes(newRole as ValidRole)) {
      return { success: false, error: "Invalid role" };
    }

    const session = await getSession();
    if (!session?.user?.id) return { success: false, error: "Not authenticated" };
    if (session.user.id === targetUserId) {
      return { success: false, error: "Cannot change your own role" };
    }

    const supabase = await createClient();
    const { data: self } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (!self || self.role !== "ADMIN") return { success: false, error: "Admin access required" };

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", targetUserId);

    if (error) {
      console.error("[updateUserRole]", error);
      return { success: false, error: "Failed to update role" };
    }

    return { success: true };
  } catch (err) {
    console.error("[updateUserRole]", err);
    return { success: false, error: "Failed to update role" };
  }
}

/**
 * Returns all events with organizer and tier summary for admin view.
 * Requires ADMIN role.
 */
export async function getAdminAllEvents(): Promise<
  { success: true; events: AdminEventRow[] } | { success: false; error: string }
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

    const { data, error } = await supabase
      .from("events")
      .select(
        `id, title, venue_name, starts_at, ends_at,
         profiles!events_organizer_id_fkey ( full_name ),
         ticket_tiers ( capacity, sold )`
      )
      .order("starts_at", { ascending: false });

    if (error) {
      console.error("[getAdminAllEvents]", error);
      return { success: false, error: "Failed to load events" };
    }

    const events: AdminEventRow[] = (data || []).map((e: any) => {
      const tiers: any[] = Array.isArray(e.ticket_tiers) ? e.ticket_tiers : [];
      const organizerName = Array.isArray(e.profiles)
        ? e.profiles[0]?.full_name ?? "Unknown"
        : (e.profiles?.full_name ?? "Unknown");
      return {
        id: e.id,
        title: e.title,
        venue_name: e.venue_name,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        organizer_name: organizerName,
        total_capacity: tiers.reduce((s, t) => s + t.capacity, 0),
        total_sold: tiers.reduce((s, t) => s + t.sold, 0),
        tier_count: tiers.length,
      };
    });

    return { success: true, events };
  } catch (err) {
    console.error("[getAdminAllEvents]", err);
    return { success: false, error: "Failed to load events" };
  }
}

// ─── Admin logs ───────────────────────────────────────────────────────────────

/**
 * Fetches global scan_events and profiles for the admin audit log.
 * Requires ADMIN role — RLS also enforces this at the DB layer.
 */
export async function getAdminLogs(): Promise<
  { success: true; data: AdminLogs } | { success: false; error: string }
> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { success: false, error: "Not authenticated" };

    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (!profile || profile.role !== "ADMIN") {
      return { success: false, error: "Admin access required" };
    }

    // ── scan_events (most recent 200) ──────────────────────────────────────
    const { data: rawScans, error: scansError } = await supabase
      .from("scan_events")
      .select(
        `id, result, scanned_at, ticket_id,
         profiles!scan_events_gatekeeper_id_fkey ( email, full_name )`
      )
      .order("scanned_at", { ascending: false })
      .limit(200);

    if (scansError) {
      console.error("[getAdminLogs] scans:", scansError);
      return { success: false, error: "Failed to load scan events" };
    }

    const scanEvents: ScanEventRow[] = (rawScans || []).map((s: any) => ({
      id: s.id,
      result: s.result,
      scanned_at: s.scanned_at,
      ticket_id: s.ticket_id,
      gatekeeper_email: s.profiles?.email ?? "Unknown",
      gatekeeper_name: s.profiles?.full_name ?? "Unknown",
    }));

    // ── Daily scan aggregates (last 14 days) ───────────────────────────────
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: allScans } = await supabase
      .from("scan_events")
      .select("result, scanned_at")
      .gte("scanned_at", fourteenDaysAgo.toISOString());

    const byDay: Record<string, DailyScanCount> = {};
    for (const s of allScans || []) {
      const day = s.scanned_at.slice(0, 10);
      if (!byDay[day])
        byDay[day] = { date: day, valid: 0, duplicate: 0, invalid: 0 };
      const key = s.result.toLowerCase() as "valid" | "duplicate" | "invalid";
      if (key in byDay[day]) byDay[day][key]++;
    }
    const dailyScans = Object.values(byDay).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // ── Profiles (user creation log) ───────────────────────────────────────
    const { data: rawUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (usersError) {
      console.error("[getAdminLogs] users:", usersError);
      return { success: false, error: "Failed to load users" };
    }

    const users: UserRow[] = (rawUsers || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      created_at: u.created_at,
    }));

    // ── Scan totals ────────────────────────────────────────────────────────
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayScans = (allScans || []).filter(
      (s) => s.scanned_at.slice(0, 10) === todayStr
    ).length;
    const totalValid = (allScans || []).filter((s) => s.result === "VALID").length;

    const totals = {
      totalUsers: users.length,
      totalScans: rawScans?.length ?? 0,
      validScans: totalValid,
      todayScans,
    };

    return { success: true, data: { scanEvents, dailyScans, users, totals } };
  } catch (err) {
    console.error("[getAdminLogs]", err);
    return { success: false, error: "Failed to load admin logs" };
  }
}
