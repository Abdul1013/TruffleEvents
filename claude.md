# Project: Secure EventFlow (AES-QR Ticketing)

## 1. Design & Coding Standards
- **Frontend:** React/Next.js with TypeScript.
- **Backend Infrastructure:** Supabase (Auth, Database, Storage).
- **Security Engine:** Python (FastAPI) for AES-256-GCM operations.
- **Principles:** DRY, SOLID, and Least Privilege (RBAC enforcement).
- **Naming:** camelCase for variables/functions, PascalCase for components/classes.
- **Color Palette (Chocolate Truffle):**
  - Primary: `#713600` (Rich Brown)
  - Accent: `#C05800` (Burnt Orange)
  - Background/Text Soft: `#FDFBD4` (Cream)
  - Deep Neutral: `#38240D` (Dark Truffle)

## 2. Security Standards (AES-256-GCM)
- **Library:** `cryptography.hazmat.primitives.ciphers.aead.AESGCM`.
- **QR Mechanism:** Dynamic regeneration every 30 seconds.
- **Payload:** JSON containing `ticket_id`, `user_hash`, and `timestamp_ms`.
- **Validation:** Must catch `InvalidTag` to detect forgery.
- **Encryption:** AES-256-GCM for all QR payloads. Use 96-bit IVs.
- **Anti-Fraud:** Implement a 30-second Time-To-Live (TTL) for QR codes.
- **Session:** JWT with 15-min Access Tokens and 7-day Refresh Token rotation.
- **Data:** Parameterized queries only; use row-level locking for inventory.
- **sanitization:** - Sanitize all inputs to prevent SQLi and XSS.

## 3. UI/UX: Apple Design Principles
- **Clarity:** Use SF Pro fonts; maintain high contrast using the palette.
- **Haptics:** Provide physical feedback on scan success/failure.
- **Feedback:** Visual color shifts (Green for success, Red for invalid) within 200ms.
- **Deference:** The UI should support the content, not compete with it.

## 4. Engineering Best Practices
- **Git Flow:** Feature branching; no direct pushes to `main`.
- **Testing:** Minimum 80% branch coverage with Jest.
- **PWA:** Service workers must pre-cache the Gatekeeper's offline hash list.
- Run `npm test` before every commit.
- Document all exported functions with JSDoc.


## Python Security Engine (FastAPI)
- **Library:** Use `cryptography.hazmat.primitives.ciphers.aead.AESGCM`.
- **Standards:** Every encryption must return a combined Base64url string: `nonce + ciphertext + tag`.
- **Validation Logic:** 
  1. Catch `InvalidTag` exceptions to detect tampering.
  2. Perform `current_time - payload_timestamp` check.
  3. Reject if difference > 30,000ms.
- **Type Hinting:** Use Pydantic for request validation.


