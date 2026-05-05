export default function AttendeePage() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-3xl font-bold text-primary mb-2">Welcome to EventTruffle</h2>
        <p className="text-foreground/70">
          Discover amazing events, buy tickets, and manage your wallet
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <p className="text-sm text-foreground/60 mb-2">Your Tickets</p>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-xs text-foreground/50 mt-2">Active tickets</p>
        </div>

        <div className="bg-success/5 border border-success/20 rounded-lg p-6">
          <p className="text-sm text-foreground/60 mb-2">Upcoming Events</p>
          <p className="text-3xl font-bold text-success">0</p>
          <p className="text-xs text-foreground/50 mt-2">Events you're attending</p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <p className="text-sm text-foreground/60 mb-2">Saved Events</p>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-xs text-foreground/50 mt-2">Events you want to attend</p>
        </div>
      </div>

      {/* Featured Events */}
      <div>
        <h3 className="text-lg font-semibold text-primary mb-4">Featured Events</h3>
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-12 text-center">
          <p className="text-foreground/70 mb-4">No events available yet</p>
          <p className="text-sm text-foreground/60">
            Check back soon or browse all events
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h4 className="font-semibold text-primary mb-2">🎫 Dynamic QR Codes</h4>
          <p className="text-sm text-foreground/70">
            Your tickets update every 30 seconds with encrypted QR codes for security
          </p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h4 className="font-semibold text-primary mb-2">🔐 AES-256 Protection</h4>
          <p className="text-sm text-foreground/70">
            Military-grade encryption protects your ticket data
          </p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h4 className="font-semibold text-primary mb-2">📲 Mobile Wallet</h4>
          <p className="text-sm text-foreground/70">
            Scan QR codes with any device, works offline with pre-cached hashes
          </p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h4 className="font-semibold text-primary mb-2">⚡ Instant Validation</h4>
          <p className="text-sm text-foreground/70">
            Gatekeepers get instant feedback with color-coded validation states
          </p>
        </div>
      </div>
    </div>
  );
}
