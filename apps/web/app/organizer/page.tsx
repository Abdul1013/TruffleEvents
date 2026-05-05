import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OrganizerPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-primary mb-2">Your Events</h2>
        <p className="text-foreground/70">
          Create, edit, and manage ticket sales for your events
        </p>
      </div>

      {/* Create Event Button */}
      <div>
        <Link href="/organizer/events/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Create New Event
          </Button>
        </Link>
      </div>

      {/* Events List (Empty State) */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-12 text-center">
        <p className="text-foreground/70 mb-4">You haven't created any events yet</p>
        <Link href="/organizer/events/new">
          <Button variant="outline">Get Started</Button>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h3 className="font-semibold text-primary mb-2">Event Setup</h3>
          <p className="text-sm text-foreground/70">
            Create events, set ticket tiers, and upload banners
          </p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h3 className="font-semibold text-primary mb-2">Ticket Management</h3>
          <p className="text-sm text-foreground/70">
            Track inventory, view sales, manage ticket releases
          </p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h3 className="font-semibold text-primary mb-2">Attendee Data</h3>
          <p className="text-sm text-foreground/70">
            View attendee information, export attendee lists
          </p>
        </div>
      </div>
    </div>
  );
}
