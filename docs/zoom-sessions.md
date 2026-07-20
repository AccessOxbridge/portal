# Zoom sessions — architecture, scaling & production test plan

## Current setup (what we ship today)

- Meetings are created via Zoom Server-to-Server OAuth on **`users/me`** (single platform Zoom account, e.g. `office@accessoxbridge.io`).
- At booking we store `zoom_meeting_id`, `zoom_join_url`, and `zoom_start_url` on `sessions`.
- **Mentor** starts via portal **Start Session** → `GET /api/sessions/{id}/start` → mints a **fresh** Zoom host `start_url` (ZAK) on click.
- **Student** joins via portal **Join Session** → stored `zoom_join_url` (`/j/…`, participant).
- Meeting settings: `join_before_host: false`, `waiting_room: false`.
- Emails do **not** include Zoom links; they point people to the portal sessions pages.

### Why fresh start on click matters

Zoom’s host `start_url` (ZAK) expires **~2 hours after it is generated**, not 2 hours after the meeting start time. Sessions booked days ahead must not reuse the booking-time `start_url`. The portal remints on every Start click via `GET https://api.zoom.us/v2/meetings/{id}`.

### Join order

| Order | What happens |
|-------|----------------|
| Student first | Student waits (“waiting for the host”); cannot enter until mentor starts as host |
| Mentor first | Meeting goes live; student joins and enters as participant |

Correct order: **mentor Start Session → student Join Session**.

---

## Scaling: single Zoom account risk

All meetings currently share one Zoom host (`users/me`). A single licensed Zoom user can effectively **host one live meeting at a time**. With overlapping sessions, mentors can hit “already hosting / can’t start” style failures.

At ~50–80 students this becomes likely whenever calendars overlap — concurrency matters, not headcount.

### What to do at 50–80 students

**1. Short term (low overlap)**  
- Keep one account; avoid overlapping session starts (scheduling buffers / rules).

**2. Right fix: host pool (recommended)**  
Under the Zoom org, create several **licensed** users (`session-host-1@…` … `session-host-N@…`).

On booking:
- Pick a free host for that time slot  
- `POST /users/{hostUserId}/meetings` (not only `/users/me`)  
- Store `zoom_meeting_id` + `zoom_host_user_id`  
- Keep the same mentor **Start Session** flow (fresh `start_url` for that meeting)

Sizing: if peak concurrent sessions are ~8–12, start with ~10–15 licensed hosts and grow the pool.

**3. Avoid for this product model**  
- Per-mentor personal Zoom OAuth (breaks “sessions only via AccessOxbridge”).  
- Expecting Meeting SDK alone to solve concurrency (you still need licensed host capacity).

**4. Product rules that help**  
- Don’t double-book the same Zoom host slot  
- Soft-block Start if that host is already in a live meeting  
- Alert when host-pool utilization is high

Keep the current portal Start / Join + fresh ZAK design; scale by **multiple Zoom users + assign meeting to a free host at booking**.

---

## Production test plan (full flow)

Use **Raj TEST accounts only** (or another dedicated test pair). Do not use live mentor/student pairs.

| Role | Account |
|------|---------|
| Student | Raj Vishwakarma [STUDENT] — `rajvishwakarma0221@gmail.com` |
| Mentor | Raj Vishwakarma [MENTOR] — `rajvishwakarma303@gmail.com` |

### Before you start

1. Deploy the Zoom/email fixes to production.
2. Confirm prod env has:
   - `ZOOM_ACCOUNT_ID`
   - `ZOOM_CLIENT_ID`
   - `ZOOM_CLIENT_SECRET`
   - `ZOOM_WEBHOOK_SECRET_TOKEN`
   - `NEXT_PUBLIC_APP_URL=https://app.accessoxbridge.io` (or your real prod URL)
3. Confirm Zoom marketplace app webhooks still point at:  
   `https://app.accessoxbridge.io/api/webhooks/zoom`  
   Events: at least `meeting.started`, `meeting.ended` (plus recording events if you use them).
4. Mentor and student are assigned to each other (`student_mentor_assignments` current).

### A. Book an upcoming session

1. As mentor or student (depending on your booking UX), book a session **at least a few minutes ahead** (or hours ahead to also exercise “advance booking”).
2. In Supabase `sessions` for that row, confirm:
   - `status = active`
   - `zoom_meeting_id` is set
   - `zoom_join_url` looks like `https://…zoom.us/j/{id}`
   - `zoom_start_url` may be set (will expire after ~2h — that is OK)
   - `zoom_meeting_status` is `waiting` (or null treated as waiting)

### B. Confirm emails have no Zoom links

1. Check mentor + student confirmation (and reminder, if one fires) inboxes.
2. Expect portal links only (e.g. sessions dashboard), **not** `zoom.us/j/…` or `zoom.us/s/…`.

### C. Mentor starts as host (happy path)

1. Log in as **mentor** on prod.
2. Open **Sessions** (or home / availability calendar).
3. Click **Start Session** / **Start Zoom** (must go through `/api/sessions/{id}/start`, not a raw Zoom URL).
4. Zoom should open with mentor as **host**.
5. In Supabase, after a short wait, `zoom_meeting_status` should become **`started`** (webhook).

### D. Student joins after mentor

1. Log in as **student** on prod (separate browser/profile).
2. Open **Sessions** → **Join Session**.
3. Student should enter the live meeting as participant (not stuck waiting).

### E. Student-before-mentor (expected wait)

1. On a **new** test session, have the student click **Join Session** first.
2. Student should see Zoom “waiting for the host” and **not** enter.
3. Mentor then **Start Session** → student should be admitted.

### F. Advance booking / expired host token

1. Book a session **more than 2 hours** before start (or wait >2h after booking).
2. Mentor still uses **Start Session** from the portal.
3. Mentor must still join as host (fresh ZAK on click).  
   If this fails, the remint path or Zoom credentials are broken.

### G. Session end + Supabase

1. End the Zoom meeting (mentor leaves / end meeting for all).
2. Confirm in Supabase:
   - `zoom_meeting_status = ended`
   - `status = completed`
3. Confirm in-app notifications (mentor report / student feedback) as applicable.
4. Note: ending a real session may deduct student credits — use TEST accounts and restore credits if needed.

### H. Negative checks

| Check | Expected |
|-------|----------|
| Student opens `/api/sessions/{id}/start` while logged in | `403 Forbidden` |
| Logged-out user opens start link | Redirect to `/login` |
| Mentor uses any old email Zoom join link (if they still have one) | Participant wait / not host — reinforce portal Start only |

### Pass criteria

- Mentor always hosts via portal Start (fresh token).
- Student always joins via portal Join.
- No Zoom URLs in transactional emails.
- Webhooks update `zoom_meeting_status` (`started` / `ended`) and complete the session on end.
- Advance booking (>2h after create) still allows mentor to start as host.

---

## Related code (quick map)

| Piece | Path |
|-------|------|
| Create meeting | `utils/zoom.ts` → `createZoomMeeting` |
| Fresh host URL | `utils/zoom.ts` → `getZoomStartUrl` |
| Mentor start API | `app/api/sessions/[id]/start/route.ts` |
| Webhooks | `app/api/webhooks/zoom/route.ts` |
| Mentor UI | `app/dashboard/mentor/sessions/…`, home, availability |
| Student UI | `app/dashboard/student/sessions/…` |
| Emails | `lib/email/templates.ts` (portal CTAs only) |

---

## Follow-ups (not required to ship current fix)

- Host pool + `zoom_host_user_id` assignment for concurrent sessions  
- Verify Zoom webhook request signatures on `meeting.started` / `meeting.ended`  
- Scheduling guardrails against overlapping use of the same Zoom host  
