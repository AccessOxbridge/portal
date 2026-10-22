# Parent profile: V1 plan (draft for discussion)

Status: built and tested locally on `feat/parent-profile` (22 Oct): database
rules, admin "Parents" page, and the real parent pages. Nothing parent-related
is applied to production yet.
Last updated: 22 Oct 2026

## Build status (22 Oct)

| Piece | Status |
| --- | --- |
| Security prerequisites (profiles read scope, private fields, write-rule audit, email relay, chat rules) | Live on production |
| Sign-up trigger fix (`20261022134710`, PR #32) | Live on production. Only mentor or student comes from sign-up; other roles are set by server code after `createUser` |
| `20261022180000_parent_role.sql` (role value) | Tested locally |
| `20261022180100_parent_access.sql` (links, read access to one child, no writes) | Tested locally |
| `20261022180200_parent_details.sql` (optional child's name, "has the child signed in") | Tested locally |
| Admin `/dashboard/admin/parents` | Create a parent (before or after the student exists, optional child's name, optional link), link, unlink (kept as history), edit child's name, suggestions from students' saved parent email. Tested in the browser |
| Parent pages `/dashboard/parent` (+ sessions, reports, recordings) | The 8 widgets on real data; parent nav and mobile tab bar. The mockup now renders the same component with sample data |
| `/api/parent/request-hours` | Linked parents only; one open request a day; files a `user_issues` row (reporter_type parent) and notifies admins |
| `/api/recording/[sessionId]` | Also allows the linked parent |
| `app/dashboard/admin/layout.tsx` | Every admin page is admin-only on the server (five admin pages were client-only with no server check) |
| Tests (local) | 74 parent page/route checks, 33 parent database checks, chat/batch-1/notification suites, and the 104-page crawl for all six existing users unchanged |

### What the parent sees

| Widget | Source | Notes |
| --- | --- | --- |
| Progress graph | completed sessions, last 10 weeks; plan line from `student_session_targets` | Same counting rule as the pace check and milestones (status completed). Empty: faded sample line |
| Next session | earliest `active` session in the future | No topic until the booking topic field exists |
| Sessions attended | total completed, last 4 weeks, upcoming booked | "This term" and attendance rate wait for agreed definitions |
| Session reports | `session_reports`, newest first | Summary, key points and next steps, or the written report (behind "Read full report" when both exist). Not the mentor's private form |
| Mentor | current assignment (else the next session's mentor); `mentors` bio, photo, college, specialisation | |
| Success manager | Claire Marlowe, Senior Strategist, office@accessoxbridge.io | Same for every family for now; no photo |
| Onboarding checklist | child signed in; profile `is_complete`; current mentor; any non-cancelled session | Moves to the bottom once complete |
| Goals and milestones | `target_university`, `target_course`, `application_year`; session milestones | |

Times are shown in the child's time zone, labelled on every page.

### Production rollout (each step needs approval)

1. Read-only dry run of the three parent migrations as a real student,
   mentor and admin (transaction rolled back), then apply them in order,
   with the row-count check before and after. They change nothing for
   existing users (the local crawl is identical before and after).
2. Merge and deploy the code.
3. Pilot: create one parent account, link it, check what they see.

Parent accounts are created by the server. `createUser` makes a student
profile (the trigger cannot see app_metadata, which Supabase writes after the
insert); the admin action then sets the role to parent with the service role,
checks it, and deletes the account if that fails. Never from sign-up
metadata.

**Found while building (not fixed, needs its own change):** the `mentors`
table is readable in full by anyone with the public key, signed in or not
("Public can view active mentors"). That includes every active mentor's
phone, Stripe account ID, contract signature, CV and DBS certificate links.
It predates the parent work, but a phone number would let a parent get round
"no messaging", so it should be fixed before parents go live.

## The brief, in one line

A parent logs in and sees one big, calm progress page for **their own child only**.
It is read-only. They cannot message mentors, book, cancel, rate or pay. The only
thing they can send is a request for more hours.

## Decisions so far

| Topic | Decision |
| --- | --- |
| Account creation | **Only admins create parent accounts.** No self-signup, no student invites. |
| Parents per student | **One student has one parent account** (V1). |
| Mentor's post-session form | **Not shown to parents.** |
| Recordings | **Always visible** to the linked parent. No request step. |
| Hours | Parents see hours used and hours left, and can **request more hours**. The request goes to the admin, same as the student flow. |
| Fortnightly report | **Not shown.** The feature isn't in use; revisit once it's improved. |
| Learning suggestions | **V2.** When built, they go to both admin and the mentor, one-way (no replies, no thread). |
| Security | **Strictest option**: database rules (RLS), and no admin client on parent pages. |
| Testing | `npm run dev` against the production database (there is no separate DB). Every DB change and every test account needs explicit approval at the time, per CLAUDE.md. |

---

## What the codebase already gives us (checked 21 Oct, read-only)

| Fact | Where | Why it matters |
| --- | --- | --- |
| `user_role` enum is `student, mentor, admin, client, admin-dev` | `00_init_master.sql` | Need to add `parent`. `client` exists but 0 accounts use it. |
| `student_profiles.parent_email` (text) | `20260227000000_…parent_email.sql` | 9 of 34 students have one. 0 match an existing account. Use it to prefill the parent's email when an admin creates the account. |
| `/dashboard` redirects to `/dashboard/${role}` | `app/dashboard/page.tsx` | A `parent` role lands on `/dashboard/parent` with no extra routing. |
| Every student page guards `role === 'student' \|\| 'admin-dev'` | e.g. `app/dashboard/student/reports/page.tsx` | Parents are locked out of student pages already. |
| Recording stream allows only the session's mentor, student or an admin | `app/api/recording/[sessionId]/route.ts` | Needs a "linked parent" check added. |
| Admin can already create student and mentor accounts | `app/dashboard/admin/create-account/actions.ts` | Add "Create parent account" there. |
| Students request hours via `/api/student/request-credits` | creates a `user_issues` row and calls `notifyAdminsOfNewIssue` | The parent version reuses this. But the `user_issues_reporter_type_check` only allows `mentor` and `student`, so it needs `parent` added. |
| **`profiles` read rule is "any signed-in user can read every row"** | `20261008160000_profiles_read_signed_in_only.sql` | See "Fixing the profiles leak". It must be fixed before parents launch. |

### The graph

The mentor `overall_rating` is 5 in 82% of reports, and engagement is "Excellent"
in 76%. A chart of either is a flat line. Since the mentor form is also not shown
to parents, the V1 graph is **sessions completed per week against the target pace**
(`student_session_targets`). A real skills graph needs new, structured mentor
scores (V2).

---

## V1 scope

### Pages

1. **Progress** (`/dashboard/parent`), the one big page:
   - Child header: name, photo, school, year group, target university and course,
     and the entrance exam countdown (reuse `application-timeline.tsx`).
   - **Next session**: date and time in the parent's time zone, plus the mentor's
     name and photo. No join button.
   - Stat row: sessions completed · hours used / hours left · on pace vs target.
   - **Request more hours** button. It opens a short message box and creates an
     admin request.
   - **Activity graph**: sessions per week against target pace.
   - **Latest session report**: summary, key points, action items.
   - Current mentor: name, photo, short bio. No contact details, no message button.
   - Milestones reached.
2. **Sessions**: upcoming list and past history (date, mentor, duration, status).
   No actions.
3. **Reports**: all session reports, newest first.
4. **Recordings**: every recorded session, streamed through our existing route.

### Account and linking

- New role `parent`.
- New table `parent_student_links (parent_id, student_id, created_by, created_at, revoked_at)`
  with a unique constraint on both columns, which enforces one-to-one in the database.
- An admin creates the parent from the student's row. Supabase sends an invite
  email and the parent sets a password. Admins can also revoke a link.

### What a parent can write (and nothing else)

| Action | Where it goes |
| --- | --- |
| Request more hours | A `user_issues` row (`reporter_type = 'parent'`, `issue_type = 'payment'`), plus the existing admin email and notification. |

It goes through a server route that checks the parent link first. The database
gives parents no other INSERT, UPDATE or DELETE rights.

### How "own child only" is enforced

Database rules (RLS), not just checks in our code:

1. Each table the parent reads gets one new SELECT rule: "you're linked to this
   row's student and the link isn't revoked". That covers `sessions`,
   `session_reports`, `student_profiles`, `student_mentor_assignments`,
   `student_session_targets`, `student_session_milestones` and `credit_transactions`.
   These rules only add access for parents. Students, mentors and admins see
   exactly what they see today.
2. No rule at all on `messages`, `conversations`, `form_responses` or payments,
   so parents can't read those.
3. Parent pages never import `createAdminClient()`. The recording route keeps its
   admin client for Zoom, but only after the linked-parent check passes.
4. The profiles fix below closes the one table that's currently open to everyone.

### Out of V1

Messaging · booking, cancelling, rescheduling · join links · rating · satisfaction
surveys · help tickets · paying · mentor post-session form · raw transcripts ·
fortnightly reports · notifications · learning suggestions · siblings / second parent.

---

## Fixing the profiles leak (question 7)

### The problem

`profiles` holds `full_name, email, credits, stripe_customer_id, member_code,
photo_url, role` for every user. Its read rule is `USING (true)` for signed-in
users. So today, any logged-in student or mentor can open the browser console and
list **every** user's name, email and hours balance. Parents would get the same.

### The fix: two steps, each its own PR, both before parents launch

**Step 1: limit which rows you can see.** The new rule is that you can see a
profile if:

- it's you, or
- you're an admin, or
- it's a mentor (students need to see mentor names and photos), or
- you're connected to them: your mentor or your student (via sessions,
  assignments or mentorship requests), someone you're in a conversation with, or
  your linked child.

This is done with one `SECURITY DEFINER` helper, `can_see_profile(id)`, so the rule
doesn't loop back on itself. After it, a student can't see other students at all.

The code impact should be small, because pages only join people you're actually
connected to. We still check each role's main pages after the change.

**Step 2: hide the sensitive columns.** `email, credits, stripe_customer_id` and
`member_code` become visible only to yourself and admins.

- A row rule can't hide individual columns, so logged-in users lose direct read
  access to those four columns.
- A small `get_my_account()` function returns your own values.
- About 46 files read those columns today. Most are admin pages or server code
  that sends emails. Those switch to the server-side admin client, which is fine
  because they run after the caller is checked.
- Without step 2, a parent or student could still read **mentors' email
  addresses**. That's an easy way around "no messaging".

### Making it safe on production

The rule change goes live for everyone the moment it's applied. So:

1. Dry run first, with your approval: inside a transaction, act as a real
   student, a mentor and an admin, check what each one sees, then **roll back**.
2. Apply it, then click through the student, mentor and admin dashboards.
3. Keep the one-line rollback (put back `USING (true)`) ready to paste.

---

## V2+ ideas

| Idea | What it needs |
| --- | --- |
| **Learning suggestions**: parent suggests topics for their child | New `parent_suggestions` table, written through a server route. Shown read-only to admins and to the child's mentor, with no replies. |
| Real skills progress graph | 3–4 structured 1–5 scores on the mentor form. |
| Fortnightly report on the dashboard | Improve the feature, then store each report when it's sent. |
| Parent notifications ("session tomorrow", "report ready") | Opt-in emails via Resend. |
| Parent buys hours directly | Stripe checkout on the parent account. |
| Siblings / second parent | Drop one unique constraint, add a child switcher. |

## Risks

- **R2: write rules that allow "any signed-in user".** Audit every INSERT and
  UPDATE rule (`conversations`, `messages`, `form_responses`, `user_issues`…) so a
  parent login can't, for example, start a chat with a mentor by calling Supabase
  directly.
- **R3: dashboard layout fallback.** `app/dashboard/layout.tsx` inserts a missing
  profile as `student`. Parent creation must write the profile up front with the
  service role.
- **R4: time zones.** Show times in the parent's own zone, labelled. Don't copy
  the 3 known bugs from the 19 Oct audit.
- **R5: consent.** Parents see recordings and reports by default. Add a line to
  the terms and booking consent saying the linked parent can see them, and tell
  mentors. Worth a quick check with whoever owns the privacy policy, especially
  for students aged 18 or over.
- **R6: read state.** Parent pages never read `messages`, so they can't cause any
  `is_read` side effects.

## Design direction

Sources: Refero references plus the `emil-design-eng` and `better-ui` skills.

- **Refero layouts.** Clearful "Insights" (one wide hero chart card above small
  stat cards) for the Progress page. Quizlet account (stacked education stat
  cards) for reports and milestones. Visitors.now (profile on the left, session
  timeline on the right) for Sessions on desktop.
- **Read-only.** Remove actions instead of greying them out. One "View only" pill
  in the header.
- **Motion.** A staggered entrance on first load only (100ms apart, 12px
  translateY + 4px blur, 300ms ease-out). No animation on tabs or row hovers, and
  the chart doesn't animate. All of it is gated by `prefers-reduced-motion`.
- **Press and hover.** Press `scale(0.96)` over 150ms, never on disabled elements.
  Hover only under `@media (hover: hover)`.
- **Surfaces.** Outer radius = inner radius + padding. Shadows for elevation,
  borders only for dividers.
- **Consistency.** Reuse the student components and tokens, so it's the same product.

## Open questions

1. When a parent **requests more hours**, should the request say who it's from
   ("Parent of Amelia")? And do we want anything beyond the admin email and
   notification, such as a status the parent can see?

## Build order

1. **Profiles fix, step 1 (rows)**: its own PR, dry-run and approval before applying.
2. **Profiles fix, step 2 (columns)**: its own PR.
3. Write-rule audit (R2).
4. Parent migration: add the `parent` role, `parent_student_links`, the parent
   SELECT rules, and `parent` on the `user_issues` reporter check. Additive, with
   rollback, approved before applying.
5. Admin: create a parent, link them to a student, revoke the link.
6. Parent shell and nav, then the Progress, Sessions, Reports and Recordings pages.
   They use the parent's own client only.
7. The request-more-hours route, plus the recording route check.
8. Leak test, with approval to create the test accounts: a test parent linked to
   a test student must see nothing of any other student, in the UI or through
   direct API calls. Run the CLAUDE.md row-count check before and after.
