# Stripe Audit & Security Review — Access Oxbridge Portal

_Audit date: 29 June 2026. Scope: every Stripe-related file in the portal (config, checkout, Connect onboarding, webhooks, admin payouts, mentor payouts, DB migrations, env files)._

---

## 1. Executive summary

The Stripe integration has two halves:

- **Inbound (students pay):** Stripe Checkout for credit packages. **This is wired up correctly and reasonably secure.**
- **Outbound (mentors get paid):** Stripe Connect Express + manual Transfers, driven from the admin Payouts page. **The code exists but mentor onboarding is switched off, and there are real money-safety gaps that must be fixed before going live.**

**Keys in use: LIVE.** Both `.env.prod` and `.env.local` contain `sk_live_…` / `pk_live_…`. Local dev is pointed at live Stripe.

**Webhooks: configured** (both signing secrets are set in prod), but the Connect webhook has an insecure fallback and endpoint registration in the Stripe dashboard still needs to be confirmed.

**Biggest risks before paying real mentors:** no idempotency / uniqueness guard on payouts (double-pay is possible), and the connected-account payout schedule is set to `manual`, meaning transferred money can get stuck in the mentor's Stripe balance and never reach their bank.

---

## 2. How payments work today

### 2.1 Students paying in (credits)
1. Student clicks a package on the credits page → `POST /api/stripe/checkout`.
2. Server fetches the package **from the database** (price is never trusted from the client — good), gets/creates a Stripe customer, writes a `pending` row in `credit_purchases`, and creates a Stripe Checkout Session.
3. Student pays on Stripe's hosted page.
4. Stripe calls `POST /api/webhooks/stripe` with `checkout.session.completed`.
5. The webhook (service-role, signature-verified) adds credits to `profiles.credits`, marks the purchase `completed`, writes a `credit_transactions` audit row, and notifies the student.

Money lands in the **platform's** Stripe balance.

### 2.2 Mentors getting paid out (Stripe Connect)
1. **Onboarding (currently DISABLED):** mentor clicks "Set Up Payments" → `POST /api/stripe/connect/onboarding` → creates an Express connected account (`type: express`, `country: GB`, `transfers` capability) and redirects to Stripe's onboarding/KYC.
2. Stripe calls `POST /api/webhooks/stripe-connect` with `account.updated` → sets `mentors.payouts_enabled = true` once KYC is done.
3. **Admin payout run:** admin opens `/dashboard/admin/payouts`, picks a date range, and "Calculate".
   - `GET /api/admin/payouts` sums each mentor's finished sessions: `amount = (duration_minutes / 60) × hourly_rate_cents` (default £25/hr). Sessions already in a payout batch are excluded.
4. Admin selects mentors and "Process" → `POST /api/admin/payouts`:
   - Re-computes the amount server-side, creates a `mentor_payouts` row + `mentor_payout_items`, then calls `transfers.create` to move funds **platform balance → mentor's connected account**, and marks the payout `paid`.
5. `transfer.created` / `transfer.updated` Connect webhooks also reconcile payout status.

**Important flow gap:** a Stripe **Transfer** only moves money into the mentor's *connected-account balance*. Getting it from there to the mentor's *bank* is a separate **Payout**. The account is created with `settings.payouts.schedule.interval = 'manual'`, and the code never calls `payouts.create`. **As written, money would reach the mentor's Stripe balance but not their bank account.** See fix #4 below.

---

## 3. Test vs live keys & webhook status

| Item | Status | Notes |
|---|---|---|
| `.env.prod` keys | **LIVE** (`sk_live_`, `pk_live_`) | Used in production (Vercel). |
| `.env.local` keys | **LIVE** (`sk_live_`, `pk_live_`) | Test keys are present but **commented out**. Local dev currently hits live Stripe. |
| `STRIPE_WEBHOOK_SECRET` | Set in prod & local | Payments webhook. |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Set in prod & local | Connect webhook. |
| Env files in git? | **No** — `.env*` is gitignored and not in history. | Good. Keys are not committed. |
| Stripe Connect enabled on platform? | **Unconfirmed** | Code has a dedicated "Connect is not enabled for this platform" error path, which suggests it may not be activated yet. Verify in the Stripe dashboard. |
| Webhook endpoints registered in Stripe dashboard? | **Unconfirmed from code** | Secrets exist, so endpoints were likely created. Must be verified live (correct URLs + event types + "connected accounts" enabled for the Connect endpoint). |

---

## 4. Security findings

Severity: 🔴 critical (fix before live) · 🟠 high · 🟡 medium · 🟢 informational

### 🔴 F1 — Double-payment is possible (no idempotency / uniqueness on payouts)
`POST /api/admin/payouts` checks for an existing payout, then inserts and calls `transfers.create` — but this is **not atomic**, there is **no unique constraint** on `mentor_payouts(mentor_id, period_start, period_end)`, and **no Stripe idempotency key** is passed. Two near-simultaneous requests (double-click, two tabs, retry) can both pass the check and issue **two real transfers** to the same mentor. This is the most serious money risk.

**Fix:** add a DB unique constraint on `(mentor_id, period_start, period_end)`, and pass an idempotency key (e.g. the payout id) to `transfers.create`.

### 🟠 F2 — Connect webhook accepts unsigned events if the secret is missing
`/api/webhooks/stripe-connect` falls back to `JSON.parse(body)` with no signature check when `STRIPE_CONNECT_WEBHOOK_SECRET` is unset, and only logs a warning. If that env var is ever absent/misnamed, an attacker who knows the URL could POST a forged `account.updated` (flip `payouts_enabled = true`) or `transfer.updated` (mark payouts paid/failed). Prod currently has the secret set, so this is latent, not active.

**Fix:** always require the secret — reject the request if it's missing, exactly like the payments webhook does.

### 🟠 F3 — Connected-account payouts never reach the bank
As noted in §2.2: `interval: 'manual'` + no `payouts.create` call means transferred funds sit in the mentor's Stripe balance.

**Decision (Raj, 29 Jun 2026): keep payouts admin-triggered/manual — no automatic schedule.** Note this is a different axis from "manual": the admin already controls *when* money is sent (the Process button = the Transfer). What's missing is the second hop from the mentor's Stripe balance to their bank.

**Fix (for the chosen manual model):** after each admin Transfer, also call `payouts.create` on the connected account so funds reach the mentor's bank. This keeps full manual control and closes F3. (The automatic-schedule alternative has been ruled out.) Not yet implemented — report-only for now.

### 🟡 F4 — Sessions can get "stuck" if a transfer half-completes
Payout items are inserted **before** the transfer, and the payout is only marked `paid` **after**. If `transfers.create` succeeds but the final DB update fails (or vice-versa), the payout row stays `pending` while the sessions are now locked inside `mentor_payout_items`, so a re-run reports "no eligible sessions". No double-pay, but it needs manual cleanup. Tightening F1 (atomic insert + idempotency) largely resolves this; consider only inserting items after a confirmed transfer, or reconciling `pending` payouts via the webhook.

### 🟡 F5 — Refunds don't claw back credits
`charge.refunded` in the payments webhook is a `// TODO`. A student refunded in Stripe keeps their credits. This is acknowledged in the Founders Handbook as a known manual gap, but flagging it as a security/finance correctness issue.

### 🟡 F6 — Local development uses LIVE keys
`.env.local` is set to live keys (test keys commented out). Any local testing of checkout or payouts hits real Stripe and can move real money. Switch local back to `sk_test_`/`pk_test_` and use the Stripe CLI for webhooks.

### 🟢 F7 — Things done correctly (no action needed)
- Checkout amount is read from the DB, never from the client.
- Payments webhook verifies the Stripe signature and uses the service role.
- Purchase idempotency via a status check **and** `credit_purchases.stripe_session_id UNIQUE`.
- Payout amounts are recomputed server-side in the POST handler (the client only sends `mentor_ids` + period).
- Admin endpoints check `role IN ('admin','admin-dev')`; onboarding checks mentor role.
- RLS is enabled on `mentor_payouts`, `mentor_payout_items`, `credit_*` tables with sensible policies.

---

## 5. What's needed to enable mentor payouts (go-live runbook)

Do the security fixes (F1–F3 at minimum) **before** turning this on with live money.

1. **Enable Stripe Connect** on the platform account: Stripe Dashboard → Connect → Get started (Express, platform/marketplace). Confirm the live secret key has Connect permissions.
2. **Re-enable onboarding in the app:** in `components/dashboard/stripe-onboarding-button.tsx`, set `STRIPE_CONNECT_DISABLED = false`.
3. **Confirm live env vars in Vercel:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` (used to build Stripe return/refresh URLs).
4. **Register/verify both webhook endpoints (live mode):**
   - `https://<app>/api/webhooks/stripe` → `checkout.session.completed`, `charge.refunded`.
   - `https://<app>/api/webhooks/stripe-connect` → `account.updated`, `transfer.created`, `transfer.updated`, **with "Listen to events on connected accounts" enabled**. Copy each signing secret into the matching env var.
5. **Payout-to-bank model (F3) — DECIDED: admin-manual.** Keep `interval: 'manual'` and, after each admin Transfer, add a `payouts.create` call on the connected account so funds reach the mentor's bank. (Automatic scheduling ruled out.)
6. **Apply F1 fix** (unique constraint + idempotency key) — non-negotiable before real transfers.
7. **Set hourly rates:** populate `mentors.hourly_rate_cents` (defaults to £25/hr).
8. **Mentor onboarding:** each mentor completes Stripe KYC → `account.updated` sets `payouts_enabled = true`.
9. **Fund the platform balance:** transfers require available balance (student card payments fund it; otherwise top up).
10. **Test with one mentor / small amount** end-to-end before a full run.

---

## 6. File reference

| Area | File |
|---|---|
| Server Stripe + Connect helpers | `utils/stripe.ts` |
| Client Stripe loader | `utils/stripe-client.ts` |
| Student checkout | `app/api/stripe/checkout/route.ts` |
| Connect onboarding / refresh / dashboard | `app/api/stripe/connect/{onboarding,refresh,dashboard}/route.ts` |
| Payments webhook | `app/api/webhooks/stripe/route.ts` |
| Connect webhook | `app/api/webhooks/stripe-connect/route.ts` |
| Admin payouts API | `app/api/admin/payouts/route.ts` |
| Admin payouts UI | `app/dashboard/admin/payouts/page.tsx` |
| Mentor payouts UI | `app/dashboard/mentor/payouts/page.tsx` |
| Onboarding button (DISABLE FLAG) | `components/dashboard/stripe-onboarding-button.tsx` |
| Schema | `supabase/migrations/20260112000000_credit_system.sql`, `20260122000000_stripe_connect_payouts.sql` |
