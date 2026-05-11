import AppHeader from "@/components/AppHeader";

const navLinks = [
  { href: "/organizer", label: "Dashboard" },
  { href: "/organizer/events", label: "Events" },
  { href: "/organizer/analytics", label: "Analytics" },
];

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader title="Organizer" navLinks={navLinks} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
