"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeedbackToast, useFeedback } from "@/components/FeedbackToast";

export default function Home() {
  const feedback = useFeedback();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-accent/20 py-4 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">
            EventTruffle
          </h1>
          <p className="text-foreground/70 mt-1">
            Secure AES-256-GCM Ticketing & Management
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Theme Showcase */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-6">
              Design System: Chocolate Truffle Palette
            </h2>

            {/* Color Palette */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="space-y-2">
                <div className="w-full h-24 rounded-lg bg-background border-2 border-foreground/20" />
                <p className="text-sm font-medium">Background (Cream)</p>
                <p className="text-xs text-foreground/60">#FDFBD4</p>
              </div>

              <div className="space-y-2">
                <div className="w-full h-24 rounded-lg bg-foreground" />
                <p className="text-sm font-medium">Foreground (Dark Truffle)</p>
                <p className="text-xs text-foreground/60">#38240D</p>
              </div>

              <div className="space-y-2">
                <div className="w-full h-24 rounded-lg bg-primary" />
                <p className="text-sm font-medium">Primary (Rich Brown)</p>
                <p className="text-xs text-foreground/60">#713600</p>
              </div>

              <div className="space-y-2">
                <div className="w-full h-24 rounded-lg bg-accent" />
                <p className="text-sm font-medium">Accent (Burnt Orange)</p>
                <p className="text-xs text-foreground/60">#C05800</p>
              </div>

              <div className="space-y-2">
                <div className="w-full h-24 rounded-lg bg-success" />
                <p className="text-sm font-medium">Success (Valid)</p>
                <p className="text-xs text-foreground/60">#10B981</p>
              </div>

              <div className="space-y-2">
                <div className="w-full h-24 rounded-lg bg-destructive" />
                <p className="text-sm font-medium">Destructive (Invalid)</p>
                <p className="text-xs text-foreground/60">#EF4444</p>
              </div>
            </div>
          </section>

          {/* Components */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-6">
              Interactive Components
            </h2>

            <div className="space-y-6">
              {/* Buttons */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Button Variants
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="default">Default</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>

              {/* Feedback States */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Validation Feedback
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() =>
                      feedback.show(
                        "valid",
                        "Ticket scanned successfully! Ready for entry."
                      )
                    }
                    className="bg-success hover:bg-success/90 text-white"
                  >
                    Show Valid
                  </Button>
                  <Button
                    onClick={() =>
                      feedback.show(
                        "warning",
                        "This ticket has already been scanned."
                      )
                    }
                    className="bg-warning hover:bg-warning/90 text-white"
                  >
                    Show Warning
                  </Button>
                  <Button
                    onClick={() =>
                      feedback.show(
                        "invalid",
                        "QR code invalid or has been tampered with."
                      )
                    }
                    className="bg-destructive hover:bg-destructive/90 text-white"
                  >
                    Show Invalid
                  </Button>
                </div>
              </div>

              {/* Typography */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Typography
                </h3>
                <div className="space-y-3">
                  <p className="text-4xl font-bold">Heading 1</p>
                  <p className="text-2xl font-semibold">Heading 2</p>
                  <p className="text-lg font-medium">Body Text (Medium)</p>
                  <p className="text-base">Body Text (Regular)</p>
                  <p className="text-sm text-foreground/70">Small Text</p>
                </div>
              </div>
            </div>
          </section>

          {/* Apple HIG Features */}
          <section className="bg-accent/5 border-l-4 border-accent p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Apple Human Interface Guidelines
            </h2>
            <ul className="space-y-2 text-foreground/80">
              <li>✓ Minimum 44x44pt touch targets on mobile for accessibility</li>
              <li>✓ Inter font family for clarity and readability</li>
              <li>✓ Haptic feedback on validation state changes</li>
              <li>✓ Color-coded feedback (Green/Amber/Red)</li>
              <li>✓ Subtle animations and transitions</li>
              <li>✓ High contrast between foreground and background</li>
            </ul>
          </section>
        </div>
      </main>

      {/* Feedback Toast */}
      <FeedbackToast
        state={feedback.state}
        message={feedback.message}
        onDismiss={feedback.clear}
      />

      {/* Footer */}
      <footer className="border-t border-accent/20 py-6 px-4 md:px-8 text-center text-sm text-foreground/60">
        <p>EventTruffle Sprint 1 — Infrastructure & Design System</p>
      </footer>
    </div>
  );
}
