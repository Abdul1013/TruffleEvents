"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { validateEncryptedQR } from "@/lib/api/security-client";

const ScanInputSchema = z.object({
  rawQr: z.string().min(1, "QR payload cannot be empty"),
});

export type ValidationOutcome = "valid" | "duplicate" | "invalid";

export interface ScanValidationResult {
  outcome: ValidationOutcome;
  detail: string;
  ticketId?: string;
}

/**
 * Validate a QR code scanned by a Gatekeeper.
 *
 * Pipeline:
 * 1. Authenticate caller and assert GATEKEEPER or ADMIN role.
 * 2. Forward raw QR to Python /validate (AES-256-GCM tag check + 30 s TTL).
 * 3. On Python success, query scan_events for existing VALID entry (anti-replay).
 * 4. New scan  → insert VALID record, mark ticket USED, return "valid".
 *    Duplicate → insert DUPLICATE record, return "duplicate".
 *    Bad crypto → no DB write (no ticket_id), return "invalid".
 */
export async function validateScannedQR(
  rawQr: string
): Promise<ScanValidationResult> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { outcome: "invalid", detail: "Not authenticated" };
    }

    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || !["GATEKEEPER", "ADMIN"].includes(profile.role)) {
      return { outcome: "invalid", detail: "Access denied. Gatekeeper role required." };
    }

    const { rawQr: qr } = ScanInputSchema.parse({ rawQr });

    // ── Step 2: Python decryption + TTL check ────────────────────────────────
    const pyResult = await validateEncryptedQR(qr);

    if (!pyResult.valid || !pyResult.ticket_id) {
      return {
        outcome: "invalid",
        detail: pyResult.reason || "QR code is invalid or expired",
      };
    }

    const ticketId = pyResult.ticket_id;

    // ── Step 3: Anti-replay — check for an existing VALID scan ───────────────
    const { data: existingScan } = await supabase
      .from("scan_events")
      .select("id, scanned_at")
      .eq("ticket_id", ticketId)
      .eq("result", "VALID")
      .maybeSingle();

    if (existingScan) {
      await supabase.from("scan_events").insert({
        ticket_id: ticketId,
        gatekeeper_id: session.user.id,
        result: "DUPLICATE",
      });

      const scannedTime = new Date(existingScan.scanned_at).toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" }
      );
      return {
        outcome: "duplicate",
        detail: `Already admitted at ${scannedTime}. Do not allow entry.`,
        ticketId,
      };
    }

    // ── Step 4: First valid scan — record and allow entry ────────────────────
    const { error: insertError } = await supabase.from("scan_events").insert({
      ticket_id: ticketId,
      gatekeeper_id: session.user.id,
      result: "VALID",
    });

    if (insertError) {
      console.error("[validateScannedQR] insert error:", insertError);
      return { outcome: "invalid", detail: "Failed to record scan. Try again." };
    }

    // Mark ticket as USED so wallet reflects admission
    await supabase
      .from("tickets")
      .update({ status: "USED" })
      .eq("id", ticketId);

    return {
      outcome: "valid",
      detail: "Ticket verified. Allow entry.",
      ticketId,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { outcome: "invalid", detail: "Malformed QR code" };
    }
    console.error("[validateScannedQR]", error);
    return { outcome: "invalid", detail: "Validation service unavailable" };
  }
}
