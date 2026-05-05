"use client";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-accent/20 bg-foreground/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
            <p className="text-sm text-foreground/60">System Management</p>
          </div>
          <Button
            onClick={async () => {
              await signOut();
            }}
            variant="outline"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-accent/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex gap-6">
          <Link
            href="/admin"
            className="py-3 px-2 border-b-2 border-primary text-primary font-medium"
          >
            Overview
          </Link>
          <Link
            href="/admin/users"
            className="py-3 px-2 border-b-2 border-transparent hover:border-accent/50 text-foreground/70 transition"
          >
            Users
          </Link>
          <Link
            href="/admin/events"
            className="py-3 px-2 border-b-2 border-transparent hover:border-accent/50 text-foreground/70 transition"
          >
            Events
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">{children}</main>
    </div>
  );
}
