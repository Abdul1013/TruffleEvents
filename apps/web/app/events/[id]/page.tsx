"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getEventWithTiers } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    try {
      const result = await getEventWithTiers(eventId);
      if (result.success && result.event) {
        setEvent(result.event);
      } else {
        setError(result.error || "Event not found");
      }
    } catch (err) {
      setError("Failed to load event");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading event...</div>;
  }

  if (!event) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 text-center">
        <p className="text-foreground/70 mb-4">{error || "Event not found"}</p>
        <Link href="/events">
          <Button variant="outline">Back to Events</Button>
        </Link>
      </div>
    );
  }

  const startDate = new Date(event.starts_at);
  const endDate = new Date(event.ends_at);
  const isUpcoming = startDate > new Date();
  const tiers = event.ticket_tiers || [];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
        {/* Back Link */}
        <Link href="/events" className="text-accent hover:underline text-sm">
          ← Back to Events
        </Link>

        {/* Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Banner & Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Banner */}
            {event.banner_url && (
              <div className="w-full h-72 bg-foreground/5 rounded-lg overflow-hidden">
                <img
                  src={event.banner_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Title & Organizer */}
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">{event.title}</h1>
              <p className="text-foreground/70">
                Organized by <span className="font-medium">{event.profiles?.full_name}</span>
              </p>
            </div>

            {/* Date & Venue */}
            <div className="space-y-2 bg-accent/5 border border-accent/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-sm text-foreground/70">Date & Time</p>
                  <p className="font-medium">
                    {startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-sm text-foreground/60">
                    to {endDate.toLocaleDateString()} at {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-sm text-foreground/70">Venue</p>
                  <p className="font-medium">{event.venue_name}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-primary mb-3">About This Event</h2>
              <p className="text-foreground/70 whitespace-pre-wrap">{event.description}</p>
            </div>
          </div>

          {/* Right: Ticket Purchase */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-6 h-fit sticky top-6 space-y-4">
            <h2 className="text-xl font-semibold text-primary">Get Tickets</h2>

            {!isUpcoming && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded text-sm">
                This event has already passed
              </div>
            )}

            {tiers.length === 0 ? (
              <div className="text-foreground/70 py-4 text-center">
                <p>No tickets available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Tier Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Select Ticket Tier</label>
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
                              ? "border-primary bg-primary/10"
                              : "border-accent/20 hover:border-accent/50"
                          } ${isSoldOut ? "opacity-50 cursor-not-allowed" : ""}`}
                          disabled={isSoldOut}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{tier.name}</p>
                              <p className="text-xs text-foreground/60">
                                {isSoldOut ? "Sold Out" : `${remaining} left`}
                              </p>
                            </div>
                            <p className="font-semibold text-primary">${tier.price.toFixed(2)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity */}
                {selectedTier && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Quantity</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-1 border border-accent/20 rounded hover:bg-accent/10"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="flex-1 text-center border border-accent/20 rounded py-1"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-3 py-1 border border-accent/20 rounded hover:bg-accent/10"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Price Summary */}
                {selectedTier && (
                  <div className="bg-background border border-accent/20 rounded p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>
                        ${(
                          quantity *
                          (tiers.find((t: any) => t.id === selectedTier)?.price || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-accent/20 pt-2">
                      <span>Total:</span>
                      <span className="text-primary">
                        ${(
                          quantity *
                          (tiers.find((t: any) => t.id === selectedTier)?.price || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* CTA Buttons */}
                <Button
                  disabled={!isUpcoming || !selectedTier}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {!isUpcoming ? "Event Ended" : "Continue to Checkout"}
                </Button>

                <Button variant="outline" className="w-full">
                  Add to Wishlist
                </Button>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-background border border-accent/20 rounded p-3 text-xs text-foreground/60 space-y-1">
              <p>✓ Secure AES-256-GCM encrypted</p>
              <p>✓ 30-second dynamic QR codes</p>
              <p>✓ No screenshot fraud</p>
            </div>
          </div>
        </div>

        {/* Ticket Tiers Info */}
        {tiers.length > 0 && (
          <div className="border border-accent/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Ticket Information</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent/20">
                    <th className="text-left py-2">Tier</th>
                    <th className="text-left py-2">Price</th>
                    <th className="text-left py-2">Capacity</th>
                    <th className="text-left py-2">Sold</th>
                    <th className="text-left py-2">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier: any) => (
                    <tr key={tier.id} className="border-b border-accent/20">
                      <td className="py-2">{tier.name}</td>
                      <td>${tier.price.toFixed(2)}</td>
                      <td>{tier.capacity}</td>
                      <td>{tier.sold}</td>
                      <td className={tier.capacity - tier.sold <= 0 ? "text-destructive" : ""}>
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
