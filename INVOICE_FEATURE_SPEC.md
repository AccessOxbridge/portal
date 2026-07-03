# Mentor Invoice Feature — Design Spec

_Draft for review. Author: audit/dev session, 29 Jun 2026 (revised 2 Jul 2026). Status: decisions locked — see §2 and §15. Payout model: **invoice-driven** (Option A)._

> ⚠️ This document contains notes on UK invoicing/VAT/self-billing. I'm not a lawyer or accountant — treat the compliance sections as a starting point and confirm the final approach with your accountant before go-live.

> 📌 **Codebase context (as of 2 Jul 2026):** the `feat/mentor-payouts-go-live` PR has already shipped. The payout system is **live**: Stripe Connect onboarding is enabled (`STRIPE_CONNECT_DISABLED = false`), the default mentor rate is **£30/hr**, and audit findings F1–F4 are resolved in code (idempotency keys on transfer + bank payout, `uq_mentor_payouts_period` / `uq_mentor_payout_items_session` unique indexes, the second bank-payout hop via `createPayout`, the hourly `retry-bank-payouts` cron, and a hardened Connect webhook). This invoice feature therefore modifies a **live, period-based** payout flow — see §7.

---

## 1. Goal

Add an internal invoicing feature tied to mentor payouts, so Access Oxbridge (AO) keeps a diligent paper trail. Two documents, two moments:

- **Flow 1 — Pre-payout invoice:** a record that a mentor is owed money for completed sessions, produced *before* AO pays. (Mentors are freelancers, so this is the invoice for their services.)
- **Flow 2 — Post-payout remittance:** a payment confirmation AO sends the mentor *after* the payout, by email, with a PDF.

Payment itself still happens via Stripe Connect exactly as today — this feature wraps documentation around it.

---

## 2. Key decision: who issues the pre-payout invoice?

Utsav's instinct ("the mentor should send the invoice, because they're freelancers") is sound. There are two standard ways to do this. Both are legitimate; they differ in who is legally the issuer and how much friction/compliance each carries.

### Option A — Mentor-issued (mentor is the supplier)

The mentor issues an invoice to AO for their services. In our portal we make this painless: the system pre-fills the invoice from their completed-but-unpaid sessions, and the mentor reviews and clicks **Submit**. Submitting the invoice is what marks them eligible for payout on the admin screen.

**Pros**
- Legally the cleanest freelancer model — the mentor genuinely invoices their client (AO). No special agreement needed.
- Puts a confirmation step on the mentor (they attest the sessions/amount), which is useful evidence if a payment is ever disputed.
- Matches Utsav's "invoice before we pay" requirement literally: no invoice submitted → no payout.

**Cons**
- Requires a mentor action before every payout. If a mentor forgets or delays, their payout is blocked until they submit. (This is also the intended safeguard — but it means chasing people.)
- Slightly more onboarding explanation ("here's how you invoice us").
- At scale (many mentors, fortnightly), the chasing adds up operationally.

### Option B — Self-billing (AO issues on the mentor's behalf)

AO generates the invoice *on behalf of* the mentor and pays against it automatically. Under HMRC rules this is "self-billing" and is extremely common on platforms/marketplaces that pay lots of freelancers.

**Pros**
- Zero mentor friction — fully automated, nothing to chase, payouts never blocked by a missing invoice.
- Consistent numbering, format, and data (all generated from session records).
- Scales cleanly to hundreds of mentors.

**Cons**
- Requires a **self-billing agreement** signed by each mentor (best captured during onboarding), typically renewed ~every 12 months or when their VAT status changes.
- The invoice PDF must be marked **"SELF-BILLING"** and must still show the mentor's details as the supplier (and their VAT number if registered).
- More compliance care around VAT-registered mentors; AO must keep records of who it self-bills.
- Inverts Utsav's "mentor sends it" framing — though a self-billed invoice is still legally the mentor's invoice, just prepared by AO.

### Decision (confirmed): Option A — mentor-issued

v1 uses **Option A**: the mentor is the supplier and submits the invoice; no submitted invoice → no payout. Lowest legal overhead and matches the team's instinct. The schema and PDF template are still built so switching to self-billing (Option B) later is a config flag, not a rewrite (a `SELF-BILLING` marker field + a self-billing agreement checkbox in onboarding). If chasing freelancers for invoices becomes a burden, migrate to Option B.

**Additional confirmed decisions:**
- **Invoice scope:** the mentor **picks which specific sessions** to include on each invoice (multi-select from their unbilled list) — not a fixed period, not an auto-sweep.
- **Void behaviour:** voiding an invoice **returns its sessions to the unbilled pool** so they can be re-invoiced (nullable, clearable link — see §4.3).

---

## 3. Does Stripe send an invoice on payout? (No)

Confirmed against Stripe: neither a **Transfer** (platform balance → mentor's connected account) nor a **Payout** (Stripe balance → bank) creates or emails an invoice. The mentor only sees a *balance transaction* and a *payout line* in their Stripe Express dashboard. Stripe *Invoicing* is a separate accounts-receivable product for billing customers and charges a per-invoice fee (~0.4%) — the wrong tool here. Conclusion: **we generate invoices ourselves.** Free, and full control over branding/format.

---

## 4. Data model

Two new tables, plus one link column on the existing `mentor_payouts`.

### `mentor_invoices`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `mentor_id` | uuid FK → profiles(id) | |
| `invoice_number` | text UNIQUE | `AO-INV-YYYY-NNNNNN`, continuous sequence (see §4.1). **Always shown.** |
| `invoice_reference` | text | Human tag, e.g. `{mentor name} - {invoice date}` (Crimson-style). **Always shown.** |
| `invoice_date` | date | Date the invoice is generated/submitted |
| `period_start` / `period_end` | date | **Derived** = min/max session date on the invoice (display only; not a grouping key, since the mentor hand-picks sessions) |
| `status` | text | `draft` → `submitted` → `paid` → `void` (`approved` reserved for a future gate). UI label for `submitted` = **"Sent to Finance"** |
| `subtotal_cents` | int | **Gross pay** — sum of item amounts |
| `withholding_cents` | int | Default 0; admin-editable per invoice (subtracted) |
| `vat_cents` | int | Usually 0; non-zero only if mentor is VAT-registered |
| `total_cents` | int | **Total pay** = subtotal − withholding + vat |
| `currency` | text | `gbp` |
| `is_self_billed` | bool | false for Option A; true if generated under self-billing |
| `payout_id` | uuid FK → mentor_payouts(id) | Set when paid |
| `submitted_at` / `paid_at` / `voided_at` | timestamptz | (`submitted_at` = "Sent to Finance" time) |
| `created_at` / `updated_at` | timestamptz | |

No `(mentor_id, period)` uniqueness — grouping is mentor-picked, so a mentor can have several live invoices. Double-billing is prevented at the **session** level (§4.3), not the period level.

### `mentor_invoice_items`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `invoice_id` | uuid FK → mentor_invoices(id) | |
| `session_id` | uuid FK → sessions(id) | |
| `description` | text | Fixed service description: **"1-1 Mentorship Session"** |
| `student_name` | text | Snapshot of the student's name at invoice time (for the line) |
| `session_date` | date | From `sessions.scheduled_at` |
| `duration_minutes` | int | Booked duration |
| `hourly_rate_cents` | int | Snapshot of rate at invoice time |
| `amount_cents` | int | (minutes/60) × rate |

PDF artifacts (invoice + remittance) are tracked in `mentor_invoice_documents` (`invoice_id`, `kind: 'invoice' | 'remittance'`, `pdf_path`, `created_at`) — see §6.

### Link on `mentor_payouts`
Add `invoice_id uuid REFERENCES mentor_invoices(id)`. One payout ↔ one invoice.

### Claim column on `sessions`
Add `invoice_id uuid REFERENCES mentor_invoices(id)` (nullable) — this is the single source of truth for "has this session been invoiced?". See §4.3.

### 4.1 Invoice numbering
Use a Postgres sequence for a gapless, sequential series, formatted like `AO-INV-2026-000123`. Numbering must be **unique and never reused**. Corrections are done by **voiding** an invoice and issuing a new one — never by editing a submitted invoice.

### 4.2 Immutability
Once an invoice leaves `draft` (i.e. `submitted`), its line items and amounts are frozen. Any change = void + reissue. This keeps the audit trail trustworthy.

### 4.3 Session claiming — the anti-double-billing guarantee (core requirement)

**Problem being solved:** once a session is on an invoice, the mentor must not be able to put it on another invoice (or otherwise get paid for it twice). Today the codebase has **no session-level flag** — de-duplication is done purely in application code by reading `mentor_payout_items` and filtering, and there is **no unique constraint**, so it is race-prone. And because Option A invoices are created *before* any payout exists, `mentor_payout_items` doesn't yet contain the session at invoice time. So the guard must live at the invoice/session level, enforced by the database.

**Mechanism:** `sessions.invoice_id` is the single source of truth.

- **Claim (at invoice generation):** run an atomic conditional update —
  ```sql
  UPDATE sessions SET invoice_id = :new_invoice
  WHERE id = ANY(:selected_ids) AND invoice_id IS NULL
  RETURNING id;
  ```
  Only rows actually returned are placed on the invoice. A concurrent second attempt claims nothing, so **a session can never appear on two invoices** — enforced by the DB, not the UI.
- **Unbilled list** (what the mentor selects from) = `sessions WHERE mentor_id = me AND (status = 'completed' OR zoom_meeting_status = 'ended') AND invoice_id IS NULL`.
- **Release (on void):** `UPDATE sessions SET invoice_id = NULL WHERE invoice_id = :voided_invoice` → sessions return to the unbilled pool (per the confirmed void decision).
- **Payout dedup unified:** the payout path stops relying on the fragile `mentor_payout_items` set-diff as its primary guard and instead pays against the invoice's claimed sessions. `mentor_payout_items` remains only as the line-item snapshot. This also closes audit finding F1 (double-pay) with the same guarantee — invoice/payout should ship together.

---

## 5. Flow 1 — Pre-payout invoice (Option A, mentor picks sessions)

1. Mentor opens **Earnings & Payouts** (`/dashboard/mentor/payouts`). A new section lists their **unbilled** sessions (`completed`/`ended` and `invoice_id IS NULL`) with checkboxes.
2. Mentor **selects the specific sessions** to bill and clicks **Generate invoice** → system creates a `mentor_invoices` row in `draft`, atomically **claims the selected sessions** (§4.3), snapshots each as a `mentor_invoice_item` with the rate at that moment, and computes totals. Any session that fails the claim (already invoiced in a race) is dropped from the invoice with a message.
3. Mentor reviews the draft (PDF preview) and clicks **Submit invoice** → status `submitted`, `invoice_number` assigned, PDF rendered and stored, `submitted_at` set. Admins get a notification/email ("Mentor X submitted invoice AO-INV-…").
4. In **Admin → Payouts**, the admin sees the queue of `submitted` invoices and pays them (batch-pay supported); the payout pays exactly that invoice's claimed sessions. Enforces "invoice before we pay."
5. **Approval is implicit** — clicking Pay is the approval. A **confirmation dialog** (amount + mentor + session count) guards against misclicks. The `approved` status is retained in the schema so an explicit review gate can be switched on later without a migration.

State machine: `draft → submitted → paid` (with `approved` reserved for a future explicit gate), and `void` reachable from any non-paid state (void releases the sessions).

> Note on scope: while a `draft` invoice exists it has already claimed its sessions, so those sessions won't show up in the unbilled list for a second invoice. If a mentor abandons a draft, provide a "discard draft" action that voids it and releases the sessions.

---

## 6. Flow 2 — Post-payout remittance

1. Admin processes the payout (existing `POST /api/admin/payouts`). On a **successful** Stripe transfer:
   - Set the invoice `payout_id` and status `paid`, `paid_at`.
   - Generate a **remittance advice / payment confirmation** PDF (AO → mentor): amount, period, sessions, Stripe transfer id, payout date.
   - Email the mentor via Resend (reusing the existing `send-email-notifications` function) with the remittance PDF attached or linked, plus an in-app notification.
2. Store the remittance as a **separate PDF** from the invoice (two documents). Simplest: a small `mentor_invoice_documents` table (`invoice_id`, `kind: 'invoice' | 'remittance'`, `pdf_path`, `created_at`) so both files hang off the invoice.

This gives both sides of the paper trail: the mentor's invoice *to* AO, and AO's confirmation *to* the mentor.

---

## 7. Integration with the live payout code — moving from period-driven to invoice-driven

**Confirmed model: Option A (invoice-driven).** Today the *live* `/api/admin/payouts` is **period-driven**: the admin picks a date range, the route sweeps every finished, un-batched session in that window and pays it. That cannot coexist with "the mentor picks specific sessions," so the admin flow is reworked to pay **invoices**, not date ranges. The money-movement core is reused almost unchanged — only what *drives* it changes.

**Reused as-is** (from the go-live PR): `createTransfer` (hop 1, idempotency key = payout id) → write `mentor_payout_items` after the transfer confirms → `createPayout` (hop 2, key = `<payout>-bank`) → deferred-bank-hop marker + `retry-bank-payouts` cron → Connect webhook reconciliation.

**Changes:**

- **`GET /api/admin/payouts`** → returns the **queue of `submitted`/`approved` invoices** (mentor, invoice number, amount, sessions, period derived from session dates) instead of computing earnings from a date range.
- **`POST /api/admin/payouts`** → body carries `invoice_id`s (batch-pay supported), not `mentor_ids + period`. For each invoice: verify it's payable and unpaid, upsert a `mentor_payouts` row **keyed on `invoice_id`**, and pay the **invoice's snapshotted amount** (per the confirmed amount decision — do *not* recompute from the current rate). Then flip the invoice to `paid` and link `payout_id` in the same success path.
- **Uniqueness:** replace `uq_mentor_payouts_period` (one payout per mentor per period) with **uniqueness on `mentor_payouts.invoice_id`** (one payout per invoice). Keep `period_start/period_end` columns for reporting, derived from the invoice's sessions. `uq_mentor_payout_items_session` stays.
- **Dedup, two layers:** `sessions.invoice_id` = claimed/invoiced (can't be re-invoiced) → `mentor_payout_items.session_id` = paid (can't be re-paid). Flow: unbilled → invoiced → paid.
- **Remittance:** after hop 1 succeeds, trigger the remittance PDF + Resend email (§6).

Migration note: the existing `uq_mentor_payouts_period` index must be dropped and replaced; do this in the same migration that adds `sessions.invoice_id` and the invoice tables. No live payouts should be mid-flight during the switch.

---

## 8. PDF generation

- **Library:** `@react-pdf/renderer` — pure JS, works on Vercel serverless (no headless Chrome/Puppeteer, which is heavy and flaky on Vercel). Alternative: `pdf-lib` for lower-level control.
- Render in a route handler (e.g. `POST /api/mentor/invoices/[id]/pdf` and an internal call for remittances), upload the buffer to Supabase Storage, save the path via `mentor_invoice_documents`.

### 8.1 Invoice document layout (Crimson-style — confirmed reference)

Both the invoice PDF and the post-payout remittance PDF use this layout; the remittance additionally shows a **PAID** stamp with the payout date and Stripe reference.

**Header:** period range (derived min–max session date), "X of Y completed", and the status badge (`Sent to Finance` / `Paid`) with timestamp.

**FROM (supplier = mentor):**
- Mentor full name
- Mentor email

**BILL TO (fixed):**
```
Access Oxbridge Ltd
20 Wenlock Road
London
United Kingdom
```
_(confirm postcode + company registration no. — see open items)_

**INVOICE DETAILS:**
- Invoice date
- Invoice reference (`{mentor name} - {invoice date}`) — always shown
- Invoice number (`AO-INV-YYYY-NNNNNN`) — always shown

**Line items** (one per session): session date · time range (from `scheduled_at` + duration) · **Subject: "1-1 Mentorship Session"** · **Student:** {name} · Duration (e.g. 1h 0m) · amount · Completed tick.

**Totals block:**
- **Gross pay** (with total duration, e.g. "Total Duration: 2h 0m") = `subtotal_cents`
- **Withholding tax** = `−withholding_cents` (default −£0.00, admin-editable)
- **TOTAL PAY** = `total_cents`

A `SELF-BILLING` banner appears only if `is_self_billed = true` (future Option B).

---

## 8.2 Payouts / Invoicing tab UI (Crimson-style)

A two-pane layout mirroring the reference:

- **Left:** a **scrollable, selectable list** of invoice cards (not drag-to-reorder). Each card: label (invoice ref / date), total duration, "X of Y completed", status badge ("Sent to Finance" / "Paid"), the sent/paid date, and the amount. Clicking a card loads its detail on the right.
- **Right:** the full invoice detail (the §8.1 layout).
- **Filters:** Period · Status · Billing Country · Reset (matching the reference).
- **Mentor view** (`/dashboard/mentor/payouts`): their own invoices + the "select unbilled sessions → generate" action.
- **Admin view** (`/dashboard/admin/payouts`): all `submitted` ("Sent to Finance") invoices, with **Pay** (batch-supported) behind a confirmation dialog (amount + mentor + session count).

---

## 9. Email

Reuse the existing Resend integration (`resend` v6 is already a dependency) and the `send-email-notifications` Supabase edge function. Two templates:
- **To admin:** "Mentor X submitted invoice AO-INV-… (£Y) — ready to pay."
- **To mentor:** "You've been paid £Y for {period}" with the remittance PDF.

---

## 10. Storage

New Supabase Storage bucket **`invoices`** (private). Access via signed URLs only. RLS/bucket policy: a mentor can read their own invoice files; admins can read all. (Mirror the pattern already used for the `mentor-assets` bucket.)

---

## 11. Edge cases to handle

- **No unbilled sessions:** "Generate invoice" disabled with an explanation.
- **Void & reissue:** admin (or mentor pre-submission) can void; voided invoices keep their number, are excluded from totals, and **clear `sessions.invoice_id`** so their sessions return to the unbilled pool.
- **Abandoned draft:** a "discard draft" action voids the draft and releases its claimed sessions, so they're not stuck out of the unbilled list.
- **Partial periods / late sessions:** a session that finalises after an invoice is submitted stays unbilled and rolls into the next invoice (matches current "unbatched sessions" logic).
- **Rate change:** items snapshot the rate at invoice time, so later rate changes don't rewrite history.
- **Refund/clawback:** out of scope for v1 (and note the existing `charge.refunded` TODO from the audit); a voided/credit-note flow can be added later.
- **VAT-registered mentor:** allow a VAT number + VAT line; default everyone to no-VAT.
- **Dispute:** the existing "report issue" form on the payouts page can reference an invoice number.

---

## 12. Compliance notes (confirm with your accountant)

- A UK invoice should show: unique sequential number, supplier (mentor) name & address, AO's details, date, description of services, amount, and VAT details only if the supplier is VAT-registered.
- **Self-billing (Option B)** additionally requires: a signed self-billing agreement per mentor, the words "SELF-BILLING", the supplier's VAT number if applicable, and periodic renewal of the agreement.
- **Record retention:** keep invoices/remittances for the period your accountant advises (commonly 6 years in the UK).
- Most individual mentors won't be VAT-registered — build for the no-VAT default, support VAT as the exception.

---

## 13. Security

- RLS: mentors read only their own `mentor_invoices` / `mentor_invoice_items`; admins manage all. Mirror the existing payout-table policies.
- Invoice PDFs served via signed URLs from a private bucket only.
- Invoice creation/submission endpoints must verify the caller owns the invoice (mentor) or is admin.
- Never trust amounts from the client — compute from session records server-side (same principle as the current payout code).
- Enforce immutability at the DB layer (block updates to non-draft invoice items).

---

## 14. Suggested build order

1. Migration: `mentor_invoices`, `mentor_invoice_items`, `mentor_payouts.invoice_id`, sequence, RLS, `invoices` storage bucket.
2. Invoice generation + submit (mentor side) with PDF + storage.
3. Admin payouts gate on submitted invoice + link on payout.
4. Remittance PDF + Resend email on successful payout.
5. Void/reissue + admin approve.
6. (Later) Self-billing mode + onboarding agreement (Option B).

Dependencies: this should land **together with** the Stripe audit's F1 fix (payout idempotency/uniqueness) since both touch the payout write path.

---

## 15. Decisions & remaining open items

**Confirmed:**
- ✅ **Issuer model:** Option A — mentor-issued (B-ready schema).
- ✅ **Invoice scope:** mentor picks specific sessions per invoice.
- ✅ **Void behaviour:** voiding releases sessions back to the unbilled pool (`sessions.invoice_id` cleared).
- ✅ **Anti-double-billing:** enforced at DB level via `sessions.invoice_id` atomic claim (§4.3).
- ✅ **Payout model:** invoice-driven — admin pays submitted invoices (batch supported); one payout per invoice; replaces the live period-based sweep (§7).
- ✅ **Amount source:** pay the invoice's snapshotted amount, not a recomputed current rate.
- ✅ **Duration basis:** pay booked `duration_minutes` (no change; not actual Zoom length).
- ✅ **Approval:** implicit — paying the invoice is the approval (`submitted → paid`). A **confirmation dialog** on Pay shows amount + mentor + session count to prevent misclicks. Keep an `approved` status in the schema so an explicit review gate can be enabled later without a migration.
- ✅ **Documents:** two PDFs — the mentor's invoice (at submission) and AO's remittance (after payout), both using the §8.1 layout.
- ✅ **Invoice numbering:** `AO-INV-YYYY-NNNNNN`, backed by a single continuous Postgres sequence (gapless, unique); the year is display only. Invoice **reference** (`{mentor} - {date}`) also always shown.
- ✅ **Document layout:** Crimson-style (§8.1) — FROM (mentor + email), BILL TO (Access Oxbridge Ltd), invoice date/ref/number, per-session line items, Gross pay / Withholding tax / Total pay.
- ✅ **"Sent to Finance"** = the `submitted` status (mentor sends invoice to admins to authorise payout); relabelled in the UI.
- ✅ **UI:** Crimson-style two-pane — scrollable selectable invoice-card list + detail panel + filters (§8.2). Not drag-to-reorder.
- ✅ **Subject line:** fixed "1-1 Mentorship Session".
- ✅ **Withholding tax:** default £0, admin-editable per invoice.

**Still open (non-blocking):**
1. BILL TO **postcode** and **company registration number** for the Access Oxbridge Ltd address (needed on a proper invoice).
2. Whether the mentor's address / VAT number should appear under FROM (only relevant for VAT-registered mentors).

Otherwise the spec is build-ready.
