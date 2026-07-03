# Invoice Feature — Sprint Plan & Execution Prompts

_Single source of truth for building the mentor invoicing feature. Companion to `INVOICE_FEATURE_SPEC.md` (the design) — this file is the **execution plan**: sequential tickets, each with a ready-to-hand-off prompt and a verification gate._

**How to use this doc**
1. Do the **Pre-flight** once.
2. Work tickets **in order**. For each: paste the ticket's _Prompt_ to the coding agent, let it implement, then run the ticket's _Verification_ yourself.
3. Only move to the next ticket once the current one passes verification. Each prompt assumes the previous ticket is merged.
4. Every ticket says "read the relevant spec section first" — keep the agent anchored to `INVOICE_FEATURE_SPEC.md`.

**Locked decisions (from the spec, §2/§15):** Option A mentor-issued · mentor picks sessions · invoice-driven payouts (one payout ↔ one invoice) · pay the invoice's snapshotted amount · booked duration · implicit approval + confirmation dialog · two PDFs (invoice + remittance) · `AO-INV-YYYY-NNNNNN` continuous sequence · "Sent to Finance" = `submitted` · Crimson-style two-pane UI · fixed subject "1-1 Mentorship Session" · withholding £0 admin-editable · anti-double-billing enforced via `sessions.invoice_id`.

**Context:** the payout system is already **live** (Stripe Connect enabled, £30/hr default, audit F1–F4 fixed, two-hop transfer→bank payout + `retry-bank-payouts` cron + hardened Connect webhook). This feature **modifies live money code** — do not regress those guarantees.

---

## Pre-flight (do once, before T1)

- [ ] Create a feature branch: `feat/mentor-invoicing`.
- [ ] Switch **local** `.env.local` to Stripe **test** keys (`sk_test_`/`pk_test_`) and use the Stripe CLI for webhooks. Never test money movement against live keys. (This is audit finding F6.)
- [ ] Fill the open invoice fields (blocks the PDF ticket T3): Access Oxbridge Ltd **postcode** + **company registration number**; decide whether mentor address/VAT shows under FROM.
- [ ] Confirm you can apply migrations to a dev/branch Supabase project.

---

## T1 — Database foundation

**Goal:** all schema + storage the feature needs, including the switch of payout uniqueness from period to invoice.
**Depends on:** Pre-flight.
**Files:** `supabase/migrations/` (new file), `utils/supabase/types.ts` (regen).

**Prompt:**
```
Read INVOICE_FEATURE_SPEC.md §4 and §7 first.

Create ONE new Supabase migration (timestamped after the latest existing migration) that:

1. Creates table `mentor_invoices` with columns exactly per spec §4 (id, mentor_id FK profiles, invoice_number UNIQUE, invoice_reference, invoice_date, period_start, period_end, status text CHECK IN ('draft','submitted','paid','void') default 'draft', subtotal_cents, withholding_cents default 0, vat_cents default 0, total_cents, currency default 'gbp', is_self_billed bool default false, payout_id, submitted_at, paid_at, voided_at, created_at, updated_at). Add an updated_at trigger using the existing update_updated_at_column() function.
2. Creates table `mentor_invoice_items` per spec §4 (id, invoice_id FK ON DELETE CASCADE, session_id FK sessions, description, student_name, session_date, duration_minutes, hourly_rate_cents, amount_cents).
3. Creates table `mentor_invoice_documents` (id, invoice_id FK ON DELETE CASCADE, kind text CHECK IN ('invoice','remittance'), pdf_path text, created_at).
4. Adds nullable column `sessions.invoice_id uuid REFERENCES mentor_invoices(id)`.
5. Adds nullable column `mentor_payouts.invoice_id uuid REFERENCES mentor_invoices(id)`.
6. Payout uniqueness switch: DROP INDEX IF EXISTS uq_mentor_payouts_period; CREATE UNIQUE INDEX uq_mentor_payouts_invoice ON mentor_payouts(invoice_id) WHERE invoice_id IS NOT NULL. Keep uq_mentor_payout_items_session.
7. Creates a continuous sequence `mentor_invoice_seq` and a helper to format `AO-INV-YYYY-NNNNNN` (year is display; the counter is the sequence value).
8. Enables RLS on the 3 new tables. Policies: a mentor can SELECT their own invoices/items/documents; admins ('admin','admin-dev') can do ALL. Mirror the existing policy style in 20260122000000_stripe_connect_payouts.sql.
9. Creates a PRIVATE Supabase Storage bucket `invoices` with policies: mentor can read files under their own invoice paths; admins read all. Mirror the 'mentor-assets' bucket pattern.
10. Adds helpful indexes (mentor_invoices.mentor_id, .status; mentor_invoice_items.invoice_id, .session_id; sessions.invoice_id).

Do NOT change any application code in this ticket. Use IF NOT EXISTS / idempotent guards where sensible. After writing, note any duplicate-cleanup needed before the index swap.
```

**Verification:**
- Migration applies cleanly on a branch DB (and re-applies idempotently).
- `uq_mentor_payouts_period` is gone; `uq_mentor_payouts_invoice` exists; `uq_mentor_payout_items_session` still exists.
- RLS: as a mentor you can read only your own invoices; as admin, all. As an anon/other mentor, none.
- Regenerate `utils/supabase/types.ts` and confirm it builds.

---

## T2 — Invoice generation + session claiming (backend)

**Goal:** mentor can turn selected unbilled sessions into a draft invoice, with the anti-double-billing claim enforced atomically.
**Depends on:** T1.
**Files:** `app/api/mentor/invoices/route.ts` (+ maybe `[id]/route.ts`), `utils/invoices.ts`.

**Prompt:**
```
Read INVOICE_FEATURE_SPEC.md §4.3 and §5 first.

Implement mentor invoice backend endpoints (auth: user must be the mentor; verify role):

1. GET unbilled sessions for the current mentor = sessions where mentor_id = me AND (status='completed' OR zoom_meeting_status='ended') AND invoice_id IS NULL. Return id, scheduled_at, duration_minutes, student name (join profiles), computed amount at current hourly_rate_cents (default 3000).

2. POST create draft invoice from a list of selected session ids:
   - Verify all ids belong to this mentor and are unbilled.
   - ATOMICALLY claim them: UPDATE sessions SET invoice_id = :new WHERE id = ANY(:ids) AND invoice_id IS NULL RETURNING id. Only claimed rows go on the invoice; if any requested id was not claimed (race/already invoiced), drop it and report which.
   - Create the mentor_invoices row (status 'draft'), snapshot each claimed session into mentor_invoice_items (description fixed ' 1-1 Mentorship Session', student_name, session_date, duration_minutes, hourly_rate_cents snapshot, amount_cents = round(minutes/60 * rate)).
   - Compute subtotal_cents (gross), withholding_cents = 0, vat_cents = 0, total_cents = subtotal - withholding + vat. Set period_start/period_end = min/max session_date (display only).
   - Do NOT assign invoice_number yet (that happens at submit, T4). Return the draft.

3. POST discard draft: only if status='draft' and owned by mentor -> set status 'void', voided_at, and release sessions: UPDATE sessions SET invoice_id = NULL WHERE invoice_id = :id.

Never trust client amounts — always compute server-side. Add a small util in utils/invoices.ts for amount math so it's reused by the payout code later.
```

**Verification:**
- Generating a draft claims exactly the selected sessions; they vanish from the unbilled list.
- Concurrency test: two simultaneous generate calls with the same session never both claim it (write a quick script or test).
- Discard releases sessions back to the unbilled list.
- Totals correct; amounts computed server-side (client-sent amounts ignored).

---

## T3 — Invoice PDF generation

**Goal:** render the Crimson-style invoice PDF and store it.
**Depends on:** T2, and the Pre-flight open fields (address/company no.).
**Files:** `utils/invoice-pdf.tsx`, `app/api/mentor/invoices/[id]/pdf/route.ts`, `package.json`.

**Prompt:**
```
Read INVOICE_FEATURE_SPEC.md §8 and §8.1 first.

Add @react-pdf/renderer. Build a reusable invoice PDF renderer that produces the §8.1 layout:
- Header: period range (min–max session date), "X of Y completed", status badge + timestamp.
- FROM: mentor full name + email.
- BILL TO (fixed): Access Oxbridge Ltd / 20 Wenlock Road / London / United Kingdom / <postcode> — plus company registration number in the footer. (Use the values filled in Pre-flight; if still missing, use a clearly-marked placeholder constant in one place.)
- INVOICE DETAILS: invoice date, invoice reference, invoice number (all shown).
- Line items: session date · time range (scheduled_at + duration) · Subject "1-1 Mentorship Session" · Student: {name} · Duration (Xh Ym) · amount · Completed.
- Totals: Gross pay (with total duration) / Withholding tax (−) / TOTAL PAY.
- Show a SELF-BILLING banner only if is_self_billed.
- The renderer takes a `variant: 'invoice' | 'remittance'`; for 'remittance' add a PAID stamp with payout date + Stripe transfer/payout reference.

Expose a function renderInvoicePdf(invoiceId, variant) that loads the invoice+items, renders, uploads the buffer to the private `invoices` bucket, inserts a mentor_invoice_documents row (kind), and returns the path. Add GET /api/mentor/invoices/[id]/pdf that returns a signed URL (owner or admin only).
```

**Verification:**
- Generate a PDF for a sample invoice; open it and check every §8.1 field renders correctly (FROM, BILL TO, details, line items, totals).
- File lands in the private `invoices` bucket; signed URL works for owner/admin, denied otherwise.

---

## T4 — Submit invoice ("Sent to Finance") + admin notification

**Goal:** mentor submits a draft; it gets a number/reference, a rendered PDF, and admins are notified.
**Depends on:** T3.
**Files:** `app/api/mentor/invoices/[id]/submit/route.ts`.

**Prompt:**
```
Read INVOICE_FEATURE_SPEC.md §4.1, §4.2, §5 first.

Implement POST submit for a draft invoice (owner mentor only, status must be 'draft'):
- Assign invoice_number from mentor_invoice_seq formatted AO-INV-YYYY-NNNNNN; set invoice_reference = "{mentor name} - {invoice_date}"; set invoice_date = today; status -> 'submitted' ("Sent to Finance"); submitted_at = now.
- Freeze the invoice (from here, items/amounts are immutable; any change = void+reissue).
- Render+store the invoice PDF (T3 renderer, variant 'invoice').
- Notify admins: in-app notification to all admins/admin-dev AND an email via the existing Resend `send-email-notifications` path ("Mentor X sent invoice AO-INV-… (£Y) to finance").

Ensure numbering is gapless/unique (rely on the sequence). Return the submitted invoice.
```

**Verification:**
- Submitting assigns a unique, sequential number + reference; status shows "Sent to Finance".
- Submit twice / on a non-draft is rejected.
- Admins receive both in-app + email notification.
- Invoice PDF is generated and downloadable.

---

## T5 — Invoice-driven admin payout rework

**Goal:** switch the live payout flow from date-range sweep to paying invoices, reusing the existing money-movement core. **Highest-risk ticket — touches live money.**
**Depends on:** T4.
**Files:** `app/api/admin/payouts/route.ts`, possibly `app/api/cron/retry-bank-payouts/route.ts` (verify still correct).

**Prompt:**
```
Read INVOICE_FEATURE_SPEC.md §7 and the CURRENT app/api/admin/payouts/route.ts and utils/stripe.ts first. Preserve all existing money-safety guarantees — do not regress them.

Rework the admin payouts route from period-driven to invoice-driven:

GET: return the queue of invoices with status 'submitted' (label "Sent to Finance"), including mentor, invoice number/reference, amount (total_cents), session count, derived period, and mentor payouts_enabled/stripe_account_id readiness. (Replace the date-range earnings calc.)

POST: accept { invoice_ids: string[] } (batch). For each invoice, in order:
  - Load the invoice; require status 'submitted' and not already linked to a paid payout. Load the mentor; require stripe_account_id + payouts_enabled, else skip with reason.
  - Upsert a mentor_payouts row keyed on invoice_id (onConflict invoice_id) with amount_cents = invoice.total_cents (the SNAPSHOTTED amount — do NOT recompute from current rate), sessions_count, total_minutes, currency, status 'pending', period_start/end from the invoice.
  - Hop 1: createTransfer(..., idempotencyKey = payout.id) exactly as today.
  - Write mentor_payout_items from the invoice's items AFTER the transfer (upsert onConflict session_id).
  - Hop 2: createPayout(..., idempotencyKey = `${payout.id}-bank`) with the same deferred-bank-hop handling + PENDING_MARKER as today.
  - On success: mentor_payouts.status='paid' (+transfer/payout ids, timestamps); set invoice.status='paid', invoice.payout_id, paid_at.
  - Return per-invoice results incl. bank_payout_pending warnings.

Keep the retry-bank-payouts cron working (it keys off mentor_payouts; confirm no change needed). Do not break the Connect webhook reconciliation.
```

**Verification:**
- In **Stripe test mode**, pay one submitted invoice end-to-end: transfer + bank payout succeed; `mentor_payouts` and the invoice both flip to `paid`; invoice linked to payout.
- Idempotency: replaying the POST / double-submit does not create a second transfer or payout (same keys).
- A deferred bank hop (funds not yet available) is marked pending and later completed by the retry cron.
- Batch paying multiple invoices works; an ineligible mentor is skipped with a clear reason.

---

## T6 — Remittance PDF + email after payout

**Goal:** after a successful payout, send the mentor the remittance document.
**Depends on:** T5.
**Files:** `app/api/admin/payouts/route.ts` (hook), `utils/invoice-pdf.tsx` (remittance variant from T3).

**Prompt:**
```
Read INVOICE_FEATURE_SPEC.md §6 and §8.1 first.

After an invoice is successfully marked paid in the payout route, trigger (non-blocking, but logged on failure):
- Render the remittance PDF (T3 renderer, variant 'remittance') showing the §8.1 layout + PAID stamp (payout date, Stripe transfer/payout reference). Store it as a mentor_invoice_documents row kind='remittance'.
- Email the mentor via the existing Resend `send-email-notifications` path with the remittance PDF (attached or signed link): "You've been paid £Y for invoice AO-INV-…". Add an in-app notification too.

A remittance/email failure must NOT roll back the payout (money already moved) — log it and allow re-send.
```

**Verification:**
- A test payout produces a remittance PDF (kind='remittance') and emails the mentor + in-app notification.
- The remittance shows PAID + correct payout reference.
- Simulated email failure doesn't undo the paid state; re-send works.

---

## T7 — Mentor UI (Crimson-style two-pane)

**Goal:** mentor-facing invoicing tab.
**Depends on:** T4 (generate/submit) and enough of T6 for "paid" states.
**Files:** `app/dashboard/mentor/payouts/` (extend), new components.

**Prompt:**
```
Read INVOICE_FEATURE_SPEC.md §8.2 and §5 first.

Build the mentor invoicing UI in the existing Earnings & Payouts tab as a two-pane layout:
- Left: a scrollable, SELECTABLE list of invoice cards (not drag-to-reorder). Each card: reference/date label, total duration, "X of Y completed", status badge ("Sent to Finance"/"Paid"), sent/paid date, amount. Click loads detail on the right.
- Right: full invoice detail using the §8.1 layout; download-PDF button (signed URL).
- Filters: Period, Status, Billing Country, Reset.
- A "Create invoice" flow: list unbilled sessions with checkboxes -> select -> Generate draft -> review -> Submit ("Send to Finance"). Draft has a Discard action.
Match the existing dashboard styling. Keep the existing earnings summary cards.
```

**Verification:**
- Manual walkthrough: select unbilled sessions → generate draft → submit → card shows "Sent to Finance"; after admin pays, shows "Paid".
- PDF downloads; filters work; discard releases sessions.
- Layout matches the Crimson reference.

---

## T8 — Admin UI (Crimson-style two-pane) + confirmation dialog

**Goal:** admin invoicing/payouts screen.
**Depends on:** T5, T7 components (reuse).
**Files:** `app/dashboard/admin/payouts/` (rework), reuse components.

**Prompt:**
```
Read INVOICE_FEATURE_SPEC.md §8.2 and §7 first.

Rework the admin payouts page to be invoice-driven, two-pane:
- Left: scrollable selectable list of "Sent to Finance" (submitted) invoices (+ a Paid history filter). Card shows mentor, reference, amount, session count, readiness (Stripe connected?).
- Right: invoice detail (§8.1 layout).
- Multi-select + "Pay selected" (batch). On Pay, show a CONFIRMATION DIALOG summarizing total amount, mentor count, and session count before calling POST /api/admin/payouts.
- Surface per-invoice results, including "bank payout pending" warnings, and mentors skipped for missing Stripe setup.
- Filters: Period, Status, Billing Country, Reset.
Remove the old date-range sweep UI.
```

**Verification:**
- Manual walkthrough in Stripe test mode: see submitted invoices → select → confirmation dialog → pay → invoices flip to Paid.
- Batch pay works; ineligible mentors clearly flagged; pending-bank warnings shown.
- No date-range remnants; permissions enforced (non-admin blocked).

---

## T9 — End-to-end QA, edge cases & sign-off

**Goal:** verify the whole chain and the tricky paths before merge.
**Depends on:** T1–T8.
**Files:** test notes / checklist; fixes as needed.

**Prompt:**
```
Do a full end-to-end QA of the invoicing + payout flow in Stripe TEST mode and fix any issues found. Cover:
- Session lifecycle: complete a session (Zoom meeting.ended) -> appears as unbilled.
- Anti-double-billing: a session on a draft/submitted/paid invoice never appears as unbilled again; void/discard releases it; concurrent claim can't double-book.
- Numbering gapless & unique across several invoices.
- Amount snapshot: change the mentor's hourly_rate AFTER submit -> payout still pays the invoice's snapshotted amount.
- Payout idempotency: replay POST -> no double transfer/payout. Deferred bank hop -> retry cron completes it.
- Withholding: admin edits withholding on a draft -> totals + PDF reflect it.
- PDFs: invoice + remittance both correct; signed URLs enforce ownership/admin.
- RLS: mentor sees only own invoices; admin sees all; anon blocked.
- Empty states and error messages.
Produce a short QA checklist with pass/fail and note anything deferred.
```

**Verification:** the QA checklist passes; open a PR referencing `INVOICE_FEATURE_SPEC.md`; request review.

---

## Definition of Done
- All tickets verified; Stripe test-mode full cycle green; RLS confirmed; PDFs correct; live payout guarantees (idempotency, two-hop, retry cron, webhook) intact.
- `INVOICE_FEATURE_SPEC.md` open items resolved (address/company no./VAT).
- Switch local env back to test keys documented; production env vars unchanged.

## Appendix — open items to resolve before T3
1. Access Oxbridge Ltd **postcode**.
2. **Company registration number** (for invoice footer).
3. Whether mentor **address / VAT number** appears under FROM (only if any mentor is VAT-registered).

## Optional housekeeping (independent of the sprint)
- Refresh `STRIPE_AUDIT.md` to mark F1–F4 + the disable flag as resolved in commit c772d10, so the audit reflects the live state.
