# Write-rule audit (step 3)

Date: 22 Oct 2026. Read-only. Nothing was changed.

**Scope:** every INSERT/UPDATE/DELETE rule on `public` tables and storage on the production project, the database functions logged-in users can call, the triggers on those tables, and the one edge function.

**Question:** what can a logged-in student, mentor or (future) parent write by calling Supabase directly from the browser console, outside what the UI offers?

**How to read the findings:** each one is taken from the rule text on production, plus the app code that relies on it. I have not exploited any of them on production. Each can be shown safely on the local test database before it's fixed.

---

## Summary

| # | Severity | What a logged-in user can do today | Parent impact |
| --- | --- | --- | --- |
| 1 | **High** | Any logged-in user can make the platform send an email from `office@accessoxbridge.io`, with any subject and HTML, to any address, by calling the `send-email-notifications` edge function with their own login token | A parent could too |
| 2 | **High** | Any logged-in user can add a notification for **anyone**, with any title, message and recipient email | Same |
| 3 | **High** | Any logged-in user can create and edit **blog articles** (the public website) | Same |
| 4 | **High** | Anyone, **even logged out**, can create or change any `credit_purchases` row (purchase records, status) | Same |
| 5 | **High** | A mentor can create a `sessions` row with themselves as mentor (any student, `status = 'completed'`, any `actual_minutes`). It then shows as unbilled and can be invoiced | n/a |
| 6 | **High (for parents)** | A user can create a conversation with **any** mentor or student by putting themselves in one slot, then message them | **This is how a parent could message mentors** |
| 7 | Medium | A conversation member can change the conversation's `student_id`/`mentor_id` | Same |
| 8 | Medium | A group-chat member can move their membership row to **another** group (`conversation_id`) and read it | Same |
| 9 | Medium | A user can edit the text of messages **sent to them** (the "mark as read" rule allows any column) | Same |
| 10 | Medium | A user can add a mentor report or a rating for **any** session, not just their own | Same |
| 11 | Medium | Students and mentors can create requests with anyone (not just their assigned mentor or student); mentors can change any column of requests sent to them | n/a |
| 12 | Low | A mentor can set their own `background_check_confirmed_at`, `dbs_certificate_url`, `contract_signed_at`, `payouts_enabled` and `stripe_account_id` | n/a |
| 13 | Low | A user can change their own `member_code` (referral code) | Same |
| 14 | Low | `mentor-assets` (public bucket): any logged-in user can upload any file type, of any size, into their own folder. Public URLs are served from your Supabase domain | Same |
| 15 | Info | Anyone (even logged out) can call `next_mentor_invoice_number()`, which advances the invoice counter and leaves gaps in invoice numbers | Same |
| 16 | Info | The notification trigger calls the edge function with **no** login token, but the function requires one. Those trigger emails are most likely all rejected, and each notification insert waits on an HTTP call. Couldn't confirm: the log service was erroring | — |

Everything else is scoped correctly to the user's own rows, including:
- event registrations, feedback-prompt dismissals, satisfaction surveys, milestones, mentor check-ins and user issues;
- admin-only tables (creators, events, payouts, invoices, assignments, packages, "What's new", conversation reads);
- avatars, chat attachments and the invoices bucket.

---

## Details and proposed fixes

### 1. Email relay through the edge function

- `send-email-notifications` has `verify_jwt: true`, so it needs *a* valid login token, and any logged-in user's token qualifies.
- It sends `to: recipient_email` with `subject: title`, and puts `title` and `message` into the HTML with no escaping.
- **Fix:** have the function only accept calls carrying a server-side secret (the service role key, or a shared secret header), and escape the HTML. If the database trigger is still wanted, pass that secret. Otherwise drop the trigger (see 16).
- **Code impact:** none in the app. The function and trigger only.

### 2. Notifications insert is `WITH CHECK (true)`

- Notifications show in the bell, and (via the trigger) are meant to be emailed.
- **Fix:** allow inserts only from the service role. Move the one user-client insert (`app/api/student/book-session/route.ts`, "New Session Request") to the service role, the same way step 2 did the email lookups.
- **Code impact:** 1 file. I'll check for other user-client inserts first.

### 3. Articles insert/update for any logged-in user

- `auth.role() = 'authenticated'` lets every student and mentor create or edit blog posts.
- **Fix:** admins only (`is_portal_admin()`). The blog admin pages already check for admin before writing.
- **Code impact:** none.

### 4. `credit_purchases` insert/update `true` for every role, including logged-out

- Named "Service can …", but it applies to everyone, because the service role bypasses these rules anyway.
- **Fix:**
  - INSERT: only your own `user_id`. Stripe checkout inserts with the user client, so that keeps working.
  - UPDATE: drop the rule. Only the Stripe webhook updates, and it uses the service role.
- **Code impact:** none.

### 5. Mentors (and students) can insert sessions directly

- Rules: "Mentors can insert sessions when accepting requests" (`mentor_id = auth.uid()`) and the matching student rule.
- **No app code inserts sessions with the user client.** Accepting a request and admin booking both use the service role.
- A self-made `completed` session is picked up by `/api/mentor/invoices/unbilled` as invoiceable.
- **Fix:** drop both INSERT rules.
- **Code impact:** none.

### 6. Conversations can be created with anyone (the parent "no messaging" risk)

- The rule passes if you are `student_id` **or** `mentor_id` **or** a mentor/admin. That means:
  - a student can open a chat with any mentor;
  - a mentor can create a conversation with any two people.
- A parent would put themselves in `student_id` and any mentor in `mentor_id`, then send messages.
- **Fix:** student → only a mentor they are connected to; mentor → only their own students; admin → anyone; nobody else (so not parents). The same `my_connected_ids()` helper from step 1 can be reused.
- **Code impact:** none expected. The UI only opens chats with your own mentor, students or support. To verify locally.

### 7. Conversation update lets members change who is in it

- **Fix:** add a `WITH CHECK` that keeps `student_id`/`mentor_id`/`admin_id`/`type` unchanged for non-admins, or limit updates to the columns the app actually changes (`last_message_at`, notified-at fields).
- **Code impact:** check what the app updates first.

### 8. Group membership row can be moved to another group

- "Participants can update their own read state" only checks `user_id`.
- **Fix:** limit the UPDATE to `last_read_at` (and `last_notified_at` for the service), or check `conversation_id` is unchanged.
- **Code impact:** none (the app only sets `last_read_at`).

### 9. Received messages can be edited

- "Users can mark received messages as read" has no column limit.
- **Fix:** column-level grant so users can only UPDATE `is_read` on `messages`.
- **Code impact:** none (the app only sets `is_read`).

### 10. Form responses for any session

- **Fix:** the respondent must be the session's mentor (for `mentor_report`) or student (for `student_feedback`).
- **Code impact:** none.

### 11. Requests with anyone, and mentors editing any column

- **Fix:**
  - insert only with an assigned or connected counterpart;
  - limit mentor updates to `status`;
  - keep the student-side rule as is.
- **Code impact:** verify the request flows locally.

### 12. Mentor self-service columns

- Checked: mentor onboarding (`app/dashboard/mentor/training/actions.ts` and `page.tsx`) sets `contract_signed_at`, `dbs_certificate_url`, `background_check_confirmed_at` and `payouts_enabled` with the mentor's own client. So today these are self-attested by design, and the status change to `active` stays admin-only.
- **Fix (optional):** move those writes into server actions that use the service role, then extend `protect_mentors_privileged_columns` to cover them and `stripe_account_id`. This is a code change, so it's low priority.

### 13. `member_code`

- **Fix:** add it to `protect_profiles_role`.

### 14. `mentor-assets` uploads

- **Fix:** set the bucket's allowed types (images, PDF) and a size limit, as the other buckets already have.

### 15. `next_mentor_invoice_number()`

- **Fix:** revoke EXECUTE from `anon` and `authenticated`. The invoice code runs with the service role.

### 16. Notification trigger

Decide whether these emails should exist. The app now sends its own branded emails for most events. If they're not needed, drop the trigger. That also removes an HTTP wait from every notification insert.

---

## Suggested order

1. **Now:** 3, 4, 5, 15. They are rule-only changes with no app code impact, and they close the worst holes.
2. **Next:**
   - 1 and 2 (the email relay), which need a small function and code change;
   - 6–10, the chat and parent-safety rules. These must be in place before any parent account exists.
3. **Later:** 11–14, 16.

Every fix gets the same treatment as steps 1–2:
- local test database first;
- crawl every page as each role;
- prove the old hole is closed;
- apply to production with your approval and a row-count check;
- one-line rollback.
