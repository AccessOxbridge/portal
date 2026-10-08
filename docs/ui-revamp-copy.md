# UI revamp: every changed sentence

Approval #5 in the plan (section 12): copy edits are text changes, not behaviour,
and every one is listed here for review. Rules (plan, section 7.6): sentence
case for headings and buttons, no em dashes, no "please", "successfully" or "!"
in system messages. Student-facing copy stays warm and plain; greetings keep
their warmth.

Format: file, then `old` > `new`.

## Phase 1: shell

`components/dashboard/sidebar.tsx`, `mobile-more-sheet.tsx`
- `My Profile` > `My profile`
- `Sign Out` > `Sign out`

`components/dashboard/notification-bell.tsx`
- `Private & Secure` (all caps) > `Private & secure`

`components/dashboard/credits-floating-button.tsx`
- `Hours` / `REMAINING` (caps) > `hours remaining` (phones: `hours`)

## Phase 2: student

`app/dashboard/student/student-dashboard-content.tsx`
- `Student Dashboard` > `Student dashboard`
- `{year} Entry` > `{year} entry`
- `Active Mentorship` > `Active mentorship`
- `Request Pending` > `Request pending`
- `We've sent your request to your mentor. We'll notify you once they confirm a time!` > `We've sent your request to your mentor. We'll let you know once they confirm a time.`
- `View Pending Requests` > `View pending requests`
- `+ Book Another Session` > `Book another session` (the + is now an icon)
- `Complete Profile to Book` > `Complete profile to book`
- `This Week` (caps) > `This week`
- `Book a Session` > `Book a session`
- `Complete Profile` > `Complete profile`

`components/dashboard/academic-profile-card.tsx`
- `Complete Your Profile` > `Complete your profile`
- `Academic Profile` > `Academic profile`
- `In Progress` / `Not Started` > `In progress` / `Not started`

`components/dashboard/application-timeline.tsx`
- `Application Timeline` (caps) > `Application timeline`
- `{year} Entry` > `{year} entry`
- `Personal Statement` > `Personal statement`
- `Entrance Exam` > `Entrance exam`
- `✓ Done` > `Done` (the tick is now an icon)

`components/dashboard/weekly-calendar.tsx` (also on the mentor availability page)
- `{n} Session` / `{n} Sessions` (caps) > `{n} session` / `{n} sessions`
- `Top up to Join` > `Top up to join`

`app/dashboard/student/sessions/*`
- `My Sessions` > `My sessions`
- `Your Application Journey` (caps) > `Your application journey`
- `Profile Complete`, `Mentor Requested`, `Mentor Matched`, `Session Scheduled`, `Session Complete` > sentence case
- `Report successfully submitted.` > `Report submitted.`
- `Awaiting Response` > `Awaiting response`
- `Book a Session` > `Book a session`
- `Join Session` > `Join session`
- `Watch Recording` > `Watch recording`
- `View Report` > `View report`
- `Leave Feedback` > `Leave feedback`
- `Report a Problem` > `Report a problem`

Popups (`components/dashboard/*-modal.tsx`)
- Booking: `Book a Session` > `Book a session`; `Start Time` / `End Time` > `Start time` / `End time`; `Add Time Slot` > `Add time slot`; `Get More Credits` > `Get more credits`; `Send Request` > `Send request`; `✓ {n} slots` > `{n} slots` (the tick is now an icon)
- Reschedule: `Reschedule Session` > `Reschedule session`; `Start Time` / `End Time` > sentence case; `Send Reschedule Request` > `Send reschedule request`
- Rating card: unchanged
- Credits request, check-in survey, milestone: unchanged

`app/dashboard/student/mentors/*`
- `My Mentors` > `My mentors`
- `Active Mentorship` > `Active mentorship`
- `View Profile` > `View profile`; `View Sessions` > `View sessions`
- `Back to My Mentors` > `Back to My mentors`
- `Current Mentor` / `Past Mentor` > `Current mentor` / `Past mentor`
- `No bio provided yet.` (was italic) unchanged

`app/dashboard/student/recordings`, `reports`
- `Session Recordings` > `Session recordings`
- `Session Reports` > `Session reports`
- `No Reports Yet` > `No reports yet`

`app/dashboard/student/profile/*`
- `My Academic Profile` > `My academic profile`
- Section headings: `Basic Information`, `Target Goals`, `Interests & Activities` > sentence case
- Labels: `School Name`, `School Country`, `Year Group`, `Specify Curriculum`, `Target University`, `Target Course`, `Application Year`, `Entrance Exam Date`, `Academic Interests`, `Extracurricular Activities`, `Additional Notes (Optional)` > sentence case
- `Defaults to a general date [em dash] change it if you know your actual exam date` > `Defaults to a general date. Change it if you know your actual exam date`
- `Saved!` > `Saved`
- `Save Profile` > `Save profile`

`app/dashboard/student/services`, `services/success`, `credits/success`, `components/dashboard/credit-packages.tsx`
- `Expert Guidance, For You` > `Expert guidance, for you`
- `Credits Available` > `Credits available`
- `Strategy Call` > `Strategy call`; `Book Now` > `Book now`; `Most Popular` > `Most popular`
- `1-1 Mentorship` > `1-1 mentorship`; `Member's Discount Applied` > `Member's discount applied`; `Get Started` > `Get started`
- `Academic Development` > `Academic development`; `Select Programme` > `Select programme`
- `1 Hour with Expert Mentor` > `1 hour with an expert mentor`; `Personalized Feedback` > `Personalised feedback`; `10 Hours of 1-1 Mentorship` > `10 hours of 1-1 mentorship`; `Long-term Strategy` > `Long-term strategy`
- `Payment Successful! 🎉` > `Payment successful 🎉`; `Payment Successful!` > `Payment successful`; `Processing Payment...` > `Processing payment...`
- `Your New Balance` > `Your new balance`; `{n} Credits` > `{n} credits`
- `Start Booking Sessions` > `Start booking sessions`; `Buy More Credits` > `Buy more credits`
- `Purchase Not Found` > `Purchase not found`; `Return to Dashboard` / `Go to Dashboard` > `... dashboard`; `Find a Mentor` > `Find a mentor`

`app/dashboard/student/events/*` (hidden from the menu)
- `In Person Events` > `In-person events`; `View Webinars` / `View Events` > sentence case
- `Your Event Activity`, `Upcoming Webinars`, `Upcoming Events`, `Events Attended`, `Recordings Available` > sentence case

Not changed yet (inside handlers, so they wait for the phase 5 copy pass with your review):
error messages that start with "Please" in the booking, reschedule, credits and rating flows.

## Removed content (your decision, 2026-10-08)

`components/dashboard/credit-packages.tsx`
- Removed the "{n} purchased in the last hour" badge on the 1-1 mentorship card. The number was made up: it started at 11 and drifted by 1 at random every 10 seconds. Its state and timer are gone too.
