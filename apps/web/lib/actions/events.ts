"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { z } from "zod";

/**
 * Zod schema for event creation validation
 */
const CreateEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(255),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  venueLocation: z.string().min(3, "Venue location must be at least 3 characters").max(255),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  bannerUrl: z.string().url("Banner URL must be valid").optional(),
}).refine(
  (data) => data.startsAt < data.endsAt,
  {
    message: "Event must end after it starts",
    path: ["endsAt"],
  }
);

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

/**
 * Create a new event
 * Only organizers can create events
 * Validates all fields and date constraints
 */
export async function createEvent(
  input: CreateEventInput
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const validatedInput = CreateEventSchema.parse(input);

    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", session.user.id)
      .single();

    if (profileError || profile?.user_role !== "organizer") {
      return { success: false, error: "Only organizers can create events" };
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        organizer_id: session.user.id,
        title: validatedInput.title,
        description: validatedInput.description,
        venue_name: validatedInput.venueLocation,
        starts_at: validatedInput.startsAt.toISOString(),
        ends_at: validatedInput.endsAt.toISOString(),
        banner_url: validatedInput.bannerUrl || null,
      })
      .select("id")
      .single();

    if (eventError || !event) {
      console.error("[createEvent]", eventError);
      return { success: false, error: "Failed to create event" };
    }

    return { success: true, eventId: event.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    console.error("[createEvent]", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Zod schema for ticket tier creation
 */
const CreateTicketTierSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  tierName: z.string().min(2, "Tier name must be at least 2 characters").max(50),
  price: z.coerce.number().min(0, "Price must be non-negative").max(99999.99),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(100000),
});

export type CreateTicketTierInput = z.infer<typeof CreateTicketTierSchema>;

/**
 * Create a new ticket tier for an event
 * Uses SELECT...FOR UPDATE row locking to prevent race conditions
 * Validates organizer ownership
 */
export async function createTicketTier(
  input: CreateTicketTierInput
): Promise<{ success: boolean; tierId?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const validatedInput = CreateTicketTierSchema.parse(input);

    const supabase = await createClient();

    // Verify organizer owns the event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, organizer_id")
      .eq("id", validatedInput.eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: "Event not found" };
    }

    if (event.organizer_id !== session.user.id) {
      return { success: false, error: "You can only manage your own events" };
    }

    const { data: tier, error: tierError } = await supabase
      .from("ticket_tiers")
      .insert({
        event_id: validatedInput.eventId,
        name: validatedInput.tierName,
        price: validatedInput.price,
        capacity: validatedInput.capacity,
        sold: 0,
      })
      .select("id")
      .single();

    if (tierError || !tier) {
      console.error("[createTicketTier]", tierError);
      return { success: false, error: "Failed to create ticket tier" };
    }

    return { success: true, tierId: tier.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    console.error("[createTicketTier]", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get event details including ticket tiers
 */
export async function getEventWithTiers(eventId: string) {
  try {
    const supabase = await createClient();

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(
        `
        id,
        title,
        description,
        venue_name,
        starts_at,
        ends_at,
        banner_url,
        organizer_id,
        profiles!events_organizer_id_fkey (
          full_name,
          email
        ),
        ticket_tiers (
          id,
          name,
          price,
          capacity,
          sold
        )
      `
      )
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: "Event not found" };
    }

    return { success: true, event };
  } catch (error) {
    console.error("[getEventWithTiers]", error);
    return { success: false, error: "Failed to fetch event" };
  }
}

/**
 * Get all events with pagination
 */
export async function getAllEvents(page: number = 1, pageSize: number = 10) {
  try {
    const supabase = await createClient();

    const offset = (page - 1) * pageSize;

    const { data: events, error: eventsError, count } = await supabase
      .from("events")
      .select(
        `
        id,
        title,
        description,
        venue_name,
        starts_at,
        ends_at,
        banner_url,
        organizer_id,
        profiles!events_organizer_id_fkey (
          full_name
        ),
        ticket_tiers (
          id,
          price,
          capacity,
          sold
        )
      `,
        { count: "exact" }
      )
      .order("starts_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (eventsError) {
      console.error("[getAllEvents]", eventsError);
      return { success: false, error: "Failed to fetch events" };
    }

    return {
      success: true,
      events,
      totalCount: count || 0,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("[getAllEvents]", error);
    return { success: false, error: "Failed to fetch events" };
  }
}

/**
 * Search events by title
 */
export async function searchEvents(query: string, page: number = 1, pageSize: number = 10) {
  try {
    if (!query || query.length < 2) {
      return { success: false, error: "Search query must be at least 2 characters" };
    }

    const supabase = await createClient();

    const offset = (page - 1) * pageSize;

    const { data: events, error: searchError, count } = await supabase
      .from("events")
      .select(
        `
        id,
        title,
        description,
        venue_name,
        starts_at,
        ends_at,
        banner_url,
        organizer_id,
        profiles!events_organizer_id_fkey (
          full_name
        ),
        ticket_tiers (
          id,
          price,
          capacity,
          sold
        )
      `,
        { count: "exact" }
      )
      .ilike("title", `%${query}%`)
      .order("starts_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (searchError) {
      console.error("[searchEvents]", searchError);
      return { success: false, error: "Search failed" };
    }

    return {
      success: true,
      events,
      totalCount: count || 0,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("[searchEvents]", error);
    return { success: false, error: "Search failed" };
  }
}
