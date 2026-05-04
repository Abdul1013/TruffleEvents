-- Create user_role and ticket_status ENUMs
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'ORGANIZER', 'ATTENDEE', 'GATEKEEPER');
CREATE TYPE public.ticket_status AS ENUM ('ACTIVE', 'USED', 'CANCELLED');

-- Create profiles table (linked to Supabase Auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role public.user_role DEFAULT 'ATTENDEE',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  venue_name TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  banner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ticket_tiers table
CREATE TABLE public.ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  capacity INT NOT NULL CHECK (capacity > 0),
  sold INT DEFAULT 0 CHECK (sold >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.ticket_status DEFAULT 'ACTIVE',
  qr_payload_encrypted TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scan_events table (Append Only audit log)
CREATE TABLE public.scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  gatekeeper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK (result IN ('VALID', 'DUPLICATE', 'INVALID')),
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_events_organizer_id ON public.events(organizer_id);
CREATE INDEX idx_ticket_tiers_event_id ON public.ticket_tiers(event_id);
CREATE INDEX idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX idx_tickets_owner_id ON public.tickets(owner_id);
CREATE INDEX idx_tickets_tier_id ON public.tickets(tier_id);
CREATE INDEX idx_scan_events_ticket_id ON public.scan_events(ticket_id);
CREATE INDEX idx_scan_events_gatekeeper_id ON public.scan_events(gatekeeper_id);
CREATE INDEX idx_scan_events_scanned_at ON public.scan_events(scanned_at);
