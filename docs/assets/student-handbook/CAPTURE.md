# Screenshot capture checklist — Student & Parent Handbook

Capture these PNGs while logged in as a **student** on production or staging. Save each file under this folder (`docs/assets/student-handbook/`) using the exact filename so the handbook embeds resolve.

**Handbook:** [../../student-parent-handbook.md](../../student-parent-handbook.md)

**Tips**

- Prefer a clean demo account (no real student PII if the doc will be shared widely).
- Desktop width ~1280–1440px; capture the full relevant UI (sidebar + main content when it helps orientation).
- Hide browser chrome if possible; crop tightly around the portal.
- Blur or redact any real emails, phone numbers, or surnames if needed.

---

## Must-have

| # | Filename | URL / how to open | What to show |
|---|----------|-------------------|--------------|
| 1 | `01-login.png` | `/login` | Full login form (email, password, forgot-password link). Logged out. |
| 2 | `02-home.png` | `/dashboard/student` | Home with sidebar visible and **Book a session** CTA in view. Ideally show weekly calendar / upcoming sessions. |
| 3 | `03-profile.png` | `/dashboard/student/profile` | Academic profile form, including timezone and **Parent/guardian email** section if visible without scrolling too far (or two crops merged carefully). |
| 4 | `04-mentors.png` | `/dashboard/student/mentors` | List of assigned mentor(s). |
| 5 | `05-book-session.png` | Open **Book a session** from sidebar | **Book a Session** modal: mentor (if multiple), date, start/end time. |
| 6 | `06-sessions.png` | `/dashboard/student/sessions` | Prefer **Upcoming** tab with **Join Session** and **Reschedule** visible on a card. |
| 7 | `07-recordings.png` | `/dashboard/student/recordings` | Recording cards list (or empty state if none — note in commit if empty). |
| 8 | `08-reports.png` | `/dashboard/student/reports` | Reports list or empty state with explanation text. |
| 9 | `09-messages.png` | `/dashboard/student/messages` | Conversation list / thread with a mentor or Help & Support. |
| 10 | `10-credits-services.png` | `/dashboard/student/services` and/or floating Hours UI | Credit packages and/or the Hours floating button + request UI. Prefer packages page if available. |
| 11 | `11-settings.png` | `/dashboard/settings` | Settings: timezone + password reset section. |

---

## Nice-to-have (optional; not required by handbook embeds)

| Filename | URL / how to open | What to show |
|----------|-------------------|--------------|
| `12-forgot-password.png` | `/forgot-password` | Forgot password form |
| `13-feedback.png` | `/dashboard/student/sessions/[id]/feedback` | Post-session feedback form |
| `14-credits-request.png` | Click floating **Hours** button | **Request more hours** modal |
| `15-pending-tab.png` | `/dashboard/student/sessions` → **Pending** | Pending request + cancel controls |

---

## Done when

- [ ] All 11 must-have PNGs exist in this folder  
- [ ] Images look correct when previewing `docs/student-parent-handbook.md`  
- [ ] No sensitive personal data left unredacted in shared copies  
