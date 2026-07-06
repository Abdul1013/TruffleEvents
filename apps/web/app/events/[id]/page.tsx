"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEventWithTiers } from "@/lib/actions/events";
import { purchaseTicket } from "@/lib/actions/checkout";
import { FeedbackToast } from "@/components/FeedbackToast";
import { Calendar, MapPin, Lock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{
    state: "valid" | "warning" | "invalid";
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getEventWithTiers(eventId);
        if (cancelled) return;
        if (result.success && result.event) {
          setEvent(result.event);
        } else {
          setError(result.error || "Event not found");
        }
      } catch (err) {
        if (!cancelled) setError("Failed to load event");
        console.error("[getEventWithTiers] error:", (err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [eventId]);

  async function handlePurchase() {
    if (!selectedTier) return;

    setPurchasing(true);
    try {
      const result = await purchaseTicket({
        tierId: selectedTier,
        quantity,
      });

      if (result.success) {
        setFeedback({
          state: "valid",
          message: `Successfully purchased ${quantity} ticket${quantity > 1 ? "s" : ""}!`,
        });
        // Redirect to wallet after brief delay
        setTimeout(() => {
          router.push("/attendee/wallet");
        }, 1500);
      } else {
        setFeedback({
          state: "invalid",
          message: result.error || "Purchase failed",
        });
      }
    } catch (err) {
      setFeedback({
        state: "invalid",
        message: "An error occurred during purchase",
      });
      console.error("[purchaseTicket] error:", (err as Error).message);
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBD4]">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 animate-pulse space-y-6">
          <div className="h-64 rounded-lg bg-[#38240D]/10" />
          <div className="space-y-3">
            <div className="h-8 bg-[#38240D]/10 rounded w-3/4" />
            <div className="h-4 bg-[#38240D]/10 rounded w-1/4" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-[#38240D]/10 rounded" />
            <div className="h-4 bg-[#38240D]/10 rounded w-5/6" />
            <div className="h-4 bg-[#38240D]/10 rounded w-4/6" />
          </div>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-[#38240D]/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#FDFBD4] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-[#38240D]/70">{error || "Event not found"}</p>
        <Link
          href="/events"
          className="rounded-lg border-2 border-[#713600] px-6 py-2 font-semibold text-[#713600] hover:bg-[#713600] hover:text-white transition-colors"
        >
          Back to Events
        </Link>
      </div>
    );
  }

  const startDate = new Date(event.starts_at);
  const endDate = new Date(event.ends_at);
  const isUpcoming = startDate > new Date();
  const tiers = event.ticket_tiers || [];

  return (
    <div className="min-h-screen bg-[#FDFBD4] py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
        {/* Feedback Toast */}
        {feedback && (
          <FeedbackToast state={feedback.state} message={feedback.message} />
        )}

        {/* Back Link */}
        <Link href="/events" className="text-[#C05800] hover:underline text-sm">
          ← Back to Events
        </Link>

        {/* Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Banner & Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Banner */}
            {event.banner_url && (
              <div className="w-full h-72 bg-[#38240D]/5 rounded-lg overflow-hidden">
                <img
                  src={event.banner_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Title & Organizer */}
            <div>
              <h1 className="text-4xl font-bold text-[#713600] mb-2">{event.title}</h1>
              <p className="text-[#38240D]/70">
                Organized by <span className="font-medium">{event.profiles?.full_name}</span>
              </p>
            </div>

            {/* Date & Venue */}
            <div className="space-y-2 bg-white border-2 border-[#C05800]/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar size={20} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-[#38240D]/70">Date & Time</p>
                  <p className="font-medium text-[#38240D]">
                    {startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-sm text-[#38240D]/60">
                    to {endDate.toLocaleDateString()} at {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <MapPin size={20} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-[#38240D]/70">Venue</p>
                  <p className="font-medium text-[#38240D]">{event.venue_name}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-[#713600] mb-3">About This Event</h2>
              <p className="text-[#38240D]/70 whitespace-pre-wrap">{event.description}</p>
            </div>
          </div>

          {/* Right: Ticket Purchase */}
          <div className="bg-white border-2 border-[#38240D] rounded-lg p-6 h-fit sticky top-6 space-y-4">
            <h2 className="text-xl font-semibold text-[#713600]">Get Tickets</h2>

            {!isUpcoming && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444] text-[#EF4444] px-3 py-2 rounded text-sm">
                This event has already passed
              </div>
            )}

            {tiers.length === 0 ? (
              <div className="text-[#38240D]/70 py-4 text-center">
                <p>No tickets available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Tier Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#38240D]">Select Ticket Tier</label>
                  <div className="space-y-2">
                    {tiers.map((tier: any) => {
                      const remaining = tier.capacity - tier.sold;
                      const isSoldOut = remaining <= 0;

                      return (
                        <button
                          key={tier.id}
                          onClick={() => !isSoldOut && setSelectedTier(tier.id)}
                          className={`w-full p-3 border-2 rounded-lg text-left transition ${
                            selectedTier === tier.id
                              ? "border-[#713600] bg-[#713600]/10"
                              : "border-[#C05800]/20 hover:border-[#C05800]/50"
                          } ${isSoldOut ? "opacity-50 cursor-not-allowed" : ""}`}
                          disabled={isSoldOut}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-[#38240D]">{tier.name}</p>
                              <p className="text-xs text-[#38240D]/60">
                                {isSoldOut ? "Sold Out" : `${remaining} left`}
                              </p>
                            </div>
                            <p className="font-semibold text-[#713600]">₦{tier.price.toLocaleString()}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity */}
                {selectedTier && (
                  <div>
                    <label className="block text-sm font-medium text-[#38240D] mb-2">Quantity</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-1 border-2 border-[#C05800]/20 rounded hover:bg-[#C05800]/10 text-[#38240D] font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="flex-1 text-center border-2 border-[#C05800]/20 rounded py-1 bg-[#FDFBD4] text-[#38240D] outline-none focus:border-[#713600]"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-3 py-1 border-2 border-[#C05800]/20 rounded hover:bg-[#C05800]/10 text-[#38240D] font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Price Summary */}
                {selectedTier && (
                  <div className="bg-[#FDFBD4] border border-[#C05800]/20 rounded p-3 space-y-2">
                    <div className="flex justify-between text-sm text-[#38240D]">
                      <span>Subtotal:</span>
                      <span>
                        ${(
                          quantity *
                          (tiers.find((t: any) => t.id === selectedTier)?.price || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-[#C05800]/20 pt-2">
                      <span className="text-[#38240D]">Total:</span>
                      <span className="text-[#713600]">
                        ${(
                          quantity *
                          (tiers.find((t: any) => t.id === selectedTier)?.price || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={handlePurchase}
                  disabled={!isUpcoming || !selectedTier || purchasing}
                  className="w-full rounded-lg bg-[#713600] py-3 font-semibold text-white hover:bg-[#C05800] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {!isUpcoming ? "Event Ended" : purchasing ? "Processing..." : "Continue to Checkout"}
                </button>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-background border border-accent/20 rounded-lg p-3 text-xs text-foreground/60 space-y-1.5">
              <p className="flex items-center gap-1.5"><CheckCircle size={12} className="text-success shrink-0" /> Secure AES-256-GCM encrypted</p>
              <p className="flex items-center gap-1.5"><CheckCircle size={12} className="text-success shrink-0" /> 30-second dynamic QR codes</p>
              <p className="flex items-center gap-1.5"><CheckCircle size={12} className="text-success shrink-0" /> No screenshot fraud possible</p>
            </div>
          </div>
        </div>

        {/* Ticket Tiers Info */}
        {tiers.length > 0 && (
          <div className="rounded-xl border-2 border-[#38240D] bg-white p-6">
            <h3 className="text-lg font-semibold text-[#713600] mb-4">Ticket Information</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#38240D]/10 text-left text-xs font-semibold uppercase tracking-wider text-[#C05800]">
                    <th className="pb-3 pr-4">Tier</th>
                    <th className="pb-3 pr-4">Price</th>
                    <th className="pb-3 pr-4">Capacity</th>
                    <th className="pb-3 pr-4">Sold</th>
                    <th className="pb-3">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#38240D]/10">
                  {tiers.map((tier: any) => (
                    <tr key={tier.id} className="hover:bg-[#FDFBD4]/60">
                      <td className="py-2.5 pr-4 font-medium text-[#38240D]">{tier.name}</td>
                      <td className="py-2.5 pr-4 text-[#713600]">₦{tier.price.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-[#38240D]/70">{tier.capacity}</td>
                      <td className="py-2.5 pr-4 text-[#38240D]/70">{tier.sold}</td>
                      <td className={`py-2.5 font-semibold ${tier.capacity - tier.sold <= 0 ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                        {Math.max(0, tier.capacity - tier.sold)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
