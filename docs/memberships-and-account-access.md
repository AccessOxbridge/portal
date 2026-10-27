# Memberships and account access

## Scope

The parent programmes page now shows the approved Years 7–11 memberships:
Lite £247/month, Excel £397/month or £3,970/year, and Concierge £1,250/month.
All enrolment buttons are disabled. This change creates no Stripe customers,
subscriptions, payments, credit grants or membership entitlements.

Stripe setup needs three products and four recurring GBP prices in an isolated
Stripe sandbox. Keep the four sandbox Price IDs separately from future live IDs.
Use Stripe Billing's customer portal for cancellation at the end of the paid
billing period. The subscription integration is a separate follow-up; the current
credit-purchase webhook is not a membership webhook.

## Account access

Admins and admin developers use `/dashboard/admin/disable-account`. Each role has
Active and Disabled views, search, pagination, confirmation and re-enabling.
The `client` role is intentionally outside this feature. Self-disable is refused;
the database also protects the last enabled administrator.

`account_access` stores access state separately from existing profile data.
`account_access_events` records each actual state change and its actor. Repeating
the same action does not create another event. No existing profile, relationship,
session, invoice, payout, credit balance or message is rewritten on disable.

Mentor disabling is blocked by draft/submitted invoices, pending/processing/failed
payouts, or billable completed/Zoom-ended sessions without an invoice. A session
already paid through a legacy payout does not block disabling. Real sessions under
15 minutes are non-billable; null actual length keeps the existing legacy rule.

Before disabling either participant, the confirmation asks admins to review and
reassign upcoming sessions. Disabling does not cancel a Zoom meeting or a future
subscription, refund money, unassign mentors, or cancel pending requests.

## Enforcement

- Login checks access before first-login messages and dashboard loading.
- The dashboard layout checks access before profile repair or other work.
- The request proxy checks signed-in page and API requests, preserving auth cookies.
- An open dashboard checks again on focus/visibility and every 30 seconds.
- Restrictive RLS policies reject disabled JWTs on existing public RLS tables and
  storage objects; an issued JWT cannot bypass these checks.
- Statement triggers reject writes through existing SECURITY DEFINER RPCs too.
- Existing public views retain their definitions and grants, with a caller-enabled
  predicate protecting owner-rights reads. Existing anonymous grants are preserved.
- New bookings, mentor requests and active assignments reject disabled participants,
  including privileged server inserts.
- Account status is readable by its owner (including disabled owners) and enabled
  admins. Events are readable only by enabled admins. Direct client writes to both
  tables are revoked; one authenticated RPC authorises the change transactionally.

This is application access suspension, not deletion or a Supabase Auth ban. A user
can authenticate and read only their access status so the disabled screen can be
shown. Existing public assets and externally issued links are not revoked by this
feature. New private downloads through the portal are guarded.

When adding future public tables, carry forward the enabled-account restrictive
policy and disabled-actor statement trigger. New storage buckets must remain
private if access needs revocation.

## Active lists and historical records

Disabled people are excluded from active student/mentor/parent directories,
account-creation rosters, approvals, performance rosters, overview people counts,
booking and assignment selectors, report recipients and new-message searches.
Historical sessions, conversations, reports and financial records remain readable
by their existing authorised users and retain names for audit.

## Local verification

Visual reference lock: Raj's membership screenshot supplies the tier order,
approved copy and navy/gold recommended Excel treatment. The existing portal
supplies Geist typography and shared controls. Refero's Raise/Open Collective and
Memorisely references inform contained spacing and readable lists; Ballpark's
member-removal flow informs confirmation/feedback; Butter's flow informs the
last-admin rejection. Keep tabs immediate and use reduced-motion-aware controls.

The dedicated worktree uses Docker Supabase at `http://127.0.0.1:54321`, local demo
keys and dummy Stripe/Zoom/Resend/OpenAI values. Never copy the primary checkout's
production `.env.local` into this worktree.

Apply the migration only to the local `supabase_db_ao-portal-localtest` container:

```sh
docker exec -i supabase_db_ao-portal-localtest psql -U postgres -v ON_ERROR_STOP=1 -1 < supabase/migrations/20261027083312_account_access_controls.sql
```

Start the app on port 3200, then run:

```sh
node scripts/test-account-access.mjs
```

Set `LOCAL_TEST_SEED_FILE` in the ignored local environment to the private handover's
`local-test/seed-users.json` if it is outside this worktree.

The suite asserts the exact local URL, creates disposable users, tests access with
JWTs minted before disable, checks blockers and history, then removes only its own
fixtures and verifies original row counts. It does not call Stripe.

Verified locally: 78 integration/regression checks; desktop and 375px phone
screens; disable/re-enable and disabled sign-in/sign-out in the browser; targeted
ESLint and TypeScript; production build. The local security advisor reports
pre-existing objects (including owner-rights views); no findings name the new
access tables or functions. This is not a production security audit.

## Production rollout, not yet authorised

1. Review the local code and tests; do not push without Raj's approval.
2. Review the live catalogue and function grants read-only for production drift.
3. With specific approval, run the documented production row-count check and the
   rolled-back migration dry run, then check again.
4. With separate approval, apply the additive migration and verify access controls
   and row counts. No account is disabled by applying the migration.
5. Deploy code only after the tables/functions are available. Without the migration,
   the access lookup deliberately fails closed.
6. Raj tests live sign-in; agents do not sign in to production.

The rollback section in the migration restores policy/trigger behaviour without
deleting access or audit rows. Restore application code before removing guards.
