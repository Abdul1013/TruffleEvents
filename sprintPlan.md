***

# EventTruffle Development Sprint Plan

> **Developer:** Solo | **Duration:** 28 days (4 sprints × 7 days) 
> **Stack:** Next.js 14 (TypeScript) + Supabase (PostgreSQL/Auth) + Python 3.12 (FastAPI)[cite: 1]
> **Design System:** Apple HIG + "Chocolate Truffle" Palette[cite: 1]

---

## How to Use This Plan

Each day has **2 task slots** (AM and PM). Each task includes the files to create/modify, acceptance criteria, and documentation requirements. Mark tasks `[x]` as you complete them. Every sprint ends with a **deliverable checklist** that must be fully green before moving on. There is no room for "productive procrastination."

---

## Sprint 1 — Infrastructure, Security Core & Theme (Days 1–7)

**Goal:** Establish the monolithic Next.js repository, configure Supabase schemas with strict RLS, build the isolated Python AES-256-GCM engine, and implement the Chocolate Truffle design system[cite: 1]. 

**Entry Criteria:** GitHub repo initialized, Vercel/Render accounts ready.

### Day 1 — Project Scaffolding & Database Schema

**AM — Next.js & Supabase Config**
- [ ] `S1-001` Initialize Next.js 14 App Router project with Tailwind and TypeScript[cite: 1].
- [ ] `S1-002` Install Supabase SSR client: `@supabase/ssr`, `@supabase/supabase-js`.
- [ ] `S1-003` Create `apps/web/lib/supabase/server.ts` and `client.ts` for safe database access.
- [ ] `S1-004` Secure `.env.local` — add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**PM — PostgreSQL Schema & RLS**
- [ ] `S1-005` Write Supabase SQL migration for `profiles` (Auth link) and `user_role` ENUM[cite: 1].
- [ ] `S1-006` Write SQL for `events`, `ticket_tiers`, `tickets`, and `scan_events` (Append Only) tables[cite: 1].
- [ ] `S1-007` Implement strict Row Level Security (RLS) policies. Attendees can only read their own tickets; Organizers can only read their own events[cite: 1].

**Acceptance:** Next.js compiles. Supabase schema deployed with active RLS preventing unauthorized queries.

---

### Day 2 — Python Security Engine (Part 1)

**AM — FastAPI Scaffolding**
- [ ] `S1-008` Initialize Python backend: `apps/security-engine/`.
- [ ] `S1-009` Create `requirements.txt`: `fastapi`, `uvicorn`, `cryptography`, `pydantic`.
- [ ] `S1-010` Implement `main.py` with strict CORS allowing only the Next.js frontend URL[cite: 1].

**PM — AES-256-GCM Implementation**
- [ ] `S1-011` Create `crypto_service.py` using `cryptography.hazmat.primitives.ciphers.aead.AESGCM`[cite: 1].
- [ ] `S1-012` Implement `generate_qr_payload` function: concatenates `ticket_id`, truncated HMAC `user_hash`, and `timestamp_ms`[cite: 1].
- [ ] `S1-013` Write unit tests verifying that modifying a single bit throws an `InvalidTag` exception[cite: 1].

**Acceptance:** Python service boots. Encryption unit tests pass and correctly reject tampered ciphertexts.

---

### Day 3 — Python Security Engine (Part 2) & API Routes

**AM — Engine Endpoints**
- [ ] `S1-014` Create `POST /encrypt` route. Accepts JSON payload, returns Base64url (IV + Ciphertext + Tag)[cite: 1].
- [ ] `S1-015` Create `POST /validate` route. Decrypts payload, verifies the 30s TTL timestamp, returns Boolean[cite: 1].
- [ ] `S1-016` Add Pydantic schemas for request/response validation.

**PM — Next.js API Client**
- [ ] `S1-017` Create `apps/web/lib/api/security-client.ts`.
- [ ] `S1-018` Implement `fetchEncryptedToken(ticketId, userId)` wrapper to call the Python engine securely from the Next.js server actions[cite: 1].

**Acceptance:** Next.js can successfully ping the Python engine and receive an encrypted string.

---

### Day 4 — Theme System: Chocolate Truffle & Apple HIG

**AM — Color & Typography**
- [ ] `S1-019` Modify `tailwind.config.ts`. Map `background` to `#FDFBD4`, `foreground` to `#38240D`, `primary` to `#713600`, and `accent` to `#C05800`[cite: 1].
- [ ] `S1-020` Import SF Pro (or Inter as fallback) to match Apple HIG clarity principles[cite: 1].

**PM — Base UI Components**
- [ ] `S1-021` Install `shadcn/ui` components: `button`, `card`, `input`, `dialog`, `toast`.
- [ ] `S1-022` Override shadcn defaults to enforce 44x44 points minimum touch targets for mobile[cite: 1].
- [ ] `S1-023` Create custom `FeedbackToast` component for the Green/Amber/Red validation states[cite: 1].

**Acceptance:** Tailwind perfectly reflects the Truffle palette. Buttons pass 44px touch target rules.

---

### Day 5 — Authentication Flows

**AM — Supabase Auth Integration**
- [ ] `S1-024` Build `/login` and `/register` pages using Supabase SSR[cite: 1].
- [ ] `S1-025` Implement Auth server actions to handle JWT cookie setting.

**PM — Role Routing**
- [ ] `S1-026` Create `middleware.ts` to route users based on their DB role (Admin, Organizer, Attendee, Gatekeeper)[cite: 1].
- [ ] `S1-027` Create base dashboard layouts for all four roles.

**Acceptance:** User can register, gets assigned "Attendee" by default, and is routed to the Attendee dashboard.

---

### Day 6 — Event Discovery & CRUD

**AM — Organizer Event Management**
- [ ] `S1-028` Build `/organizer/events/new`. Implement Server Actions to write to `events` and `ticket_tiers` tables[cite: 1].
- [ ] `S1-029` Integrate Supabase Storage for event banner uploads[cite: 1].

**PM — Attendee Event Feed**
- [ ] `S1-030` Build public `/events` listing page.
- [ ] `S1-031` Build `/events/[id]` detail page with ticket tier selection.

**Acceptance:** Organizer can create an event; Attendee can view it on the feed.

---

### Day 7 — Sprint 1 Cleanup & Verification

**AM — Integration Checks**
- [ ] `S1-032` Verify RLS policies: Ensure Attendees cannot mutate events.
- [ ] `S1-033` Verify Python engine error handling returns structured JSON, not stack traces.

**PM — Code Review & Git**
- [ ] `S1-034` Clear dead code.
- [ ] `S1-035` Git commit: `feat: Sprint 1 — infra, AES engine, auth, theme, and event CRUD`.

### Sprint 1 Deliverable Checklist
- [ ] Supabase schema deployed with RLS active[cite: 1].
- [ ] Python AES-256-GCM engine running with `/encrypt` and `/validate` routes[cite: 1].
- [ ] Tailwind configured with Chocolate Truffle palette[cite: 1].
- [ ] 4-Role Authentication routing functional[cite: 1].
- [ ] Event CRUD operations working[cite: 1].

---

## Sprint 2 — Booking, Dynamic QR & Gate Scanner (Days 8–14)

**Goal:** Build the ticket purchasing flow, implement the 30-second TTL dynamic QR wallet, and create the core HTML5 camera scanner for Gatekeepers[cite: 1].

### Day 8 — Ticket Purchase Flow

**AM — Booking Logic**
- [ ] `S2-001` Build checkout action. Implement PostgreSQL `SELECT ... FOR UPDATE` to lock rows and prevent overselling of ticket tiers[cite: 1].
- [ ] `S2-002` On successful lock, insert record into `tickets` table[cite: 1].

**PM — Wallet UI**
- [ ] `S2-003` Build `/attendee/wallet`. Query Supabase for purchased tickets.
- [ ] `S2-004` Build `/attendee/wallet/[ticketId]` skeleton.

**Acceptance:** User can purchase a ticket, inventory decrements safely, ticket appears in wallet.

---

### Day 9 — The Dynamic QR Implementation

**AM — The 30-Second Loop**
- [ ] `S2-005` Implement `useDynamicQR` hook in Next.js[cite: 1].
- [ ] `S2-006` Hook must `setInterval` every 30 seconds to fetch a freshly timestamped encrypted payload from the Python engine (via Next.js API route)[cite: 1].

**PM — QR Rendering**
- [ ] `S2-007` Install `qrcode.react`.
- [ ] `S2-008` Render the fetched Base64url ciphertext as a visual QR code on the wallet page[cite: 1].

**Acceptance:** QR code changes visually every 30 seconds without page refresh.

---

### Day 10 — Gatekeeper Scanner UI

**AM — Camera Integration**
- [ ] `S2-009` Build `/gatekeeper/scan` page.
- [ ] `S2-010` Integrate `html5-qrcode` to access device camera and parse QR data[cite: 1].

**PM — UX & Haptics**
- [ ] `S2-011` Implement `navigator.vibrate()` for scan feedback[cite: 1].
- [ ] `S2-012` Build the full-screen overlay for Green (Valid), Amber (Duplicate), Red (Invalid)[cite: 1].

**Acceptance:** Camera opens, scans QR, logs the raw Base64url string to the console.

---

### Day 11 — Server-Side Validation & Anti-Replay

**AM — Decryption Pipeline**
- [ ] `S2-013` Connect scanner output to a Next.js Server Action, which forwards to Python `/validate`[cite: 1].
- [ ] `S2-014` Ensure Python rejects payload if `current_time - timestamp > 30s`[cite: 1].

**PM — Anti-Replay DB Logic**
- [ ] `S2-015` On Python success, query `scan_events` table for `ticket_id`[cite: 1].
- [ ] `S2-016` If exists: return Amber (Duplicate). If new: insert to `scan_events` and return Green (Valid)[cite: 1].

**Acceptance:** Scanning a live QR turns screen Green. Scanning it 5 seconds later turns screen Amber. Scanning a screenshot after 30 seconds turns screen Red.

---

### Day 12 — PWA & Offline Pre-caching

**AM — Service Worker Setup**
- [ ] `S2-017` Configure `next-pwa` in `next.config.js`[cite: 1].
- [ ] `S2-018` Create `manifest.json` with Truffle palette theme colors[cite: 1].

**PM — Offline Gatekeeper Caching**
- [ ] `S2-019` Build `syncHashList` function. Downloads all valid ticket hashes for the day to browser `IndexedDB`[cite: 1].
- [ ] `S2-020` Modify validation logic: if `navigator.onLine` is false, check IndexedDB instead of Supabase[cite: 1].

**Acceptance:** App is installable on mobile. Scanner validates tickets while phone is in Airplane mode.

---

### Day 13 — Analytics Dashboards

**AM — Organizer Analytics**
- [ ] `S2-021` Build Organizer dashboard charts (tickets sold, revenue) using `recharts`[cite: 1].
- [ ] `S2-022` Ensure data is gated strictly to the organizer's `event_id`[cite: 1].

**PM — Admin Audit Log**
- [ ] `S2-023` Build Admin `/admin/logs` view.
- [ ] `S2-024` Fetch and display all global `scan_events` and user creation logs[cite: 1].

**Acceptance:** Dashboards render accurate data securely.

---

### Day 14 — Sprint 2 Integration & Verification

**AM — E2E Journey**
- [ ] `S2-025` Test: Buy ticket -> View QR -> Wait 35s -> Scan -> Fails (Red). Wait for refresh -> Scan -> Succeeds (Green)[cite: 1].

**PM — Cleanup**
- [ ] `S2-026` Git commit: `feat: Sprint 2 — dynamic QR, scanner, validation, and PWA`.

### Sprint 2 Deliverable Checklist
- [ ] Row-level lock purchasing works[cite: 1].
- [ ] QR code regenerates every 30s[cite: 1].
- [ ] Scanner interface operational with haptics[cite: 1].
- [ ] Anti-replay database logging works[cite: 1].
- [ ] PWA offline capability functional via IndexedDB[cite: 1].

---

## Sprint 3 & 4 — (Condensed Hardening, Load Testing & Launch)

*(Executing UI Polish, Security Audits, and Production Build in 14 days)*

### Days 15-18 — Polish & Edge Cases
- [ ] `S3-001` Add Skeleton loaders for all Supabase queries.
- [ ] `S3-002` Harden Python engine: write tests for malformed JSON, missing IVs, and incorrect AES keys.
- [ ] `S3-003` Implement rate limiting on the `/encrypt` endpoint (prevent users from spamming the server to drain resources).
- [ ] `S3-004` Refine UI: Ensure background is strictly `#FDFBD4` and primary text is `#38240D` across all Apple devices.

### Days 19-22 — Performance Load Testing
- [ ] `S4-001` Write a `k6` load testing script.
- [ ] `S4-002` Simulate 1,000 concurrent validation requests hitting the Python engine[cite: 1].
- [ ] `S4-003` Optimize Python server workers (Gunicorn/Uvicorn) until mean latency drops below 200ms[cite: 1].
- [ ] `S4-004` Test the Redis/Supabase duplicate check query speed. Add database indexes on `ticket_id` in `scan_events` if slow.

### Days 23-28 — Production Launch
- [ ] `S4-005` Verify no `console.log` statements contain encrypted payloads or keys.
- [ ] `S4-006` Deploy Python Engine to Render (set environment variables `AES_MASTER_KEY`).
- [ ] `S4-007` Deploy Next.js to Vercel (set `PYTHON_ENGINE_URL`).
- [ ] `S4-008` Perform live end-to-end test on production URLs on a physical mobile device.
- [ ] `S4-009` Align Chapter 3 documentation with actual deployed architecture[cite: 1].
- [ ] `S4-010` Release v1.0.0.

***

### Critical Issues Resolution Map (For EventTruffle)

| # | Potential Issue | Mitigation | Status |
|---|-------|--------|--------|
| 1 | Row locking fails (Double booking) | Enforce `FOR UPDATE` strictly in Supabase SQL functions[cite: 1]. | ⬜ |
| 2 | Python latency > 200ms | Offload state checks to Supabase; keep Python pure math[cite: 1]. | ⬜ |
| 3 | Scanner camera fails to load | Force HTTPS on deployment; request permissions gracefully[cite: 1]. | ⬜ |
| 4 | User screenshots valid QR | 30s TTL mathematically invalidates it before sharing is viable[cite: 1]. | ⬜ |
| 5 | Gatekeeper loses internet | Service worker intercepts request; validates against IndexedDB hashes[cite: 1]. | ⬜ |