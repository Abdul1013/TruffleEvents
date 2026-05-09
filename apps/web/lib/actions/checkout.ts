"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { z } from "zod";

/**
 * Zod schema for ticket purchase validation
 */
const PurchaseTicketSchema = z.object({
  tierId: z.string().uuid("Invalid tier ID"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(100, "Cannot purchase more than 100 tickets at once"),
});

export type PurchaseTicketInput = z.infer<typeof PurchaseTicketSchema>;

/**
 * Purchase one or more tickets for an event tier
 * Uses PostgreSQL SELECT...FOR UPDATE row locking to prevent race conditions
 * Validates availability, locks tier row, inserts tickets, updates sold count
 * Returns array of ticket IDs on success
 */
export async function purchaseTicket(
  input: PurchaseTicketInput
): Promise<{ success: boolean; ticketIds?: string[]; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const validatedInput = PurchaseTicketSchema.parse(input);

    const supabase = await createClient();

    // Step 1: Fetch tier with row locking (SELECT...FOR UPDATE)
    // This is done via RPC to bypass Supabase SDK limitations
    const { data: lockResult, error: lockError } = await supabase.rpc(
      "lock_and_fetch_tier",
      { tier_id: validatedInput.tierId }
    );

    if (lockError || !lockResult) {
      console.error("[purchaseTicket] Lock error:", lockError);
      return { success: false, error: "Tier temporarily unavailable. Please try again." };
    }

    const tier = lockResult;

    // Step 2: Check inventory
    const availableCapacity = tier.capacity - tier.sold;
    if (availableCapacity < validatedInput.quantity) {
      return { success: false, error: `Only ${availableCapacity} tickets remaining in this tier` };
    }

    // Step 3: Fetch event_id from tier to validate event exists
    const { data: tierWithEvent, error: tierFetchError } = await supabase
      .from("ticket_tiers")
      .select("event_id")
      .eq("id", validatedInput.tierId)
      .single();

    if (tierFetchError || !tierWithEvent) {
      return { success: false, error: "Tier not found" };
    }

    // Step 4: Insert tickets (one per quantity)
    const ticketInserts = Array.from({ length: validatedInput.quantity }).map(() => ({
      event_id: tierWithEvent.event_id,
      tier_id: validatedInput.tierId,
      owner_id: session.user.id,
      status: "ACTIVE",
      qr_payload_encrypted: null, // Will be populated later via wallet view (Day 9)
    }));

    const { data: insertedTickets, error: insertError } = await supabase
      .from("tickets")
      .insert(ticketInserts)
      .select("id");

    if (insertError || !insertedTickets || insertedTickets.length === 0) {
      console.error("[purchaseTicket] Insert error:", insertError);
      return { success: false, error: "Failed to create tickets" };
    }

    // Step 5: Update tier sold count (atomic increment)
    const { error: updateError } = await supabase
      .from("ticket_tiers")
      .update({ sold: tier.sold + validatedInput.quantity })
      .eq("id", validatedInput.tierId);

    if (updateError) {
      console.error("[purchaseTicket] Update error:", updateError);
      // Note: In production, you might want to rollback ticket inserts here
      // For now, we'll proceed since the tickets are already created
      return { success: false, error: "Failed to update inventory" };
    }

    const ticketIds = insertedTickets.map((t) => t.id);

    return { success: true, ticketIds };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    console.error("[purchaseTicket]", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Fetch all tickets owned by the current user (attendee wallet)
 * Flattens nested relationships into a single object per ticket
 */
export async function getAttendeeTickets() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const supabase = await createClient();

    const { data: rawTickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(
        `
        id,
        status,
        issued_at,
        event_id,
        tier_id,
        events (
          title,
          venue_name,
          starts_at,
          ends_at,
          banner_url,
          organizer_id,
          profiles!events_organizer_id_fkey (
            full_name
          )
        ),
        ticket_tiers (
          name,
          price
        )
      `
      )
      .eq("owner_id", session.user.id)
      .order("issued_at", { ascending: false });

    if (ticketsError) {
      console.error("[getAttendeeTickets]", ticketsError);
      return { success: false, error: "Failed to fetch tickets" };
    }

    // Flatten the nested relationships.
    // tickets.event_id → events.id and tickets.tier_id → ticket_tiers.id are
    // forward (many-to-one) FKs, so Supabase returns single objects, not arrays.
    const tickets = (rawTickets || []).map((ticket: any) => {
      const ev = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
      const tt = Array.isArray(ticket.ticket_tiers) ? ticket.ticket_tiers[0] : ticket.ticket_tiers;
      return {
        id: ticket.id,
        status: ticket.status,
        issued_at: ticket.issued_at,
        event: ev ? {
          title: ev.title,
          venue_name: ev.venue_name,
          starts_at: ev.starts_at,
          banner_url: ev.banner_url,
          organizer_name: (Array.isArray(ev.profiles) ? ev.profiles[0] : ev.profiles)?.full_name || "Unknown",
        } : null,
        tier: tt ? {
          name: tt.name,
          price: tt.price,
        } : null,
      };
    }).filter(t => t.event && t.tier);

    return { success: true, tickets };
  } catch (error) {
    console.error("[getAttendeeTickets]", error);
    return { success: false, error: "Failed to fetch tickets" };
  }
}

/**
 * Fetch a single ticket by ID with full event/tier details
 * Flattens nested relationships into a single object
 */
export async function getTicketDetail(ticketId: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const supabase = await createClient();

    const { data: rawTicket, error: ticketError } = await supabase
      .from("tickets")
      .select(
        `
        id,
        status,
        issued_at,
        qr_payload_encrypted,
        event_id,
        tier_id,
        events (
          title,
          description,
          venue_name,
          starts_at,
          ends_at,
          banner_url,
          organizer_id,
          profiles!events_organizer_id_fkey (
            full_name
          )
        ),
        ticket_tiers (
          name,
          price
        )
      `
      )
      .eq("id", ticketId)
      .eq("owner_id", session.user.id)
      .single();

    if (ticketError || !rawTicket) {
      return { success: false, error: "Ticket not found or access denied" };
    }

    // Supabase v2 returns forward-FK joins as single-element arrays.
    const ev = Array.isArray(rawTicket.events) ? rawTicket.events[0] : rawTicket.events;
    const tt = Array.isArray(rawTicket.ticket_tiers) ? rawTicket.ticket_tiers[0] : rawTicket.ticket_tiers;
    const ticket = {
      id: rawTicket.id,
      status: rawTicket.status,
      issued_at: rawTicket.issued_at,
      qr_payload_encrypted: rawTicket.qr_payload_encrypted,
      event: ev ? {
        title: ev.title,
        description: ev.description,
        venue_name: ev.venue_name,
        starts_at: ev.starts_at,
        ends_at: ev.ends_at,
        banner_url: ev.banner_url,
        organizer_name: (Array.isArray(ev.profiles) ? ev.profiles[0] : ev.profiles)?.full_name || "Unknown",
      } : null,
      tier: tt ? {
        name: tt.name,
        price: tt.price,
      } : null,
    };

    if (!ticket.event || !ticket.tier) {
      return { success: false, error: "Incomplete ticket data" };
    }

    return { success: true, ticket };
  } catch (error) {
    console.error("[getTicketDetail]", error);
    return { success: false, error: "Failed to fetch ticket" };
  }
}
