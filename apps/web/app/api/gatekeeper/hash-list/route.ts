import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/gatekeeper/hash-list
 *
 * Returns all ACTIVE ticket IDs for events starting today (UTC).
 * Requires GATEKEEPER or ADMIN role. Used by the client-side
 * syncHashList() to pre-populate IndexedDB for offline validation.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["GATEKEEPER", "ADMIN"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch ACTIVE tickets for events happening today or in the future
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(
        `
        id,
        events!inner (
          title,
          starts_at
        )
      `
      )
      .eq("status", "ACTIVE")
      .gte("events.starts_at", todayUTC.toISOString())
      .order("id");

    if (ticketsError) {
      console.error("[/api/gatekeeper/hash-list] ticketsError:", ticketsError?.message);
      return NextResponse.json({ error: "Failed to fetch hash list" }, { status: 500 });
    }

    const now = Date.now();
    const hashList = (tickets || []).map((t: any) => ({
      ticket_id: t.id,
      event_title: t.events?.title ?? "Unknown Event",
      synced_at: now,
    }));

    return NextResponse.json({ hashList, count: hashList.length, synced_at: now });
  } catch (error) {
    console.error("[/api/gatekeeper/hash-list] error:", (error as Error).message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
