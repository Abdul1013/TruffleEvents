export default function AdminPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-primary mb-2">System Overview</h2>
        <p className="text-foreground/70">
          Monitor EventTruffle platform health and user activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <p className="text-sm text-foreground/60 mb-2">Total Users</p>
          <p className="text-3xl font-bold text-primary">—</p>
          <p className="text-xs text-foreground/50 mt-2">Coming soon</p>
        </div>

        <div className="bg-success/5 border border-success/20 rounded-lg p-6">
          <p className="text-sm text-foreground/60 mb-2">Total Events</p>
          <p className="text-3xl font-bold text-success">—</p>
          <p className="text-xs text-foreground/50 mt-2">Coming soon</p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <p className="text-sm text-foreground/60 mb-2">Tickets Issued</p>
          <p className="text-3xl font-bold text-primary">—</p>
          <p className="text-xs text-foreground/50 mt-2">Coming soon</p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <p className="text-sm text-foreground/60 mb-2">Scans Today</p>
          <p className="text-3xl font-bold text-primary">—</p>
          <p className="text-xs text-foreground/50 mt-2">Coming soon</p>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">User Management</h3>
        <p className="text-foreground/70">
          Create and manage user accounts, assign roles (Admin, Organizer, Attendee, Gatekeeper)
        </p>
        <div className="mt-4 text-sm text-foreground/60">
          Role-based access control enforced via middleware and database RLS policies.
        </div>
      </div>

      {/* Security Logs */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Security</h3>
        <p className="text-foreground/70">
          AES-256-GCM encryption engine, JWT session management, anti-replay scan audits
        </p>
        <div className="mt-4 text-sm text-foreground/60">
          All QR code validations logged to append-only scan_events table.
        </div>
      </div>
    </div>
  );
}
