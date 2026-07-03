# Notification email cleanup — migrate to branded `lib/email`

## Background

There are **two email paths** in the codebase:

1. **Notification trigger (generic, currently BROKEN).** Inserting a row into
   `notifications` with a non‑empty `recipient_email` fires the DB trigger
   `handle_new_notification()`, which POSTs to the `send-email-notifications`
   Supabase edge function. That trigger sends **no `Authorization` header**, and
   the function enforces JWT, so **every call returns `401` and no email is sent**
   (the trigger swallows the 401 silently). Even if it worked, the template is a
   plain unbranded box.
2. **Branded direct (`lib/email`, WORKS in prod).** `sendEmail()` in
   `lib/email/client.ts` posts straight to Resend with `RESEND_API_KEY`, using the
   canonical branded `layout()` in `lib/email/templates.ts` (navy header + gold
   logo + social footer).

**Decision:** standardize on path 2. Do **not** fix the trigger — fixing it would
send a **duplicate** (unbranded) email on every flow that already sends a branded
one, and would only add unbranded emails to the rest.

> Proven: a no-auth POST to the function returns `401 UNAUTHORIZED_NO_AUTH_HEADER`;
> the same POST with a bearer token returns `200`.

---

## The pattern (how to migrate one flow)

For each flow that should email:

1. Add a branded template in `lib/email/templates.ts` (a function that calls
   `layout({ title, preheader, paragraphs, signOff })` — copy an existing one).
2. In the route, `import { sendEmail, EMAIL_SENDER_TEAM } from '@/lib/email/client'`
   and the new template, then `await sendEmail({ from, to, subject, html })`.
3. **Set the notification's `recipient_email: ''`** so the (broken/removable)
   trigger never double-sends. Keep the in-app notification row (it still powers
   the dashboard bell).

> ⚠️ `RESEND_API_KEY` must be set in the app env. It's present in prod (Vercel)
> but **empty in `.env.local`**, so branded emails don't send during local testing
> until you add it.

---

## 1) DUPLICATES — recipient already gets a branded email → just delete the email intent

These notification inserts sit **next to a branded `sendEmail()` for the same
recipient and same event**. Today they're harmless (the trigger 401s), but they're
redundant. **Fix = set `recipient_email: ''`** on these inserts (keep the in-app
row). No new template needed — the branded email already exists.

| File:line | Recipient | Notification title (duplicate) | Branded email already sent |
|---|---|---|---|
| `app/api/admin/students/assign-mentor/route.ts:158` | student | "Your mentor has been assigned" | `studentMatched` |
| `app/api/admin/students/assign-mentor/route.ts:173` | new mentor | "You have a new assigned student" | `mentorMatched` |
| `app/dashboard/mentor/requests/actions.ts:156` | student | "Mentorship Request Accepted!" | `sessionConfirmedStudent` |
| `app/dashboard/mentor/requests/actions.ts:174` | mentor | "Session Confirmed!" | `sessionConfirmedMentor` |

---

## 2) TRIGGER-ONLY (BROKEN) — no branded fallback → add a branded email

These have **no** branded `sendEmail()` today, so the intended email is simply not
being delivered. **Fix = add a branded template + `sendEmail()`**, then set the
notification's `recipient_email: ''`.

| File:line | Recipient | Notification title | New template to add |
|---|---|---|---|
| `app/api/admin/sessions/reassign-mentor/route.ts:124` | old mentor | "Session reassigned to another mentor" | `sessionReassignedOldMentor` |
| `app/api/admin/sessions/reassign-mentor/route.ts:141` | new mentor | "New session assigned to you" | `sessionAssignedNewMentor` |
| `app/api/admin/students/assign-mentor/route.ts:188` | old mentor | "A student has been reassigned" | `studentReassignedOldMentor` |
| `app/api/student/book-session/route.ts:129` | mentor | "New Session Request" | `newSessionRequestMentor` |
| `app/api/student/request-credits/route.ts:82` | admins | "Session credits request" | `creditsRequestAdmin` |
| `app/api/student/help/route.ts:69` | admins | "New help & support request" | `helpRequestAdmin` |
| `app/api/student/report-mentor-absent/route.ts:105` | admins | "Student reported: Mentor absent" | `mentorAbsentAdmin` |
| `app/api/mentor/report-student-absent/route.ts:105` | admins | "Mentor reported: Student absent" | `studentAbsentAdmin` |
| `app/dashboard/admin/clients/actions.ts:53` | client | "Welcome to the Oxbridge {role} Portal" | `clientWelcome` |

> Note: `report-mentor-absent:116` and `report-student-absent:116` already use
> `recipient_email: ''` (in-app only, urgent live-session pings) — **leave them**.

---

## 3) Already migrated on this branch (`feat/mentor-invoicing`) — reference

| File | Recipient | Email | Status |
|---|---|---|---|
| `app/api/mentor/invoices/[id]/submit/route.ts` | admins | "Invoice sent to finance" (`invoiceSubmittedAdmin`) | ✅ branded, `recipient_email: ''` |
| `app/api/admin/payouts/route.ts` (`emitRemittance`) | mentor | "You've been paid …" (`paymentRemittanceMentor`) | ✅ branded, `recipient_email: ''` |

These are the template for how to do the rest.

---

## 4) In-app only — no action

These insert notifications with `recipient_email: ''` on purpose (dashboard bell,
no email) or already email via branded/other paths — leave as-is:
`cron/reminders` (branded 1‑hr reminders + in-app rows), `cron/session-inactivity`,
`cron/first-session-followup`, `messages/notify`, `webhooks/stripe`,
`webhooks/zoom`, `reports/generate`.

---

## Checklist

- [ ] Delete the 4 duplicates → set `recipient_email: ''` (§1).
- [ ] Add 9 branded templates + `sendEmail()` calls (§2), each with
      `recipient_email: ''` on the notification.
- [ ] Confirm `RESEND_API_KEY` / `RESEND_FROM_EMAIL` set wherever you test.
- [ ] (Optional) Once nothing depends on the trigger, drop
      `handle_new_notification()` and the `on_notification_created` trigger, or
      leave them inert (they only fire a harmless 401).
