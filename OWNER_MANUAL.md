# Portal Owner Manual

Last updated: 2026-02-06

This manual describes the technical setup and day-to-day operations for the portal. It is designed so a technical owner, developer, or operations team member can take over without prior context.

**Scope**

- High-level architecture and component interactions
- Hosting and infrastructure overview
- External services and integrations
- Codebase structure and local setup
- Database overview and backup/restore
- Admin and operations workflows
- Configuration, monitoring, and maintenance

## High-Level Architecture

**Tech stack**

- Frontend and backend: Next.js 16 (App Router), React 19, TypeScript
- Database and auth: Supabase (Postgres + Auth + RLS)
- Payments: Stripe (Checkout) and Stripe Connect (mentor payouts)
- Video and transcripts: Zoom (server-to-server OAuth, webhooks, cloud recordings)
- AI: OpenAI (embeddings and report generation)
- Email: Resend (via Supabase Edge Function)
- Styling: Tailwind CSS v4 + PostCSS

**Component interaction summary**

- Web app and API routes run in the Next.js app.
- Supabase provides database, auth, RLS enforcement, and Edge Functions.
- Stripe handles payments for credit packages and mentor payouts.
- Zoom handles session scheduling, and webhooks update session status and trigger report generation.
- OpenAI is used for mentor matching (embeddings) and session report generation.
- A cron job hits a Next.js API route to send session reminders.

**System diagram**

```mermaid
graph LR
  U[Users] -->|Web| NX[Next.js App]
  NX -->|Auth/DB| SB[(Supabase Postgres + Auth)]
  NX -->|Payments| ST[Stripe + Stripe Connect]
  NX -->|Scheduling| ZM[Zoom API]
  ZM -->|Webhooks| NX
  NX -->|AI| OA[OpenAI]
  SB -->|Edge Function| RS[Resend Email]
  CRON[Cron Scheduler] -->|/api/cron/reminders| NX
```

## Hosting and Infrastructure

**Current hosting**

- The portal is hosted & deployed on Vercel edge network.

**Environments**

- `dev` and `prod`

**Deployment process**

- Every commit to the repository automatically pushes the new changes to the portal.

**Backups and recovery**

- All Code is stored & backedup in github. Supabase provides automated Postgres backups and point-in-time restore depending on plan.

## External Services, APIs, and Integrations

**Supabase**

- Used for Postgres database, authentication, RLS policies, and Edge Functions.
- Configuration:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Supabase Edge Function: `supabase/functions/send-email-notifications/index.ts`

**Stripe and Stripe Connect**

- Used for credit package purchases and mentor payouts.
- Configuration:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- Webhook handlers:
- `/app/api/webhooks/stripe/route.ts`
- `/app/api/webhooks/stripe-connect/route.ts`

**Zoom**

- Used for creating scheduled meetings, recording, and transcripts.
- Configuration:
- `ZOOM_ACCOUNT_ID`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_WEBHOOK_SECRET_TOKEN`
- Webhook handler:
- `/app/api/webhooks/zoom/route.ts`

**OpenAI**

- Used for mentor matching (embeddings) and session report generation.
- Configuration:
- `OPEN_AI_API_KEY`
- Usage:
- `/app/api/match-mentors/route.ts`
- `/app/dashboard/admin/approvals/actions.ts`
- `/utils/reports.ts`

**Resend**

- Used for email notifications via Supabase Edge Function.
- Configuration:
- `RESEND_API_KEY`
- Edge Function:
- `/supabase/functions/send-email-notifications/index.ts`

**Cron scheduler**

- External scheduler is required to call `/api/cron/reminders` every 10-15 minutes.
- Configuration:
- `CRON_SECRET` (optional)

**Other config keys observed in code**

- `NEXT_PUBLIC_HOME_PAGE_URL` (admin blog)
- `NEXT_PUBLIC_APP_URL` (Stripe redirect fallback, not present in `.env`)
- `NEXT_PUBLIC_ENV` (feature gating in signup page)

## Codebase and Repository Structure

**Top-level layout**

- `/app`: Next.js App Router pages and API routes
- `/components`: Shared UI components
- `/config`: Form configs, onboarding configs, and AI prompts
- `/utils`: Supabase clients, Stripe, Zoom, OpenAI, reports, email helpers
- `/supabase/migrations`: Database schema migrations
- `/supabase/functions`: Supabase Edge Functions
- `/public`: Static assets
- `/assets`: Design assets
- `/migrations`: Additional one-off SQL migration file
- `/import-mentors.ts`, `/import-mentors-only.ts`: Import scripts for mentor data

**Routing summary**

- Public landing: `/app/page.tsx`
- Auth: `/app/(auth)` and `/app/auth/*`
- Dashboard: `/app/dashboard/*`
- Admin sections: `/app/dashboard/admin/*`
- API routes: `/app/api/*`

**Local setup**

Prerequisites:

- Node.js (20.x recommended)
- Bun (used for import scripts and lockfile)

Steps:

1. Install dependencies: `bun install` (or `npm install` if preferred).
2. Create `.env` with required keys (see the list in the Integrations section).
3. Run the dev server: `bun run dev` or `npm run dev`.
4. Ensure Supabase project and schema are available (apply migrations in `/supabase/migrations`).

**Important project notes**

- Next.js server actions are used in admin workflows (e.g., approvals).
- Supabase service role key is required for admin and webhook logic.
- Zoom transcription processing is asynchronous and requires valid Zoom OAuth credentials.
- The email helper in `/utils/email.ts` is currently a mock; production email delivery is via the Supabase Edge Function.

## Database Overview

The database schema is defined in Supabase migrations and mirrored in `/utils/supabase/types.ts`.

**Primary tables**

- `profiles`: Unified user profile data, including roles and credits.
- `mentors`: Mentor-specific data including status and Stripe account details.
- `student_profiles`: Student-specific data and onboarding info.
- `sessions`: Scheduled mentorship sessions with Zoom details and statuses.
- `mentorship_requests`: Requests created during matching and scheduling.
- `session_reports`: AI-generated reports and transcripts.
- `messages`, `conversations`: In-app messaging.
- `credit_packages`, `credit_purchases`, `credit_transactions`: Credits and payments.
- `mentor_payouts`, `mentor_payout_items`: Stripe Connect payout tracking.
- `notifications`: System notifications and email triggers.
- `events`, `event_registrations`: Webinars and in-person events.
- `articles`: Blog content.
- `creators`: Referral or creator program.
- `user_issues`: Reported issues.
- `form_responses`: Form data (e.g., onboarding or surveys). Student feedback is stored here with `form_type = student_feedback`.\n@@\n-**Issues and feedback**\n-\n-- Locations: `/dashboard/admin/issues` and `/dashboard/admin/feedbacks`\n-- Feedback and reported issues are stored in `feedbacks` and `user_issues` tables.\n+**Issues and feedback**\n+\n+- Locations: `/dashboard/admin/issues` and `/dashboard/admin/feedbacks`\n+- Student feedback is read from `form_responses` (filtered by `form_type = student_feedback`).\n+- Reported issues are stored in `user_issues`.\n*** End Patch to=functions.apply_patch code **}예 code is not correct code goes here.}>**Commentary to=functions.apply_patch  中国福利彩票天天  彩神争霸输钱json to=functions.apply_patch code כאן code instead of taking>

**RLS and service role**

- Client requests use Supabase Auth and RLS.
- Admin operations and webhooks use the service role key via server-side Supabase clients.

**Backup and restore**

- Use Supabase dashboard backups if enabled in your plan.
- For manual backups, use `pg_dump` against the Supabase Postgres connection string.
- For restore, use Supabase point-in-time restore or `psql` with a known good dump.

## Admin and Operations Guide

Admin pages live under `/dashboard/admin`.

**Mentor approvals**

- Location: `/dashboard/admin/approvals`
- Approving a mentor generates an OpenAI embedding and activates the mentor.
- Dismissing a mentor sets status back to `details_required`.

**Mentor management**

- Location: `/dashboard/admin/mentors`
- View mentor profiles, status, session counts, feedback, and payouts.
- Mentor Stripe Connect status is tracked in `mentors.payouts_enabled`.

**Students and clients**

- Locations: `/dashboard/admin/students` and `/dashboard/admin/clients`
- Admins can create users, manage profiles, and follow up on activity.

**Sessions and scheduling**

- Student views: `/dashboard/student/sessions`
- Sessions link to Zoom meetings; status is updated by Zoom webhooks.
- Reminders are sent by the cron route, which must be called regularly.

**Reports**

- Location: `/dashboard/admin/reports`
- AI reports are generated when Zoom transcripts are received.

**Payments and credits**

- Credit packages: `/dashboard/admin/products`
- Purchases and transactions: `/dashboard/admin/transactions`
- Stripe Checkout webhook updates credits and transactions.

**Payouts**

- Location: `/dashboard/admin/payouts`
- Stripe Connect webhooks update payout status in `mentor_payouts`.

**Blog and content**

- Location: `/dashboard/admin/blog`
- Articles stored in `articles` table.

**Events**

- Location: `/dashboard/admin/events`
- Events stored in `events` and `event_registrations`.

**Issues and feedback**

- Locations: `/dashboard/admin/issues` and `/dashboard/admin/feedbacks`
- Feedback and reported issues are stored in `feedbacks` and `user_issues` tables.

## Configuration, Updates, and Maintenance

**Environment configuration**

- Local development uses `.env` in the repo root.
- Production keys should be stored in the hosting provider’s environment variables and in Supabase Edge Function env settings.

**Schema changes**

- New tables and changes should be added to Supabase migrations in `/supabase/migrations`.
- Keep `/utils/supabase/types.ts` updated after schema changes.

**Deployments**

- Ensure the deployment environment includes all required keys.
- Ensure webhook endpoints are updated in Stripe and Zoom after deployment URL changes.

**Routine maintenance**

- Verify cron reminders are running and returning success.
- Monitor webhook logs for Stripe and Zoom.
- Confirm OpenAI usage is within budget.
- Review failed payouts and unresolved user issues weekly.

## Common Workflows and Troubleshooting

**Mentor approval fails**

- Check `OPEN_AI_API_KEY` is set.
- Verify Supabase service role key access.

**Payments not reflecting credits**

- Check Stripe webhook delivery and `STRIPE_WEBHOOK_SECRET`.
- Confirm `credit_purchases` and `credit_transactions` are updated.

**Zoom session not updating**

- Check Zoom webhook subscription and `ZOOM_WEBHOOK_SECRET_TOKEN`.
- Confirm `sessions.zoom_meeting_id` matches Zoom meeting ID.

**AI report not created**

- Confirm transcript webhook received.
- Check OpenAI API key and usage limits.
- Ensure Zoom transcript download URL is valid.

**Reminder emails not sent**

- Confirm the cron job is running.
- Check `CRON_SECRET` configuration.
- Check Supabase Edge Function logs and Resend API key.

