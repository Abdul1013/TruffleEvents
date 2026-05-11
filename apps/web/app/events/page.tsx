"use client";

import { useEffect, useState } from "react";
import { getAllEvents, searchEvents } from "@/lib/actions/events";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin } from "lucide-react";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pageSize = 10;

  useEffect(() => {
    loadEvents();
  }, [currentPage, searchQuery]);

  async function loadEvents() {
    setLoading(true);
    setError("");

    try {
      let result;
      if (searchQuery.trim()) {
        result = await searchEvents(searchQuery, currentPage, pageSize);
      } else {
        result = await getAllEvents(currentPage, pageSize);
      }

      if (result.success) {
        setEvents(result.events || []);
        setTotalCount(result.totalCount || 0);
        setTotalPages(result.totalPages || 1);
      } else {
        setError(result.error || "Failed to load events");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-primary mb-2">Discover Events</h1>
          <p className="text-foreground/70">Find and book tickets for exciting events</p>
        </div>

        {/* Search */}
        <div>
          <Input
            type="text"
            placeholder="Search events by title..."
            value={searchQuery}
            onChange={handleSearch}
            className="max-w-md"
          />
          {searchQuery && (
            <p className="text-sm text-foreground/60 mt-2">
              Found {totalCount} result{totalCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-accent/5 border border-accent/20 rounded-lg">
            <p className="text-foreground/70 mb-4">No events found</p>
            <p className="text-sm text-foreground/50">Try adjusting your search or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: any) => {
              const startDate = new Date(event.starts_at);
              const endDate = new Date(event.ends_at);
              const isUpcoming = startDate > new Date();
              const availableTiers = event.ticket_tiers || [];
              const allSoldOut = availableTiers.every((t: any) => t.sold >= t.capacity);

              return (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="border border-accent/20 rounded-lg overflow-hidden hover:border-accent/50 hover:shadow-lg transition h-full flex flex-col">
                    {/* Banner */}
                    {event.banner_url && (
                      <div className="w-full h-40 bg-foreground/5 overflow-hidden">
                        <img
                          src={event.banner_url}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">
                      {/* Status Badge */}
                      <div className="flex gap-2 mb-2">
                        {!isUpcoming && (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                            Past Event
                          </span>
                        )}
                        {allSoldOut && (
                          <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded">
                            Sold Out
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-primary mb-1 line-clamp-2">
                        {event.title}
                      </h3>

                      {/* Organizer */}
                      <p className="text-xs text-foreground/60 mb-3">
                        by {event.profiles?.full_name || "Unknown"}
                      </p>

                      {/* Date & Venue */}
                      <div className="text-xs text-foreground/70 space-y-1 mb-3 flex-1">
                        <p className="flex items-center gap-1.5"><Calendar size={12} className="text-accent shrink-0" />{startDate.toLocaleDateString()}</p>
                        <p className="flex items-center gap-1.5"><MapPin size={12} className="text-accent shrink-0" />{event.venue_name}</p>
                      </div>

                      {/* Price Range */}
                      {availableTiers.length > 0 && (
                        <div className="text-sm font-medium text-primary">
                          From ${Math.min(...availableTiers.map((t: any) => t.price)).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="p-4 border-t border-accent/20">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={!isUpcoming || allSoldOut}
                      >
                        {allSoldOut ? "Sold Out" : "View Details"}
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            <div className="text-sm text-foreground/70">
              Page {currentPage} of {totalPages}
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
