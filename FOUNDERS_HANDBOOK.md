# Access Oxbridge - Founders Handbook

Last updated: 2026-03-20

**What this is:** The operational brain of the portal. How to run the business day-to-day, what every flow does, what to do when things break, and what to watch as you grow.

**What this is NOT:** A technical developer reference. For that, see [MANUAL.md](./MANUAL.md).

**Companion docs:**
- [MANUAL.md](./MANUAL.md) - Technical architecture, code structure, developer troubleshooting
- [PENDING_TASKS.md](./PENDING_TASKS.md) - Deployment blockers (also listed in Section 5 below)

---

## 1. Quick Reference Card

**Production URL:** `https://accessoxbridge.vercel.app`

**Key Dashboard Paths:**

| Role | Home | Key Pages |
|------|------|-----------|
| Admin | `/dashboard/admin` | `/admin/approvals`, `/admin/payouts`, `/admin/manage-sessions`, `/admin/students` |
| Student | `/dashboard/student` | `/student/sessions`, `/student/mentors`, `/student/profile`, `/student/events` |
| Mentor | `/dashboard/mentor` | `/mentor/requests`, `/mentor/sessions`, `/mentor/training`, `/mentor/payouts` |

**Key Business Numbers:**

| Metric | Value | Where It's Set |
|--------|-------|----------------|
| Mentor default hourly rate | GBP 25.00 | `mentors.hourly_rate_cents` in database (2500 = GBP 25) |
| Credit-to-session ratio | 1 credit = 1 hour session | Hardcoded in Zoom webhook logic |
| Matching results per request | 12 mentors | `/api/match-mentors` route |
| Session reminder timing | 1 hour + 15 min before | Cron job runs every 15 min |
| Default credit packages | Starter (5 credits, GBP 49), Popular (10, GBP 89), Pro (20, GBP 169) | `/admin/products` in dashboard |

**Service Logins:**

| Service | Login URL | What It's For |
|---------|-----------|---------------|
| Supabase | supabase.com/dashboard | Database, auth, Edge Functions |
| Stripe | dashboard.stripe.com | Payments, payouts, disputes |
| Vercel | vercel.com/dashboard | Hosting, deployments, env vars |
| GitHub | github.com/AccessOxbridge/portal | Code repo, cron job (Actions) |
| Zoom | marketplace.zoom.us | Meeting app config, webhooks |
| OpenAI | platform.openai.com | AI usage, billing |
| Resend | resend.com | Email delivery logs |

---

## 2. External Services & Cost Centres

| Service | What It Does (Business Terms) | Pricing Model | Where to Monitor Usage |
|---------|------------------------------|---------------|----------------------|
| **Supabase** | Stores all data (users, sessions, messages, payments). Handles login/signup. Triggers notification emails. | Free tier or Pro plan (monthly) | Supabase dashboard > Usage |
| **Stripe** | Processes student credit purchases. Takes a % fee per transaction. | ~2.9% + 30p per transaction | Stripe dashboard > Payments |
| **Stripe Connect** | Sends money to mentor bank accounts. Each transfer has a small fee. | Per-transfer fee | Stripe dashboard > Connect > Transfers |
| **Zoom** | Creates video meetings for sessions. Records sessions and generates transcripts for AI reports. | Per-host license (monthly/annual) | Zoom admin portal |
| **OpenAI** | Powers mentor matching (finds best mentors for each student). Generates session reports and fortnightly reports. | Pay-per-use (per token) | platform.openai.com > Usage |
| **Resend** | Delivers all notification emails (reminders, reports, mentor requests). | Free tier or per-email pricing | resend.com > Logs |
| **Vercel** | Hosts the website. Auto-deploys when code is pushed to GitHub. | Free tier or Pro plan | Vercel dashboard > Usage |
| **GitHub** | Stores the code. Runs the reminder cron job every 15 minutes via Actions. | Free for private repos (with limits) | GitHub > Actions tab |

**Monthly Cost Audit Checklist:**

- [ ] Check Supabase dashboard for database size and API call usage
- [ ] Check Stripe dashboard for total fees paid this month
- [ ] Check OpenAI usage page for total spend (this can spike with more sessions)
- [ ] Check Vercel for function invocation count and bandwidth
- [ ] Check Resend for email volume
- [ ] Check Zoom subscription renewal date
- [ ] Record total monthly spend in your tracking spreadsheet

---

## 3. All User Flows

Each flow has a placeholder for a Loom recording. Record each one by walking through it on the live portal and paste the link.

---

### Student Flows

#### Flow 1: Student Signup & Email Verification

**Loom:** `[LOOM: record this]`

**What happens:** A student creates an account with email and password, then verifies their email before accessing the dashboard.

**Steps:**
1. Student visits `/signup` and selects "Student" role
2. Enters full name, email, password (optionally a member code for referral tracking)
3. Supabase Auth creates the user and sends a verification email
4. Student clicks the verification link in their inbox
5. Redirected to `/dashboard/student` (the student home page)

**Dashboard path:** `/signup` then `/dashboard/student`

**What can go wrong:**
- Verification email lands in spam - tell student to check spam/junk folder
- Member code doesn't work - check the `creators` table in Supabase for valid codes

---

#### Flow 2: Student Onboarding

**Loom:** `[LOOM: record this]`

**What happens:** Student fills out their academic profile so the AI matching system can find the best mentors for them.

**Steps:**
1. Student is prompted to complete onboarding at `/dashboard/student/onboarding/[step]`
2. Fills in: school name, curriculum type, subjects with predicted grades, target universities, target course, application year, interests, extracurriculars, parent email, timezone, availability
3. This data is saved to the `student_profiles` table
4. Parent email is used later for fortnightly reports

**Dashboard path:** `/dashboard/student/onboarding/1` (multi-step)

**What can go wrong:**
- Student skips onboarding - they can still use the platform but AI matching will be less accurate
- Parent email wrong - fortnightly reports won't reach parents. Admin can fix via `/admin/students`

---

#### Flow 3: Student Buys Credits

**Loom:** `[LOOM: record this]`

**What happens:** Student purchases a credit package using their card. Credits are added to their balance and can be used to book sessions.

**Steps:**
1. Student views credit packages on their dashboard (or `/dashboard/student/services`)
2. Selects a package (e.g. 10 credits for GBP 89)
3. Redirected to Stripe Checkout (hosted payment page)
4. Enters card details and pays
5. Stripe sends a webhook (`checkout.session.completed`) to our server
6. Server adds credits to the student's balance, records the transaction
7. Student sees updated credit count on their dashboard
8. Redirected to `/dashboard/student/credits/success`

**Dashboard path:** `/dashboard/student/services`

**What can go wrong:**
- Student paid but credits not showing - the Stripe webhook may have failed. Check Stripe dashboard > Webhooks for failed deliveries. Check Vercel function logs. If needed, manually update `profiles.credits` in Supabase and add a row to `credit_transactions`
- Stripe checkout page errors - check `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel env vars

---

#### Flow 4: Student Requests Mentors (AI Matching)

**Loom:** `[LOOM: record this]`

**What happens:** Student submits a matching request. The AI analyses their profile and finds the 12 best-matched mentors based on subjects, interests, and goals. All 12 mentors are notified.

**Steps:**
1. Student clicks "Book a Session" or equivalent on their dashboard
2. System sends their profile data to `/api/match-mentors`
3. OpenAI generates an embedding (a numerical representation) of the student's profile
4. The embedding is compared against all mentor embeddings using vector similarity search
5. Top 12 matches are returned
6. A `mentorship_request` is created for each mentor (status: `pending`)
7. Each mentor receives an email + in-app notification about the new request
8. Student sees their pending requests on their dashboard

**Dashboard path:** `/dashboard/student` (home page has the booking trigger)

**What can go wrong:**
- No mentors matched - there may be too few active mentors, or the student's profile is too sparse. Encourage onboarding completion
- OpenAI API error - check `OPEN_AI_API_KEY` in Vercel env vars. Check OpenAI usage page for quota/billing issues
- Credits are NOT deducted at this stage (only when a session is completed)

---

#### Flow 5: Student Joins a Session

**Loom:** `[LOOM: record this]`

**What happens:** Student joins a scheduled Zoom session with their mentor using the link from their dashboard.

**Steps:**
1. After a mentor accepts the request and a session is scheduled, a Zoom meeting is auto-created
2. Student sees the upcoming session at `/dashboard/student/sessions`
3. Session card shows the Zoom join URL
4. Student receives reminders: 1 hour before (email + in-app) and 15 minutes before (in-app only)
5. Student clicks the Zoom link to join the session

**Dashboard path:** `/dashboard/student/sessions`

**What can go wrong:**
- Zoom link doesn't work - the Zoom meeting may have expired or Zoom OAuth credentials may need refreshing. Check Vercel logs for Zoom API errors
- No reminder received - check if the GitHub Actions cron job is running (GitHub > Actions tab)

---

#### Flow 6: Student Views Session Reports

**Loom:** `[LOOM: record this]`

**What happens:** After a session, the AI generates a personalized report combining the Zoom transcript and the mentor's feedback. The student can view this from their dashboard.

**Steps:**
1. Session ends (Zoom webhook fires `meeting.ended`)
2. Zoom processes the recording and transcript (can take minutes to hours)
3. Our system polls for the transcript, downloads it, and parses it
4. Mentor submits their session report (see Flow 11)
5. OpenAI combines the transcript + mentor feedback to generate a personalized report
6. Report saved and visible at `/dashboard/student/reports`

**Dashboard path:** `/dashboard/student/reports`

**What can go wrong:**
- No report appears - the Zoom transcript may still be processing (can take up to 2x the session length). Check Vercel logs for transcript polling
- Report quality is poor - the AI prompt can be edited in `config/prompts.config.ts` without code changes. Adjust the instructions there

---

#### Flow 7: Student Submits Feedback

**Loom:** `[LOOM: record this]`

**What happens:** After a session ends, the student can rate the session and provide feedback.

**Steps:**
1. Session ends and student receives a notification
2. Student navigates to `/dashboard/student/sessions/[id]/feedback`
3. Fills in the feedback form with rating and comments
4. Feedback saved to `form_responses` table (type: `student_feedback`)
5. Admin can view all feedback at `/admin/feedbacks`

**Dashboard path:** `/dashboard/student/sessions/[id]/feedback`

**What can go wrong:**
- Student doesn't submit feedback - this is optional, no enforcement mechanism currently

---

#### Flow 7b: Student Messages Mentor

**Loom:** `[LOOM: record this]`

**What happens:** Students and mentors can chat in real-time through the portal. An admin is automatically added to every conversation as a silent observer (and can jump in if needed).

**Steps:**
1. Student visits `/dashboard/student/messages`
2. Sees existing conversations with their mentors
3. Opens a conversation and types a message
4. Message appears in real-time for the mentor (Supabase Realtime, no page refresh needed)
5. Admin is auto-assigned to the conversation and can view it from `/dashboard/admin/messages`
6. Admin can send messages too (prefixed with `[ADMIN]` to distinguish them)

**Dashboard path:** `/dashboard/student/messages` (student), `/dashboard/mentor/messages` (mentor), `/dashboard/admin/messages` (admin)

**What can go wrong:**
- Messages not appearing in real-time - check Supabase Realtime status in the Supabase dashboard
- Conversations are unique per student-mentor pair (can't have duplicate threads)

---

#### Flow 7c: Student Registers for Events

**Loom:** `[LOOM: record this]`

**What happens:** Students can browse and register for webinars and in-person events. After events end, recording links become available.

**Steps:**
1. Student visits `/dashboard/student/events`
2. Chooses between "Webinars" and "In-Person" tabs
3. Sees upcoming events with title, description, host, date, capacity
4. Clicks "Register Now" (button checks capacity - won't allow if event is full)
5. Can "Cancel Registration" if plans change
6. After a webinar ends, a "Watch Recording" button appears if admin uploaded a recording URL

**Dashboard path:** `/dashboard/student/events/webinars`, `/dashboard/student/events/in-person`

**What can go wrong:**
- Event shows full but shouldn't be - check `events.capacity` in Supabase vs actual `event_registrations` count

---

#### Flow 7d: Student Reports Mentor Absent

**Loom:** `[LOOM: record this]`

**What happens:** If a mentor doesn't show up to a session, the student can report them absent. This creates a high-priority issue and urgently notifies the mentor and all admins.

**Steps:**
1. Student is in an active session (Zoom meeting started or within scheduled window)
2. Student clicks "Report Absent" on the session page
3. System creates a high-priority issue in `user_issues` (type: session, priority: high)
4. All admins receive a system alert notification
5. The mentor receives an urgent notification: "Student waiting in the meeting!"
6. Duplicate reports for the same session are prevented

**Dashboard path:** Available during active sessions at `/dashboard/student/sessions`

**What can go wrong:**
- Button only appears during the session window - student can't report absent before or long after the session time

---

#### Flow 7e: Password Reset

**Loom:** `[LOOM: record this]`

**What happens:** User resets their forgotten password via email link.

**Steps:**
1. User clicks "Forgot password?" on the login page
2. Enters their email at `/forgot-password`
3. Supabase Auth sends a password reset link
4. User clicks the link in their email
5. Enters new password (minimum 6 characters) at `/reset-password`
6. Password updated, user can log in with the new password

**Dashboard path:** `/forgot-password` then `/reset-password`

**What can go wrong:**
- Reset link expired - links are time-limited. The page shows a clear error message and the user can request a new one
- Email in spam - same as signup verification

---

### Mentor Flows

#### Flow 8: Mentor Signup & Application

**Loom:** `[LOOM: record this]`

**What happens:** A mentor creates an account and submits their application with bio, experience, CV, and photo for admin review.

**Steps:**
1. Mentor visits `/signup` and selects "Mentor" role
2. Enters full name, email, password
3. After login, redirected to `/dashboard/mentor/onboarding`
4. Fills application form: bio, phone, university, subjects they can mentor (grouped by Oxford/Cambridge), experience, LinkedIn, photo upload, CV upload
5. Submits application - status set to `pending_approval`
6. Admin receives notification to review the application
7. Mentor sees a "Pending Approval" screen and cannot access the full dashboard

**Dashboard path:** `/signup` then `/dashboard/mentor/onboarding`

**What can go wrong:**
- Photo/CV upload fails - check Supabase Storage limits
- Mentor can't find their subjects - subject list is defined in `config/mentor-onboarding.config.ts`

---

#### Flow 9: Mentor Training & Onboarding (Post-Approval)

**Loom:** `[LOOM: record this]`

**What happens:** After admin approves the mentor, they complete a 7-step onboarding process before they can start mentoring.

**Steps (7 sequential steps):**
1. **Welcome** - Introduction to the platform
2. **Training** - Read training content / watch training videos
3. **Quiz** - Take a quiz on the training material (NOTE: answer validation is not yet implemented - this is a known gap)
4. **Contract** - Digitally sign the mentoring contract (stored as `contract_signature` with timestamp)
5. **DBS Certificate** - Upload background check certificate (stored as `dbs_certificate_url`)
6. **Payment Setup** - Complete Stripe Connect onboarding to receive payouts. Creates a Stripe Connected Account linked to the mentor's bank
7. **Profile Completion** - Finalize photo, bio, and expertise

**Dashboard path:** `/dashboard/mentor/training`

**What can go wrong:**
- Stripe Connect onboarding doesn't complete - the mentor may have abandoned the Stripe flow. They can restart it from step 6
- DBS certificate upload fails - check Supabase Storage
- Mentor skips steps - steps are enforced in sequence, they can't skip ahead

---

#### Flow 10: Mentor Accepts/Rejects Student Requests

**Loom:** `[LOOM: record this]`

**What happens:** Mentors see incoming requests from students and can accept or reject each one.

**Steps:**
1. Mentor receives notification of new request (email + in-app)
2. Views pending requests at `/dashboard/mentor/requests`
3. Sees student profile info and match context
4. Accepts or rejects the request
5. If accepted: a session is created, Zoom meeting is auto-scheduled, student is notified
6. If rejected: student is notified, request status updated to `rejected`

**Dashboard path:** `/dashboard/mentor/requests`

**What can go wrong:**
- Zoom meeting creation fails - check Zoom OAuth credentials in Vercel env vars
- Mentor doesn't respond - requests will sit as `pending`. Consider following up manually

---

#### Flow 11: Mentor Completes Session Report

**Loom:** `[LOOM: record this]`

**What happens:** After a session ends, the mentor fills out a report form. This report is combined with the Zoom transcript by AI to generate the student's personalized report.

**Steps:**
1. Session ends (Zoom webhook fires)
2. Mentor receives notification "Session Report Required"
3. Mentor navigates to `/dashboard/mentor/sessions/[id]/report`
4. Fills in: topics covered, areas of improvement, next steps, overall rating (1-5), student engagement level, additional notes
5. Report saved to `form_responses` table (type: `mentor_report`)
6. If the transcript is ready, AI generates the personalized student report by combining this feedback with the transcript
7. Report becomes visible to the student and admin

**Dashboard path:** `/dashboard/mentor/sessions/[id]/report`

**What can go wrong:**
- Mentor doesn't submit report - the personalized AI report won't generate. Follow up manually
- AI report quality - edit the prompt template in `config/prompts.config.ts`

---

#### Flow 12: Mentor Views Payouts

**Loom:** `[LOOM: record this]`

**What happens:** Mentors can see their earnings history and payout status.

**Steps:**
1. Mentor visits `/dashboard/mentor/payouts`
2. Sees completed sessions and calculated earnings
3. Sees payout history (pending, processing, paid, failed)
4. Can report issues with payouts

**Dashboard path:** `/dashboard/mentor/payouts`

**What can go wrong:**
- Payout shows as "failed" - check Stripe Connect dashboard for the mentor's account issues. Common cause: mentor didn't complete Stripe onboarding fully

---

#### Flow 12b: Mentor Reports Student Absent

**Loom:** `[LOOM: record this]`

**What happens:** If a student doesn't show up to a session, the mentor can report them absent. Creates a high-priority issue and notifies admins and the student.

**Steps:**
1. Mentor is in an active session (Zoom meeting started or within scheduled window)
2. Mentor clicks "Report Absent" on the session page
3. System creates a high-priority issue in `user_issues` (type: session, priority: high)
4. All admins receive a system alert notification
5. The student receives a notification: "Your mentor reported you were absent"
6. Duplicate reports for the same session are prevented

**Dashboard path:** Available during active sessions at `/dashboard/mentor/sessions`

---

#### Flow 12c: Mentor Availability View

**Loom:** `[LOOM: record this]`

**What happens:** Mentors can view their upcoming sessions on a weekly calendar.

**Steps:**
1. Mentor visits `/dashboard/mentor/availability`
2. Sees a weekly calendar view showing their upcoming sessions (next 30)
3. Each session shows the student's name and a "Start Zoom" button

**Dashboard path:** `/dashboard/mentor/availability`

**Important note:** This page is a **view-only calendar**, not an availability-setting tool. Mentors do not set their own available time slots. Sessions are created when mentors accept student requests (Flow 10). If you want mentors to set custom availability hours in the future, this would need to be built.

---

### Admin Flows

#### Flow 13: Admin Approves/Dismisses Mentor Applications

**Loom:** `[LOOM: record this]`

**What happens:** Admin reviews pending mentor applications and either approves (activating the mentor for matching) or dismisses (sends back to edit their application).

**Steps:**
1. Visit `/dashboard/admin/approvals`
2. See list of mentors with status `pending_approval`
3. Review each application: bio, CV, photo, experience, background check status
4. **Approve**: System generates an OpenAI embedding for the mentor (used in AI matching), sets status to `active`
5. **Dismiss**: Sets status back to `details_required`, mentor can re-apply

**Dashboard path:** `/dashboard/admin/approvals`

**What can go wrong:**
- Embedding generation fails - check `OPEN_AI_API_KEY` in Vercel env vars
- Approving without reviewing - always check CV and photo before approving

---

#### Flow 14: Admin Processes Fortnightly Payouts

**Loom:** `[LOOM: record this]`

**What happens:** Every two weeks, admin calculates what each mentor is owed based on completed sessions and processes Stripe transfers to their bank accounts.

**Steps:**
1. Visit `/dashboard/admin/payouts`
2. Select date range (defaults to start of year to today)
3. System calculates: finds completed sessions in that period, looks up each mentor's hourly rate, excludes already-batched sessions
4. Review breakdown: mentor name, sessions count, total minutes, amount owed
5. Select mentors to pay and click "Process"
6. System creates Stripe transfers to each mentor's Connected Account
7. Payout records created in `mentor_payouts` and `mentor_payout_items`
8. Stripe Connect webhook updates status to "paid" when transfer completes

**Dashboard path:** `/dashboard/admin/payouts`

**Payout calculation:** `amount = (total_minutes / 60) * hourly_rate_cents`

**What can go wrong:**
- Transfer fails for a mentor - their Stripe Connect account may not be fully set up. Check `mentors.payouts_enabled` in Supabase
- Wrong amount - verify the mentor's `hourly_rate_cents` in the `mentors` table. Default is 2500 (GBP 25/hr)
- Sessions not appearing - they must have status `completed` and not already be in a payout batch

---

#### Flow 15: Admin Sends Fortnightly Student/Parent Reports

**Loom:** `[LOOM: record this]`

**What happens:** Every two weeks, admin generates AI-powered progress reports for students and their parents, then sends them via email.

**Steps:**
1. Visit `/dashboard/admin/fortnightly-report`
2. See students who had sessions in the current fortnightly period
3. Preview reports before sending (the system generates two versions per student):
   - **Student report**: Warm, encouraging tone with performance indicators (scored 0-100) and trajectory assessment
   - **Parent report**: Formal, respectful tone with Oxbridge positioning benchmark, risk flags, and medium-term strategy
4. Send reports via email (uses Resend directly, not the Edge Function)

**Dashboard path:** `/dashboard/admin/fortnightly-report`

**What can go wrong:**
- Email not delivered - check Resend dashboard for delivery status
- Parent email missing - update via `/admin/students`, it's stored in `student_profiles.parent_email`
- Report quality - edit AI prompts in `config/prompts.config.ts`. The file has clear comments on each placeholder

---

#### Flow 16: Admin Manages Sessions (Reassign Mentors)

**Loom:** `[LOOM: record this]`

**What happens:** Admin can view all sessions and reassign a different mentor to a session if needed (e.g., original mentor unavailable).

**Steps:**
1. Visit `/dashboard/admin/manage-sessions`
2. View all active/upcoming sessions
3. To reassign: select a session, choose a new mentor
4. System notifies both the old mentor and new mentor via email
5. Zoom meeting details may need to be updated

**Dashboard path:** `/dashboard/admin/manage-sessions`

---

#### Flow 17: Admin Manages Students & Clients

**Loom:** `[LOOM: record this]`

**What happens:** Admin can search, view, and manage all student profiles and client organizations.

**Steps:**
1. Visit `/dashboard/admin/students` or `/dashboard/admin/clients`
2. Search and filter students
3. View academic profiles, session history, credit balance
4. Update parent email for fortnightly reports
5. Send notifications or take actions

**Dashboard path:** `/dashboard/admin/students`, `/dashboard/admin/clients`

---

#### Flow 18: Admin Manages Blog/Articles

**Loom:** `[LOOM: record this]`

**What happens:** Admin creates and edits blog articles that appear on the student resources page.

**Steps:**
1. Visit `/dashboard/admin/blog`
2. See all articles with status, categories, publish date
3. Create new: `/dashboard/admin/blog/create`
4. Edit existing: `/dashboard/admin/blog/edit/[id]`
5. Articles support categories: Oxbridge Admissions, Interview Tips, Personal Statement, UK Universities, Student Stories
6. Can be featured, have tags, and include reading time

**Dashboard path:** `/dashboard/admin/blog`

---

#### Flow 19: Admin Manages Events/Webinars

**Loom:** `[LOOM: record this]`

**What happens:** Admin creates webinars and in-person events that students can register for.

**Steps:**
1. Visit `/dashboard/admin/events`
2. Create event with: title, description, host, type (webinar/in-person), date, duration, capacity, location or meeting URL
3. Students see events at `/dashboard/student/events` (split into webinars and in-person)
4. Students register; admin sees registration count

**Dashboard path:** `/dashboard/admin/events`

---

#### Flow 20: Admin Manages Creators (Referral Program)

**Loom:** `[LOOM: record this]`

**What happens:** Admin manages referral codes for content creators. When a student signs up with a member code, the creator's referral count is incremented.

**Steps:**
1. Visit `/dashboard/admin/creators`
2. View creators with their referral codes and counts
3. Create new creator entries with unique member codes
4. Students enter the code at signup, tracked automatically

**Dashboard path:** `/dashboard/admin/creators`

---

#### Flow 21: Admin Views Issues & Feedback

**Loom:** `[LOOM: record this]`

**What happens:** Admin reviews student feedback from sessions and user-reported issues (bugs, payment problems, session issues).

**Steps:**
1. **Feedback:** `/dashboard/admin/feedbacks` - see all student ratings and comments from sessions
2. **Issues:** `/dashboard/admin/issues` - see reported problems with status tracking (open, in_progress, resolved, closed)
3. **Student help:** `/dashboard/admin/student-help` - support tickets
4. Admin can update issue status and add notes

**Dashboard path:** `/dashboard/admin/feedbacks`, `/dashboard/admin/issues`, `/dashboard/admin/student-help`

---

#### Flow 22: Admin Manages Credit Packages & Pricing

**Loom:** `[LOOM: record this]`

**What happens:** Admin creates and edits the credit packages students can purchase.

**Steps:**
1. Visit `/dashboard/admin/products`
2. See all credit packages with name, credits, price, active status
3. Create/edit packages: name, description, credits amount, price in pence, currency, sort order, "popular" badge
4. Changes are live immediately (no deploy needed - stored in database)

**Dashboard path:** `/dashboard/admin/products`

---

### Automated / System Flows

#### Flow 23: Session Reminders (Cron Job)

**What happens:** Every 15 minutes, a scheduled job checks for upcoming sessions and sends reminders to both students and mentors.

**How it works:**
1. GitHub Actions workflow runs every 15 minutes
2. Hits `/api/cron/reminders` on the production URL
3. Finds sessions where `scheduled_at` is within 1 hour -> sends email + in-app notification (if not already sent)
4. Finds sessions where `scheduled_at` is within 15 minutes -> sends in-app notification only (if not already sent)
5. Flags are set (`reminder_sent`, `short_reminder_sent`) to prevent duplicate notifications

**What can go wrong:**
- Cron not running - check GitHub > Actions tab. May need to re-enable the workflow
- Wrong environment - the `SITE_URL` GitHub secret controls which deployment is hit. Make sure it points to production
- `CRON_SECRET` mismatch - the secret in GitHub Actions must match the one in Vercel env vars

---

#### Flow 24: Zoom Webhook Processing

**What happens:** When a session starts or ends on Zoom, webhooks automatically update the portal - marking sessions as started/completed, deducting credits, and triggering report generation.

**How it works:**
1. **Meeting started** (`meeting.started`): Session status updated to "started"
2. **Meeting ended** (`meeting.ended`):
   - Session marked as completed
   - 1 credit deducted from student's balance
   - Both parties notified
   - Background process starts polling for the transcript
3. **Recording completed** (`recording.completed` / `recording.transcript_completed`):
   - Transcript downloaded and parsed
   - Combined with mentor's report (if submitted) to generate AI report

**What can go wrong:**
- Webhook not received - check Zoom Marketplace app > Webhooks for delivery logs
- Credits not deducted - check Vercel function logs for errors in the Zoom webhook handler
- Transcript never arrives - Zoom can take a while. The system polls in the background. Check Vercel logs

---

#### Flow 25: Stripe Connect Webhooks (Payout Updates)

**What happens:** When payout transfers complete or fail, Stripe webhooks update the payout status in our system.

**How it works:**
1. `account.updated`: Updates mentor's `payouts_enabled` status (did they finish Stripe onboarding?)
2. `transfer.created` / `transfer.updated`: Marks payout as "paid" or "failed" with error message

**What can go wrong:**
- Webhook not received - check Stripe dashboard > Webhooks for delivery logs
- Payout stuck as "pending" - the Stripe Connect webhook secret may be misconfigured. Check `STRIPE_CONNECT_WEBHOOK_SECRET` in Vercel env vars

---

## 4. Routine Operations Calendar

| Frequency | Task | Where | Notes |
|-----------|------|-------|-------|
| **Every fortnight** | Process mentor payouts | `/admin/payouts` | Select date range, verify amounts, process transfers |
| **Every fortnight** | Send student/parent reports | `/admin/fortnightly-report` | Preview reports before sending |
| **Weekly** | Review pending mentor applications | `/admin/approvals` | Aim to respond within 48 hours |
| **Weekly** | Check open support issues | `/admin/issues` | Respond to or close resolved tickets |
| **Weekly** | Review student feedback scores | `/admin/feedbacks` | Flag any low ratings for follow-up |
| **Monthly** | Audit external service costs | Each service dashboard | Record in tracking spreadsheet (see Section 2 checklist) |
| **Monthly** | Check GitHub Actions cron health | GitHub repo > Actions tab | Verify no failures in the last 30 days |
| **Monthly** | Check Vercel deployment logs | Vercel dashboard | Look for function errors or timeouts |
| **Quarterly** | Rotate API keys | Vercel env vars + Supabase secrets | Update keys for all services, redeploy |
| **Quarterly** | Verify database backups | Supabase dashboard > Backups | Confirm automated backups are running |

---

## 5. Known Issues, Tech Debt & Pending Work

### Pending Deployment Tasks

These are blocking items that need to be done (from [PENDING_TASKS.md](./PENDING_TASKS.md)):

1. **Add RESEND_API_KEY to Supabase Edge Function secrets on prod** - Email notifications won't send without this. Go to Supabase Dashboard > Prod Project > Edge Functions > send-email-notifications > add secret
2. **Redeploy Edge Function** - The email template links to the wrong URL. Code fix is committed but needs CLI deployment (see PENDING_TASKS.md for commands)
3. **Delete `prod_migration.sql`** - One-time migration file, no longer needed

### Known Tech Debt

| Issue | Impact | Severity |
|-------|--------|----------|
| **Refund logic not implemented** | If a student requests a Stripe refund, credits are NOT automatically returned. Must be handled manually in Supabase | High |
| **Quiz validation not implemented** | Mentor training quiz accepts any answers. Step 3 of onboarding is effectively skipped | Medium |
| **No error monitoring** | No Sentry or equivalent. Errors only visible in Vercel function logs (which expire) | Medium |
| **No rate limiting** | API endpoints have no request throttling. Could be abused | Medium |
| **Notification trigger URL hardcoded** | The database function that sends emails has the prod Supabase project URL hardcoded. If you change Supabase projects, this must be updated manually | Low (unless migrating) |
| **Legal page is a stub** | `/admin/legal` has only a heading, no content | Low |
| **Default role fallback** | Dashboard defaults to "student" view if role lookup fails, instead of showing an error | Low |

---

## 6. "What To Do When" - Business Troubleshooting

### "A student says they paid but have no credits"

1. Go to Stripe dashboard > Payments > search for the student's email
2. Confirm the payment was successful
3. Go to Stripe dashboard > Webhooks > check if the `checkout.session.completed` webhook was delivered
4. If webhook failed: manually update `profiles.credits` in Supabase (add the correct number), and insert a row into `credit_transactions` with type `purchase`
5. If webhook succeeded but credits still missing: check Vercel function logs for errors

### "A mentor's payout failed"

1. Check `/admin/payouts` for the error message
2. Go to Stripe dashboard > Connect > find the mentor's account
3. Common cause: mentor didn't complete Stripe Connect onboarding (missing bank details)
4. Ask mentor to complete setup at `/dashboard/mentor/training` (step 6)
5. Re-process the payout once their account is active

### "A parent didn't get the fortnightly report"

1. Check Resend dashboard (resend.com) for the email delivery status
2. If not sent: verify parent email in Supabase `student_profiles.parent_email` (admin can also check via `/admin/students`)
3. If sent but not received: ask parent to check spam. Consider adding your sending domain to their contacts
4. Re-send from `/admin/fortnightly-report`

### "No transcript/report after a session"

1. Zoom transcription can take up to 2x the session duration - wait first
2. Check Vercel function logs for transcript polling attempts
3. Verify the Zoom meeting had cloud recording enabled (it should be automatic)
4. If transcript exists in Zoom but report wasn't generated: check OpenAI API key and usage limits

### "Need to give a student free credits"

1. Open Supabase dashboard > Table Editor > `profiles`
2. Find the student by email
3. Update their `credits` field (add the number you want to give)
4. Insert a new row in `credit_transactions`: set `user_id`, `amount` (positive number), `balance_after`, `type` = `admin_adjustment`, `description` = reason for the adjustment

### "Need to change a mentor's hourly rate"

1. Open Supabase dashboard > Table Editor > `mentors`
2. Find the mentor by ID
3. Update `hourly_rate_cents` (value is in pence, so GBP 30/hr = 3000)
4. Note: there is currently no admin UI for this - it must be done directly in the database

### "The cron job (session reminders) stopped running"

1. Go to GitHub > AccessOxbridge/portal > Actions tab
2. Check if the "Session Reminders" workflow has recent failures
3. If workflows stopped: they may have been auto-disabled by GitHub (happens after 60 days of no repo activity). Re-enable manually
4. To test immediately: click "Run workflow" on the Actions page
5. Verify GitHub secrets `SITE_URL` and `CRON_SECRET` are set correctly

### "Emails aren't being sent at all"

1. Check if `RESEND_API_KEY` is set as a Supabase Edge Function secret (not just Vercel env var) - this is the most common cause
2. Go to Supabase dashboard > Edge Functions > send-email-notifications > Logs
3. Check Resend dashboard for delivery failures
4. Note: in-app notifications still work even if email fails. The email trigger has error handling that doesn't roll back the notification

---

## 7. Credentials & Access Map

Fill this table in with your actual account emails. **Never put passwords in this file** - use a password manager and note which one here.

| System | Login URL | Account Email | Password Location | Who Has Access |
|--------|-----------|--------------|-------------------|----------------|
| Supabase | supabase.com/dashboard | `[fill in]` | `[password manager]` | `[Founder A, B]` |
| Stripe | dashboard.stripe.com | `[fill in]` | `[password manager]` | `[Founder A, B]` |
| Vercel | vercel.com | `[fill in]` | GitHub SSO | `[Founder A, B]` |
| GitHub | github.com | `[fill in]` | `[password manager]` | `[Founder A, B]` |
| Zoom | zoom.us | `[fill in]` | `[password manager]` | `[fill in]` |
| OpenAI | platform.openai.com | `[fill in]` | `[password manager]` | `[fill in]` |
| Resend | resend.com | `[fill in]` | `[password manager]` | `[fill in]` |
| Domain Registrar | `[fill in]` | `[fill in]` | `[password manager]` | `[fill in]` |

**Where are the API keys/secrets stored?**

| Secret | Location |
|--------|----------|
| All Next.js env vars (Stripe keys, Zoom keys, OpenAI key, etc.) | Vercel > Project Settings > Environment Variables |
| `RESEND_API_KEY` for email | Vercel env vars AND Supabase Edge Function secrets (both required) |
| `CRON_SECRET` and `SITE_URL` | GitHub repo > Settings > Secrets and Variables > Actions |
| Supabase service role key | Vercel env vars (never expose client-side) |

---

## 8. Business Continuity & Handoff

### Bus Factor Checklist

Can each founder independently perform these tasks? Check off once verified:

- [ ] Log into all 7 external services
- [ ] Process fortnightly mentor payouts
- [ ] Send fortnightly student reports
- [ ] Approve a pending mentor application
- [ ] Handle a Stripe payment dispute
- [ ] Manually add credits to a student account
- [ ] Re-enable the GitHub Actions cron job
- [ ] Deploy a code change via GitHub (push to `main`)
- [ ] Access Vercel function logs to debug an issue
- [ ] Access Supabase to query or update data

### Minimum Viable Operations

If one founder is completely unavailable, these are the only things that MUST happen:

**Every two weeks:**
1. Process mentor payouts (`/admin/payouts`) - mentors expect timely payment
2. Send fortnightly reports (`/admin/fortnightly-report`) - parents expect these

**Weekly:**
3. Check `/admin/approvals` for pending mentors - delays hurt recruitment

**Everything else can wait** until the other founder returns.

### Onboarding a New Team Member

If you bring on an operations person or developer:

1. **First:** Give them read access to this handbook and MANUAL.md
2. **Then:** Give them access to the dev Supabase project (never prod initially)
3. **Then:** Add them as a collaborator on GitHub (they can see code, not deploy)
4. **Only after trust is established:** Add them to Vercel team and prod Supabase
5. **Never share directly:** Service role key, Stripe live keys, or production database credentials. Always use the service dashboards to grant scoped access

### Handing Off to a Developer

1. Point them to [MANUAL.md](./MANUAL.md) first - it has everything technical
2. Give them access to the dev Supabase project and GitHub repo
3. Local setup: clone repo, `bun install`, create `.env.local` from `env.example`, `bun run dev`
4. They should work on the `dev` branch, never push directly to `main`
5. Code review their PRs before merging to `main` (auto-deploys to production)

---

## 9. Growth & Scaling Notes

### Current Architecture Limits to Watch

| Concern | Current State | When to Act |
|---------|--------------|-------------|
| **Zoom** | Single Zoom account for all sessions | When concurrent sessions regularly overlap, consider multiple host licenses |
| **Vercel serverless timeouts** | Default 10s for hobby, 60s for Pro | Transcript polling runs as background task; if it times out, transcripts may not process. Monitor |
| **Supabase plan limits** | Check your plan's row limits, API call limits, storage | When approaching 80% of any limit |
| **OpenAI costs** | Pay-per-use, scales with session count | Set a monthly budget alert on platform.openai.com |
| **Resend** | Free tier has daily email limits | When daily notification volume exceeds free tier |

### Features from Original Plan Not Yet Built

These were in the original requirements (`plan.md`) but haven't been implemented:

- **Wise integration** for international payouts (currently Stripe-only)
- **PostHog** for product analytics (no analytics currently)
- **Intercom** for in-app customer support chat (currently using issues system)
- **Google integration** (calendar sync, etc.)
- **White-labelling** for other organizations

### Features to Consider Next

- **Refund flow** - Currently a manual process. Automate credit return when Stripe refund happens
- **Cancellation policy enforcement** - No automated cancellation rules exist
- **Calendar sync** - Let mentors sync availability with Google/Outlook calendar
- **Automated session scheduling** - Currently mentor must manually accept and schedule. Could automate time slot selection
- **Mentor rating system** - Student feedback exists but isn't aggregated into a visible mentor rating
- **Parent dashboard** - Currently parents only receive email reports. A read-only parent view could add value

---

## 10. Stripe: Test Mode vs Live Mode

Stripe mode is controlled entirely by which API keys you use. There is no code switch.

| Key Prefix | Mode | Real Money? |
|------------|------|-------------|
| `sk_test_` / `pk_test_` | Test | No - use Stripe test cards (e.g. `4242 4242 4242 4242`) |
| `sk_live_` / `pk_live_` | Live | Yes - real charges to real cards |

**Where the keys are set:**
- **Local dev:** `.env.local` file (should always be test keys)
- **Production:** Vercel > Project Settings > Environment Variables

**How to switch to live mode:**
1. Go to Stripe dashboard > toggle off "Test mode" in the top bar
2. Copy the live keys from Developers > API Keys
3. Update these Vercel env vars: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Create new webhook endpoints in Stripe for the live mode (test and live webhooks are separate)
5. Update `STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET` in Vercel with the new live webhook signing secrets
6. Redeploy on Vercel (or push any commit to `main`)

**Important:** Test mode and live mode have completely separate data. Customers, payments, and connected accounts created in test mode do not exist in live mode. Mentors will need to re-do Stripe Connect onboarding after you switch.

---

## 11. Webhook URLs - What to Update if Domain Changes

If you ever change your production URL (e.g. from `accessoxbridge.vercel.app` to a custom domain), you must update webhook endpoints in **three** places:

| Service | Where to Update | Current URL Pattern |
|---------|----------------|-------------------|
| **Stripe** | Stripe dashboard > Developers > Webhooks | `https://[your-domain]/api/webhooks/stripe` |
| **Stripe Connect** | Same page, separate webhook | `https://[your-domain]/api/webhooks/stripe-connect` |
| **Zoom** | Zoom Marketplace > Your App > Feature > Event Subscriptions | `https://[your-domain]/api/webhooks/zoom` |
| **Supabase notification trigger** | Inside the database function `handle_new_notification` (hardcoded URL) | Must be updated via SQL in Supabase SQL Editor |
| **GitHub Actions cron** | GitHub repo > Settings > Secrets > `SITE_URL` | `https://[your-domain]` |
| **Vercel env vars** | Vercel > Project Settings > Env Vars > `NEXT_PUBLIC_APP_URL` | `https://[your-domain]` |

**The Supabase one is easy to miss.** The database trigger that sends email notifications has the Supabase Edge Function URL hardcoded. To update it, run this in Supabase SQL Editor (replacing the project ref if needed):

```sql
-- View the current function to see the hardcoded URL:
\df+ handle_new_notification
```

Then recreate the function with the updated URL. See MANUAL.md for details.

---

## 12. Key Supabase Queries

Copy-paste these into Supabase SQL Editor when you need quick answers. Go to Supabase dashboard > SQL Editor > New Query.

**Platform overview:**
```sql
-- How many users by role?
SELECT role, COUNT(*) FROM profiles GROUP BY role;

-- How many active mentors?
SELECT COUNT(*) FROM mentors WHERE status = 'active' AND is_active = true;

-- How many students with completed profiles?
SELECT COUNT(*) FROM student_profiles WHERE is_complete = true;
```

**Revenue and credits:**
```sql
-- Total revenue this month (in GBP)?
SELECT SUM(amount_paid_cents) / 100.0 AS total_gbp
FROM credit_purchases
WHERE status = 'completed'
  AND completed_at >= date_trunc('month', CURRENT_DATE);

-- Total revenue all time?
SELECT SUM(amount_paid_cents) / 100.0 AS total_gbp
FROM credit_purchases
WHERE status = 'completed';

-- Students with zero credits (may need to buy more)?
SELECT p.full_name, p.email, p.credits
FROM profiles p
WHERE p.role = 'student' AND p.credits = 0
ORDER BY p.full_name;
```

**Sessions:**
```sql
-- Sessions completed this month?
SELECT COUNT(*) FROM sessions
WHERE status = 'completed'
  AND updated_at >= date_trunc('month', CURRENT_DATE);

-- Upcoming sessions in next 7 days?
SELECT s.scheduled_at, p1.full_name AS student, p2.full_name AS mentor
FROM sessions s
JOIN profiles p1 ON s.student_id = p1.id
JOIN profiles p2 ON s.mentor_id = p2.id
WHERE s.status = 'active'
  AND s.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY s.scheduled_at;

-- Mentors with no sessions in the last 30 days?
SELECT m.id, p.full_name, p.email
FROM mentors m
JOIN profiles p ON m.id = p.id
WHERE m.status = 'active'
  AND m.id NOT IN (
    SELECT DISTINCT mentor_id FROM sessions
    WHERE updated_at >= NOW() - INTERVAL '30 days'
  );
```

**Payouts:**
```sql
-- Total paid to mentors this month?
SELECT SUM(amount_cents) / 100.0 AS total_gbp
FROM mentor_payouts
WHERE status = 'paid'
  AND paid_at >= date_trunc('month', CURRENT_DATE);

-- Mentors with pending (unpaid) sessions?
SELECT p.full_name, COUNT(s.id) AS unpaid_sessions, SUM(s.duration_minutes) AS total_minutes
FROM sessions s
JOIN profiles p ON s.mentor_id = p.id
WHERE s.status = 'completed'
  AND s.id NOT IN (SELECT session_id FROM mentor_payout_items)
GROUP BY p.full_name
ORDER BY unpaid_sessions DESC;
```

**Feedback and issues:**
```sql
-- Average student rating this month?
SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_ratings
FROM form_responses
WHERE form_type = 'student_feedback'
  AND created_at >= date_trunc('month', CURRENT_DATE);

-- Open issues by priority?
SELECT priority, COUNT(*) FROM user_issues
WHERE status IN ('open', 'in_progress')
GROUP BY priority;
```

---

## 13. Data & Privacy

### What Sensitive Data You Store

| Data Type | Where Stored | Who Can Access |
|-----------|-------------|---------------|
| Student personal info (name, email, school, subjects) | `profiles` + `student_profiles` tables | Student themselves, their assigned mentors, admins |
| Parent email addresses | `student_profiles.parent_email` | Admins only |
| Mentor personal info (name, email, phone, bio) | `profiles` + `mentors` tables | Mentors themselves, matched students (limited), admins |
| DBS certificates | Supabase Storage (`mentors.dbs_certificate_url`) | Admins only |
| Mentor CVs | Supabase Storage (`mentors.cv_url`) | Admins only |
| Session transcripts | `session_reports.raw_transcript` + Zoom cloud | Admins, possibly students via transcript URL |
| Payment data | Stripe (card details never touch our database) | Via Stripe dashboard only |
| Chat messages | `messages` table | Conversation participants + admins |
| Session recordings | Zoom cloud storage | Via Zoom admin only |

### Key Privacy Considerations

- **Card details are safe** - Stripe handles all payment data. Card numbers never touch your database or servers
- **DBS certificates** contain sensitive personal information - ensure Supabase Storage bucket is private (not publicly accessible)
- **Session transcripts** may contain personal conversations - consider retention policies
- **Zoom recordings** are stored on Zoom's cloud - check your Zoom plan's retention settings

### If Someone Asks "Delete My Data" (GDPR)

There is currently **no automated data deletion flow**. If a user requests data deletion:

1. Delete their row from `profiles` (this cascades to most related tables via foreign keys)
2. Delete their `student_profiles` or `mentors` record
3. Delete any files in Supabase Storage (CV, photo, DBS certificate)
4. Delete their Zoom recordings manually from Zoom admin
5. Remove them from Stripe (Stripe dashboard > Customers > delete)
6. Delete their Supabase Auth account (Supabase dashboard > Auth > Users > delete)

**Recommendation:** Consider building an automated "delete my account" feature, especially if you handle data from EU users or UK minors.

---

## 14. Rollback Procedure

If a bad deploy goes to production and something breaks:

### Quick Rollback via Vercel (2 minutes)

1. Go to Vercel dashboard > your project > Deployments
2. Find the last working deployment (the one before the broken one)
3. Click the three dots menu (⋯) next to it
4. Click "Promote to Production"
5. The previous version is now live. The broken deploy is still there but no longer serving traffic

This is instant and safe. No code changes needed.

### If You Need to Fix Forward Instead

1. Fix the code on the `dev` branch
2. Test locally with `bun run dev`
3. Merge `dev` into `main`
4. Vercel auto-deploys the fix

### If the Database Was Affected

If the issue involves corrupted data (not just broken UI/API):

1. **Don't panic** - Supabase has point-in-time recovery (depending on your plan)
2. Go to Supabase dashboard > Project Settings > Backups
3. Use point-in-time restore to roll back to before the issue
4. **Warning:** This rolls back ALL data, including any valid changes made after the restore point

For smaller data issues, fix manually via SQL Editor rather than restoring the entire database.

---

## 15. Email Sender Domain

**Current state:** Notification emails are sent from `Oxbridge Portal <onboarding@resend.dev>`. This is Resend's default testing domain.

**Problem:** Emails from `@resend.dev` are more likely to land in spam and look unprofessional.

**How to fix (set up your own domain):**

1. Go to Resend dashboard > Domains > Add Domain
2. Add your domain (e.g. `accessoxbridge.com` or `accessoxbridge.io`)
3. Resend will give you DNS records (SPF, DKIM, DMARC) to add at your domain registrar
4. Add the DNS records and verify in Resend
5. Update the Edge Function sender address:
   - File: `supabase/functions/send-email-notifications/index.ts`
   - Change: `from: 'Oxbridge Portal <onboarding@resend.dev>'`
   - To: `from: 'Access Oxbridge <noreply@accessoxbridge.com>'` (or your preferred address)
6. Redeploy the Edge Function to both dev and prod Supabase projects

---

## 16. Zoom Settings Dependencies

The portal auto-creates Zoom meetings with cloud recording and transcription enabled. But some settings need to be correct at the **Zoom admin level** for this to work.

**Settings that MUST be enabled in Zoom admin (zoom.us > Settings):**

| Setting | Why It's Needed |
|---------|----------------|
| Cloud recording | Sessions are recorded for transcript generation |
| Audio transcription | Transcripts are used by AI to generate session reports |
| Auto-recording to cloud | Ensures recording starts automatically (mentor doesn't have to remember) |

The portal code tries to enable these automatically when creating meetings, but if they're disabled at the admin level, the API call may silently fail.

**How to verify:**
1. Log into zoom.us with the account used for the portal
2. Go to Settings > Recording
3. Ensure "Cloud recording" is ON
4. Ensure "Audio transcript" is ON
5. Ensure "Automatic recording" is set to "Record in the cloud"

**If transcripts stop appearing**, this is the first thing to check.

---

## 17. How the Notification/Email Chain Works

Understanding this chain helps debug "emails aren't sending" issues. There are 4 links in the chain - if any one breaks, emails stop but in-app notifications still work.

```
App inserts notification → Database trigger fires → Supabase Edge Function runs → Resend sends email
```

**Step by step:**

1. **App code** inserts a row into the `notifications` table (with `recipient_email`, `title`, `message`)
2. **Database trigger** (`handle_new_notification`) fires on INSERT and calls the Edge Function via HTTP POST
3. **Edge Function** (`send-email-notifications`) receives the notification data and calls Resend API
4. **Resend** delivers the email to the recipient

**Where to check at each step:**

| Step | Where to Check | Common Issue |
|------|---------------|-------------|
| 1. Notification inserted? | Supabase > Table Editor > `notifications` | App error prevented insert |
| 2. Trigger fired? | Supabase > Database > Triggers (or SQL Editor) | Trigger disabled or URL wrong |
| 3. Edge Function ran? | Supabase > Edge Functions > send-email-notifications > Logs | `RESEND_API_KEY` not set as secret |
| 4. Email delivered? | Resend dashboard > Logs | Recipient email invalid, spam filter, domain not verified |

**Key detail:** The trigger has error handling - if the Edge Function or Resend fails, the notification row is NOT rolled back. So in-app notifications always work even if email fails. This is by design.

---

## 18. Admin-Dev Testing Role

There is a special `admin-dev` role that lets you test the platform as if you were a student or mentor, without creating separate accounts.

**How to use it:**
1. Sign up with role "Admin (Dev)" - this option only appears when `NEXT_PUBLIC_ENV` is set to `dev`
2. Navigate to `/dashboard/student/*` to see the student experience
3. Navigate to `/dashboard/mentor/*` to see the mentor experience
4. Navigate to `/dashboard/admin/*` to see the admin experience
5. The system detects which dashboard you're viewing and shows the appropriate interface

**When it's useful:**
- Testing the full student booking flow without creating a real student account
- Verifying what mentors see when they receive a request
- Demoing the platform to potential partners or investors

**Important:** This role should never exist in production. It's gated behind the `dev` environment variable, so it won't appear on the live signup page.

---

## 19. Health Check - "Is Everything Working?"

There is no automated monitoring. Here's a manual checklist to verify the platform is healthy. Run through this if something feels off or after a deploy.

| Check | How | Healthy State |
|-------|-----|--------------|
| **Site is up** | Visit `https://accessoxbridge.vercel.app` | Login page loads |
| **Auth works** | Try logging in | Dashboard loads after login |
| **Database connected** | Visit any dashboard page that shows data | Data appears (mentors, sessions, etc.) |
| **Cron running** | GitHub > Actions > "Session Reminders" | Recent runs show green checkmarks |
| **Stripe webhooks** | Stripe dashboard > Developers > Webhooks | Recent events show 200 status |
| **Zoom webhooks** | Zoom Marketplace > Your App > Event Subscriptions | Endpoint is active |
| **Email working** | Trigger a test notification, check Resend dashboard | Email appears in Resend logs |
| **Edge Function up** | Supabase > Edge Functions > send-email-notifications | Status shows "Active", recent logs present |
| **OpenAI accessible** | Approve a test mentor (generates embedding) | No errors in Vercel logs |

**Recommendation:** Set up a free uptime monitor (e.g. UptimeRobot, Better Uptime) to ping your production URL every 5 minutes and alert you if the site goes down.

---

## 20. Bulk Mentor Import (One-Off Script)

There are two import scripts at the repo root for bulk-importing mentors from a CSV file. These were used during initial setup and can be reused if you onboard a batch of mentors at once.

**`import-mentors.ts`** (full import - creates new accounts):
1. Reads a CSV file with mentor details (name, email, bio, university, phone, etc.)
2. Creates Supabase Auth accounts with temporary passwords (`TempPass<random>`)
3. Creates profile and mentor records
4. Generates OpenAI embeddings for each mentor (for AI matching)
5. Sets status to `pending_approval` (admin still needs to approve)

**`import-mentors-only.ts`** (lighter import - existing accounts only):
1. Reads a CSV file
2. Looks up existing auth users by email (does NOT create new accounts)
3. Creates/updates mentor records for those users

**How to run:**
```bash
bun run import-mentors -- path/to/mentors.csv
```

**When to use:** If you recruit a batch of mentors (e.g. from a university society) and want to create their accounts in bulk rather than having each one sign up individually. They'll still need to complete onboarding (Flow 9) after their accounts are created.

**Important:** These scripts require direct database access (service role key) and OpenAI API key. Only run locally with `.env.local` configured.

---

## 21. Database Triggers Reference

The database has 4 automatic triggers. These run silently in the background - you don't need to do anything, but knowing they exist helps with debugging.

| Trigger | Fires When | What It Does |
|---------|-----------|-------------|
| `on_auth_user_created` | New user signs up | Creates a row in `profiles` table. If role is mentor, also creates a `mentors` row with status `details_required` |
| `on_notification_created` | Notification inserted | Calls the Edge Function to send an email via Resend (see Section 17) |
| `on_auth_user_updated_sync_email` | User changes email in Auth | Syncs the new email to `profiles.email` so they stay in sync |
| `update_conversations_updated_at` | Conversation updated | Keeps the `updated_at` timestamp current (for sorting conversations by recent activity) |

**Why this matters:** If a user signs up but their profile doesn't appear, the first trigger may have failed. If emails stop sending, the second trigger may be disabled. Check Supabase > Database > Triggers to verify they're all active.

---

## 22. Duplicate/Confusing Routes Clarification

A few things in the dashboard that might cause confusion:

| What You See | What It Actually Is |
|-------------|-------------------|
| `/student/services` and `/student/credits` | **Same page** - both show credit packages for purchase. Not separate features |
| `/mentor/availability` | **View-only calendar** of scheduled sessions, NOT a tool for mentors to set their available hours. Availability is implicitly determined by which requests they accept |
| `/admin/sessions` | Shows **completed** sessions with transcript links |
| `/admin/manage-sessions` | Shows **active/upcoming** sessions with reassignment options |
| `/admin/student-help` and `/admin/issues` | Both show user-reported problems. `issues` is the main table, `student-help` filters to student-specific tickets |
| `/admin/legal` | **Stub page** - just a heading with no actual content yet |
