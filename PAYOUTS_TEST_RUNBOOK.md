# Mentor Payouts — Test & Go-Live Runbook

_Exact, ordered steps to test every admin mentor-payout flow: (1) locally with **test** keys, (2) locally with **live** keys using a real **£1** payment, then (3) push to live. Follow top to bottom._

---

## 0. Read this first — environment facts & warnings

- **One shared database.** Local dev and production both use the same Supabase project (`msssqttbhlnwypnsewgl`). Anything you write locally (payout rows, etc.) lands in the **same tables production reads**. → Clean up test rows, and remember that **with live keys, local runs move real money and write real payout history**.
- **Stripe keys live in `.env.local`** (gitignored). Test keys = the **sandbox** account; live keys = the real account. Only one set is active at a time (the other is commented out).
- **Stripe CLI account.** `stripe login` is tied to the *main* account. For the **sandbox** you must pass `--api-key`; for **live** events use `--live`. The commands below read the active key straight from `.env.local`, so they always match whatever mode you're in.
- **App URL (local):** http://localhost:3000
- **Accounts:** admin `rwelabs@gmail.com`, test mentor `rajvishwakarma303@gmail.com`.
- **Convenience env (run once per terminal, from the repo root):**
  ```bash
  export SUPA_URL=https://msssqttbhlnwypnsewgl.supabase.co
  export SVC=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2)
  export SK=$(grep -E '^STRIPE_SECRET_KEY=' .env.local | cut -d= -f2)       # active Stripe secret
  export CRON=$(grep -E '^CRON_SECRET=' .env.local | cut -d= -f2)
  alias supa='f(){ curl -s -H "apikey: $SVC" -H "Authorization: Bearer $SVC" "$@"; }; f'
  ```

### Flows this runbook exercises
| # | Flow | Where |
|---|---|---|
| A | Mentor Stripe Connect onboarding → `payouts_enabled` | mentor UI + `account.updated` webhook |
| B | Admin **Calculate** payouts for a period | `/dashboard/admin/payouts` (GET) |
| C | Admin **Process** → Transfer + bank Payout → `paid` | `/dashboard/admin/payouts` (POST) |
| D | **Idempotency** — double-click / re-run never double-pays | POST |
| E | **Deferred bank payout** auto-completed by cron | `/api/cron/retry-bank-payouts` |
| F | **Edge cases** — no Stripe acct, already paid, no sessions | GET/POST |
| G | **Webhook reconciliation** — transfer/account events | both webhooks |
| H | **Mentor view** of their payouts | `/dashboard/mentor/payouts` |

---

## PHASE 1 — Local, TEST keys (sandbox, fake money)

### 1.1 Confirm test keys are active
```bash
grep -E '^STRIPE_SECRET_KEY=' .env.local   # must start with sk_test_
```
If it shows `sk_live_`, edit `.env.local`: comment the live block, uncomment the test block. Re-run the `export SK=...` line above.

### 1.2 Start the webhook listeners (sandbox)
Two terminals, one per endpoint. Each prints a `whsec_…`:
```bash
# terminal 1 — payments webhook
stripe listen --api-key $SK --forward-to localhost:3000/api/webhooks/stripe \
  --events checkout.session.completed,charge.refunded

# terminal 2 — connect webhook
stripe listen --api-key $SK --forward-to localhost:3000/api/webhooks/stripe-connect \
  --events account.updated,transfer.created,transfer.updated
```
Copy each printed secret into `.env.local`:
- terminal 1's secret → `STRIPE_WEBHOOK_SECRET=`
- terminal 2's secret → `STRIPE_CONNECT_WEBHOOK_SECRET=`

### 1.3 Start the app
```bash
npm run dev      # http://localhost:3000
```

### 1.4 Flow A — mentor onboarding (test KYC)
> Skip if the test mentor is already onboarded (sandbox account `acct_1TBIz5…`, `payouts_enabled=true`). To test onboarding fresh, use a *different* mentor login.
1. Log in as the mentor → go to `/dashboard/mentor` (or the training "payment" step). Click **Set Up Payments**.
2. You're redirected to Stripe's hosted Express onboarding. Use **test values**:
   - Phone: any UK mobile; SMS code: `000000`
   - DOB: `01 / 01 / 1990`; name: any
   - Address line 1: `address_full_match`; city `London`; postcode `SW1A 1AA`
   - National insurance / ID: `000000000`
   - Bank: sort code `10-88-00`, account `00012345`
3. Finish → you land back on the app. The `account.updated` event appears in terminal 2 and sets `mentors.payouts_enabled=true`.
4. Verify:
   ```bash
   supa "$SUPA_URL/rest/v1/mentors?id=eq.<MENTOR_ID>&select=stripe_account_id,payouts_enabled"
   ```

### 1.5 Fund the sandbox platform balance
Transfers need available platform balance. Add test funds instantly:
```bash
curl -s https://api.stripe.com/v1/charges -u "$SK:" \
  -d amount=20000 -d currency=gbp -d source=tok_bypassPending -d description="test funding"
curl -s https://api.stripe.com/v1/balance -u "$SK:" | python3 -m json.tool   # check "available"
```

### 1.6 Flow B + C — Calculate & Process (happy path)
1. Log in as **admin** → `/dashboard/admin/payouts`.
2. The date range defaults to the **last fortnight**. Pick a narrow range that contains **one** completed mentor session (the test mentor has completed sessions on **2026-06-15 / 2026-06-16** — set both dates to `2026-06-16` for a single £25 session). _Set dates by clicking the date fields directly._
3. Click **Calculate Payouts**. Confirm the table shows the mentor with the expected sessions/hours/amount and status **Ready**.
4. Ensure only the intended mentor's checkbox is ticked. Click **Process …** — a confirm dialog shows the **period + count + total**. Accept.
5. Expect the green banner: _"Successfully processed 1 payout(s)"_. Terminal 2 shows `transfer.created → 200`.
6. Verify the DB + Stripe:
   ```bash
   # newest payout for the mentor
   supa "$SUPA_URL/rest/v1/mentor_payouts?mentor_id=eq.<MENTOR_ID>&select=id,status,amount_cents,stripe_transfer_id,stripe_payout_id,failure_message&order=created_at.desc&limit=1"
   ```
   Expect `status=paid`, `stripe_transfer_id` + `stripe_payout_id` set, `failure_message=null` (in sandbox, funds are instantly available so the bank hop succeeds).

### 1.7 Flow D — idempotency / double-pay guard
- **Re-run the same period:** repeat 1.6 step 4 for the same dates → result is blocked ("already processed" / "no eligible sessions"), **no second transfer** appears in Stripe.
- **Double-submit:** the unique constraint + the transfer idempotency key (`payout.id`) guarantee a single transfer even on concurrent requests. (Proven; the period-block above is the user-visible guard.)

### 1.8 Flow E — deferred bank payout + cron retry
This is the live-mode reality (funds not yet "available" when the payout runs). Simulate locally:

**Auth + empty path:**
```bash
URL=http://localhost:3000/api/cron/retry-bank-payouts
curl -s -o /dev/null -w "%{http_code}\n" $URL                                 # 401
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer wrong" $URL # 401
curl -s -H "Authorization: Bearer $CRON" $URL                                  # 200 {checked:0}
```

**Retry completing a deferred payout** (seed a throwaway row, fund the connected account, run cron, clean up):
```bash
MENTOR_ID=f0ffefc3-9c93-40b0-8e03-2d35c0301452
ACCT=acct_1TBIz5CoFfpTWA1i   # the mentor's sandbox connected account

# 1) put £25 available on the connected account
curl -s https://api.stripe.com/v1/transfers -u "$SK:" -d amount=2500 -d currency=gbp -d destination=$ACCT >/dev/null

# 2) seed a deferred row (fake 2020 period, no session items)
ROW=$(supa -X POST "$SUPA_URL/rest/v1/mentor_payouts" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"mentor_id\":\"$MENTOR_ID\",\"period_start\":\"2020-01-01\",\"period_end\":\"2020-01-14\",\"status\":\"paid\",\"stripe_transfer_id\":\"tr_seed\",\"stripe_payout_id\":null,\"failure_message\":\"Funds transferred; bank payout pending: seed\",\"amount_cents\":2500,\"currency\":\"gbp\",\"sessions_count\":0,\"total_minutes\":0}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
echo "seeded $ROW"

# 3) run the cron -> completes the bank payout
curl -s -H "Authorization: Bearer $CRON" $URL | python3 -m json.tool   # expect completed:1
# 4) run again -> checked:0 (idempotent, no double pay)
curl -s -H "Authorization: Bearer $CRON" $URL

# 5) cleanup
supa -X DELETE "$SUPA_URL/rest/v1/mentor_payouts?id=eq.$ROW" >/dev/null && echo "cleaned"
```

### 1.9 Flow F — edge cases (in the admin UI)
- **Mentor with no Stripe account / not enabled:** appears with status **No Stripe**, checkbox disabled — cannot be paid.
- **Already-paid period:** shows **Paid**, excluded from the total.
- **No completed sessions in range:** mentor doesn't appear / amount £0.

### 1.10 Flow G — webhook reconciliation
Watch terminal 2 during 1.6: `account.updated` (onboarding) and `transfer.created` (process) both return `200`. Forged/unsigned posts are rejected:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/webhooks/stripe-connect \
  -H 'stripe-signature: t=1,v1=bad' -d '{"type":"account.updated"}'   # 400
```

### 1.11 Flow H — mentor view
Log in as the mentor → `/dashboard/mentor/payouts` → confirm the processed payout shows with the correct amount/status.

### 1.12 Clean up Phase-1 test rows
Delete any payout rows created during testing so they don't pollute real history (the cascade removes their items and frees the sessions):
```bash
supa "$SUPA_URL/rest/v1/mentor_payouts?mentor_id=eq.<MENTOR_ID>&select=id,period_start,period_end,status,created_at&order=created_at.desc"
# for each test row id:
supa -X DELETE "$SUPA_URL/rest/v1/mentor_payouts?id=eq.<ROW_ID>" >/dev/null
```
Stop the `stripe listen` processes and `npm run dev`.

---

## PHASE 2 — Local, LIVE keys, real £1

> ⚠️ **Real money.** With live keys, every step below moves actual funds and writes real payout history to the shared DB. Keep the amount at £1 and clean up.

### 2.1 Switch `.env.local` to live keys
Edit `.env.local`: uncomment the **live** block (`sk_live_…`, `pk_live_…`), comment the **test** block. Then refresh the shell vars:
```bash
export SK=$(grep -E '^STRIPE_SECRET_KEY=' .env.local | cut -d= -f2)   # now sk_live_
grep -E '^STRIPE_SECRET_KEY=' .env.local   # confirm sk_live_
```
Webhook secrets: for a payout-only test you **don't need** `stripe listen` (the Process call completes the transfer and marks the row itself, and onboarding re-checks `payouts_enabled` on return). If you want live events forwarded locally: `stripe listen --live --forward-to localhost:3000/api/webhooks/stripe-connect --events account.updated,transfer.created,transfer.updated` and paste its secret into `STRIPE_CONNECT_WEBHOOK_SECRET`.

```bash
npm run dev
```

### 2.2 Ensure one real mentor is onboarded in LIVE
The sandbox connected account does **not** exist in live. Pick one real mentor (e.g. your own mentor account) and complete **real** Stripe KYC once:
1. Log in as that mentor → **Set Up Payments** → complete onboarding with **real** details + a **real** bank account.
2. Confirm:
   ```bash
   supa "$SUPA_URL/rest/v1/mentors?id=eq.<MENTOR_ID>&select=stripe_account_id,payouts_enabled"   # payouts_enabled=true
   ```

### 2.3 Make the payout £1
Temporarily set that mentor's rate so one 60-min session = £1, and note the original to restore later:
```bash
supa "$SUPA_URL/rest/v1/mentors?id=eq.<MENTOR_ID>&select=hourly_rate_cents"     # note original
supa -X PATCH "$SUPA_URL/rest/v1/mentors?id=eq.<MENTOR_ID>" -H "Content-Type: application/json" -d '{"hourly_rate_cents":100}'
```
You need exactly one **completed** session in the period you'll select. If none exists, use a real past completed session and a one-day range around it.

### 2.4 Fund the LIVE platform balance (≥ £1)
You **cannot** use test cards. Either rely on existing live student revenue, or add funds (Stripe Dashboard → Balance → **Add to balance**), or make one small real credit purchase through the live checkout. Confirm:
```bash
curl -s https://api.stripe.com/v1/balance -u "$SK:" | python3 -m json.tool   # available ≥ 100
```

### 2.5 Process the £1 payout
1. Admin → `/dashboard/admin/payouts` → select the one-day period with that single session → **Calculate** → confirm it shows **£1.00** for that mentor only → **Process** → accept the confirm dialog.
2. Two outcomes are both correct:
   - Banner _"Successfully processed 1 payout(s)"_ → bank payout succeeded immediately.
   - Banner with _"⚠️ … bank payout is pending"_ → live funds weren't "available" yet; the cron will finish it (next step).

### 2.6 Complete the bank hop (if deferred) via the cron, locally
```bash
curl -H "Authorization: Bearer $CRON" http://localhost:3000/api/cron/retry-bank-payouts
```
Re-run after a few minutes if it reports `still_pending` (funds not yet available).

### 2.7 Verify in the LIVE Stripe dashboard
- **Connect → Transfers:** a £1.00 transfer to the mentor's account.
- **Connect → the account → Payouts:** a £1.00 payout to their bank.
- DB row: `status=paid`, `stripe_transfer_id` + `stripe_payout_id` set, `failure_message=null`.

### 2.8 Restore & switch back to test keys
```bash
supa -X PATCH "$SUPA_URL/rest/v1/mentors?id=eq.<MENTOR_ID>" -H "Content-Type: application/json" -d '{"hourly_rate_cents":<ORIGINAL>}'
```
Optionally delete the £1 test payout row (it was a real payout — keep it as a record or delete for cleanliness). Edit `.env.local` back to the **test** block (comment live, uncomment test). Stop `npm run dev` / any `stripe listen`.

---

## PHASE 3 — Push to live

### 3.1 Commit & open a PR
```bash
git checkout -b feat/mentor-payouts-go-live
git add app/api/admin/payouts/route.ts app/api/webhooks/stripe-connect/route.ts \
        app/dashboard/admin/payouts/page.tsx components/dashboard/stripe-onboarding-button.tsx \
        utils/stripe.ts app/api/cron/retry-bank-payouts/route.ts vercel.json \
        supabase/migrations/20260629010000_payout_uniqueness.sql
git commit   # see message below
git push -u origin feat/mentor-payouts-go-live
```
`.env.local` is **not** committed (gitignored) — keep it that way.

### 3.2 Apply the migration to the (shared) DB
Already applied during testing. If a fresh environment: run `supabase/migrations/20260629010000_payout_uniqueness.sql` in the Supabase SQL editor. Confirm:
```sql
select indexname from pg_indexes
where indexname in ('uq_mentor_payouts_period','uq_mentor_payout_items_session');  -- expect 2 rows
```

### 3.3 Vercel env vars (Production)
In the Vercel project, ensure these are set for **Production**:
- `STRIPE_SECRET_KEY` = `sk_live_…`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_…`
- `STRIPE_WEBHOOK_SECRET` = live payments-webhook signing secret (from step 3.4)
- `STRIPE_CONNECT_WEBHOOK_SECRET` = live connect-webhook signing secret (from step 3.4)
- `CRON_SECRET` = (same value your cron expects; **required** or the cron returns 401)
- `NEXT_PUBLIC_APP_URL` = `https://app.accessoxbridge.io`

### 3.4 Register the LIVE webhook endpoints (Stripe Dashboard, live mode)
- `https://app.accessoxbridge.io/api/webhooks/stripe` → events `checkout.session.completed`, `charge.refunded`.
- `https://app.accessoxbridge.io/api/webhooks/stripe-connect` → events `account.updated`, `transfer.created`, `transfer.updated`, **with "Listen to events on connected accounts" enabled**.
- Copy each signing secret into the matching Vercel var (3.3), then redeploy.

### 3.5 Deploy & verify the cron
- Merge the PR / deploy. Vercel reads `vercel.json` and registers the hourly cron `/api/cron/retry-bank-payouts` (Pro plan supports hourly).
- Vercel Dashboard → your project → **Cron Jobs**: confirm it's listed. You can hit **Run** there, or:
  ```bash
  curl -H "Authorization: Bearer <CRON_SECRET>" https://app.accessoxbridge.io/api/cron/retry-bank-payouts
  # expect 200 {checked:0,...} on a clean system
  ```

### 3.6 Final tiny prod test (on the deployed app)
Repeat the £1 flow but against `https://app.accessoxbridge.io` instead of localhost: set a mentor's rate to £1, ensure one completed session + funded balance, Process from the deployed admin page, then verify the transfer + payout in the live dashboard and let the deployed cron complete any deferred bank hop. Restore the rate.

### 3.7 Done — operating notes
- Run payouts from `/dashboard/admin/payouts`; the default range is the last fortnight.
- If a payout shows **"bank payout pending"**, it's safe — the hourly cron completes it once funds are available. Watch for rows where `stripe_payout_id IS NULL` and `failure_message LIKE 'Funds transferred; bank payout pending%'`.
- **Known gap (not in scope):** refunds (`charge.refunded`) don't claw back credits yet.

---

## Quick reference — verification queries
```bash
# all payouts for a mentor
supa "$SUPA_URL/rest/v1/mentor_payouts?mentor_id=eq.<ID>&select=*&order=created_at.desc"
# deferred bank payouts awaiting the cron
supa "$SUPA_URL/rest/v1/mentor_payouts?status=eq.paid&stripe_payout_id=is.null&failure_message=ilike.Funds%20transferred%3B%20bank%20payout%20pending*&select=id,mentor_id,amount_cents"
# stripe-side
curl -s https://api.stripe.com/v1/transfers?limit=5 -u "$SK:"
curl -s "https://api.stripe.com/v1/payouts?limit=5" -u "$SK:" -H "Stripe-Account: <ACCT>"
```
