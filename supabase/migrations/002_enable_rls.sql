-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin/System can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- EVENTS RLS Policies
-- Anyone can read published events (public discovery)
CREATE POLICY "Anyone can read events"
  ON public.events
  FOR SELECT
  USING (true);

-- Organizers can create events
CREATE POLICY "Organizers can create events"
  ON public.events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ORGANIZER')
    )
  );

-- Organizers can update their own events
CREATE POLICY "Organizers can update own events"
  ON public.events
  FOR UPDATE
  USING (
    organizer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    organizer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Organizers can delete their own events
CREATE POLICY "Organizers can delete own events"
  ON public.events
  FOR DELETE
  USING (
    organizer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- TICKET_TIERS RLS Policies
-- Anyone can read ticket tiers
CREATE POLICY "Anyone can read ticket tiers"
  ON public.ticket_tiers
  FOR SELECT
  USING (true);

-- Organizers can create tiers for their events
CREATE POLICY "Organizers can create ticket tiers"
  ON public.ticket_tiers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (
        organizer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'ADMIN'
        )
      )
    )
  );

-- Organizers can update tiers for their events
CREATE POLICY "Organizers can update ticket tiers"
  ON public.ticket_tiers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (
        organizer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'ADMIN'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (
        organizer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'ADMIN'
        )
      )
    )
  );

-- TICKETS RLS Policies
-- Users can read their own tickets
CREATE POLICY "Users can read own tickets"
  ON public.tickets
  FOR SELECT
  USING (owner_id = auth.uid());

-- Organizers can read tickets for their events
CREATE POLICY "Organizers can read event tickets"
  ON public.tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND organizer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Gatekeepers can read all tickets (for scanning)
CREATE POLICY "Gatekeepers can read all tickets"
  ON public.tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'GATEKEEPER'
    )
  );

-- Users can insert their own tickets (purchases)
CREATE POLICY "Users can create own tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- System can update ticket status (for marking as USED)
CREATE POLICY "Gatekeepers can update ticket status"
  ON public.tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('GATEKEEPER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('GATEKEEPER', 'ADMIN')
    )
  );

-- SCAN_EVENTS RLS Policies (Audit Log - Append Only)
-- Gatekeepers can read their own scans
CREATE POLICY "Gatekeepers can read own scans"
  ON public.scan_events
  FOR SELECT
  USING (gatekeeper_id = auth.uid());

-- Organizers can read scans for their events
CREATE POLICY "Organizers can read event scans"
  ON public.scan_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      INNER JOIN public.events ON events.id = tickets.event_id
      WHERE tickets.id = ticket_id AND events.organizer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Gatekeepers can insert scan events
CREATE POLICY "Gatekeepers can create scan events"
  ON public.scan_events
  FOR INSERT
  WITH CHECK (
    gatekeeper_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'GATEKEEPER'
    )
  );

-- No one can delete scan events (immutable audit log)
CREATE POLICY "No one can delete scan events"
  ON public.scan_events
  FOR DELETE
  USING (false);
