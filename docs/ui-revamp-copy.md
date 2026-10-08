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

## Phase 3: mentor and chat

Sentence case (headings, labels, buttons):
- `app/dashboard/admin/messages/page.tsx`: `Messages Overview` > `Messages overview`
- `app/dashboard/mentor/availability/page.tsx`: `My Availability` > `My availability`
- `app/dashboard/mentor/payouts/invoicing-panel.tsx`: `Bill To` > `Bill to`
- `app/dashboard/mentor/payouts/invoicing-panel.tsx`: `Invoice Details` > `Invoice details`
- `app/dashboard/mentor/payouts/invoicing-panel.tsx`: `TOTAL PAY` > `Total pay`
- `app/dashboard/mentor/payouts/page.tsx`: `Hourly Rate` > `Hourly rate`
- `app/dashboard/mentor/payouts/page.tsx`: `Payment Status` > `Payment status`
- `app/dashboard/mentor/payouts/page.tsx`: `Payout History` > `Payout history`
- `app/dashboard/mentor/payouts/page.tsx`: `Sessions This Month` > `Sessions this month`
- `app/dashboard/mentor/payouts/page.tsx`: `Setup Required` > `Setup required`
- `app/dashboard/mentor/payouts/report-issue-form.tsx`: `Issue Reported Successfully` > `Issue reported`
- `app/dashboard/mentor/profile/mentor-profile-content.tsx`: `About You` > `About you`
- `app/dashboard/mentor/profile/mentor-profile-content.tsx`: `Full Name` > `Full name`
- `app/dashboard/mentor/profile/mentor-profile-content.tsx`: `Your Details` > `Your details`
- `app/dashboard/mentor/profile/page.tsx`: `My Profile` > `My profile`
- `app/dashboard/mentor/reports/page.tsx`: `Session Reports` > `Session reports`
- `app/dashboard/mentor/reports/reports-content.tsx`: `All Caught Up!` > `All caught up`
- `app/dashboard/mentor/reports/reports-content.tsx`: `No Completed Reports` > `No completed reports`
- `app/dashboard/mentor/reports/reports-content.tsx`: `Submit Report` > `Submit report`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `Academic Interests` > `Academic interests`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `Anything Else` > `Anything else`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `Available Time Slots` > `Available time slots`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `Decline Request?` > `Decline request?`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `Decline Reschedule?` > `Decline reschedule?`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `EXPIRES IN` > `Expires in`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `New Request` > `New request`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `Reschedule Request` > `Reschedule request`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `Target Universities` > `Target universities`
- `app/dashboard/mentor/requests/page.tsx`: `Mentorship Requests` > `Mentorship requests`
- `app/dashboard/mentor/sessions/mentor-sessions-content.tsx`: `Awaiting Response` > `Awaiting response`
- `app/dashboard/mentor/sessions/mentor-sessions-content.tsx`: `Report Submitted` > `Report submitted`
- `app/dashboard/mentor/sessions/mentor-sessions-content.tsx`: `Start Session` > `Start session`
- `app/dashboard/mentor/sessions/mentor-sessions-content.tsx`: `Submit Report` > `Submit report`
- `app/dashboard/mentor/sessions/mentor-sessions-content.tsx`: `View Requests` > `View requests`
- `app/dashboard/mentor/sessions/page.tsx`: `My Sessions` > `My sessions`
- `app/dashboard/mentor/students/page.tsx`: `My Students` > `My students`
- `app/dashboard/mentor/training/training-content.tsx`: `Background Checks` > `Background checks`
- `app/dashboard/mentor/training/training-content.tsx`: `Complete Profile` > `Complete profile`
- `app/dashboard/mentor/training/training-content.tsx`: `Complete Your Profile` > `Complete your profile`
- `app/dashboard/mentor/training/training-content.tsx`: `Contract Signed!` > `Contract signed`
- `app/dashboard/mentor/training/training-content.tsx`: `Digital Signature (Enter your full name)` > `Digital signature (enter your full name)`
- `app/dashboard/mentor/training/training-content.tsx`: `Let's Get Started` > `Let's get started`
- `app/dashboard/mentor/training/training-content.tsx`: `Mentor Contract` > `Mentor contract`
- `app/dashboard/mentor/training/training-content.tsx`: `Payment Connected!` > `Payment connected`
- `app/dashboard/mentor/training/training-content.tsx`: `Payment Setup` > `Payment setup`
- `app/dashboard/mentor/training/training-content.tsx`: `Phone Number` > `Phone number`
- `app/dashboard/mentor/training/training-content.tsx`: `Profile Completed!` > `Profile completed`
- `app/dashboard/mentor/training/training-content.tsx`: `Profile Photo *` > `Profile photo *`
- `app/dashboard/mentor/training/training-content.tsx`: `Questionnaire Completed!` > `Questionnaire completed`
- `app/dashboard/mentor/training/training-content.tsx`: `Sign Contract` > `Sign contract`
- `app/dashboard/mentor/training/training-content.tsx`: `Submit Questionnaire` > `Submit questionnaire`
- `components/dashboard/mentor-request-session-modal.tsx`: `End Time` > `End time`
- `components/dashboard/mentor-request-session-modal.tsx`: `Send Request` > `Send request`
- `components/dashboard/mentor-request-session-modal.tsx`: `Start Time` > `Start time`
- `components/dashboard/mentorship-onboarding.tsx`: `Add Subject` > `Add subject`
- `components/dashboard/mentorship-onboarding.tsx`: `Add Weekly Slot` > `Add weekly slot`
- `components/dashboard/mentorship-onboarding.tsx`: `End Time` > `End time`
- `components/dashboard/mentorship-onboarding.tsx`: `Predicted Grade` > `Predicted grade`
- `components/dashboard/mentorship-onboarding.tsx`: `School Name` > `School name`
- `components/dashboard/mentorship-onboarding.tsx`: `Start Time` > `Start time`

Empty values and em dashes:
- `app/dashboard/mentor/payouts/invoicing-panel.tsx`: draft name `{mentor} [em dash] draft` > `{mentor} (draft)`; empty invoice reference and student name `[em dash]` > `Not set`; `at least 2 hours [em dash] discard it` > `at least 2 hours. Discard it`
- `app/dashboard/mentor/training/training-content.tsx`: `Upload failed [em dash] {error}` > `Upload failed: {error}`; `🎉 All Done!` > `🎉 All done`; `Go to Dashboard` > `Go to dashboard`
- `app/dashboard/mentor/payouts/*`: `To Be Paid` > `To be paid`; `Total Paid` > `Total paid`; `Stripe Dashboard` > `Stripe dashboard`; `Contact Finance Team` > `Contact the finance team`
- `app/dashboard/mentor/page.tsx`: `Application Pending` > `Application pending`; `Student Requests` > `Student requests`; `Active Sessions` > `Active sessions`; `Earnings & Payouts` > `Earnings and payouts`; `View Requests` / `View Payouts` / `Complete Onboarding` / `Go to Training` > sentence case (the `→` characters are now arrow icons); `🎥 Start at` > `Start at` (the camera is now an icon)

Kept as written: names (Access Oxbridge, Claire Marlowe, Stripe), `Privacy Policy`, dropdown options, and the mentor contract's legal wording.

More sentence case and em dashes (phase 3, second sweep):
- `app/dashboard/admin/messages/admin-messages-content-v2.tsx`: `Send as Access Oxbridge Support [em dash] both participants will see this` > `Send as Access Oxbridge Support. Both participants will see this`
- `app/dashboard/mentor/payouts/page.tsx`: `Earnings & Payouts` > `Earnings and payouts`
- `app/dashboard/mentor/payouts/report-issue-form.tsx`: `Report a Payment Issue` > `Report a payment issue`
- `app/dashboard/mentor/profile/mentor-profile-content.tsx`: `Areas of Expertise` > `Areas of expertise`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `Select a Time Slot` > `Select a time slot`
- `app/dashboard/mentor/requests/mentor-request-card.tsx`: `Choose a Time Slot` > `Choose a time slot`
- `app/dashboard/mentor/sessions/mentor-sessions-content.tsx`: `Request a Session` > `Request a session`
- `app/dashboard/mentor/sessions/mentor-sessions-content.tsx`: `Report a Problem` > `Report a problem`
- `app/dashboard/mentor/training/page.tsx`: `Training & Onboarding` > `Training and onboarding`
- `app/dashboard/mentor/training/training-content.tsx`: `Training & Onboarding` > `Training and onboarding`
- `app/dashboard/mentor/training/training-content.tsx`: `Welcome to the Access Oxbridge Team` > `Welcome to the Access Oxbridge team`
- `app/dashboard/mentor/training/training-content.tsx`: `Getting to Know You` > `Getting to know you`
- `app/dashboard/mentor/training/training-content.tsx`: `Continue to Contract` > `Continue to contract`
- `app/dashboard/mentor/training/training-content.tsx`: `Continue to Background Checks` > `Continue to background checks`
- `app/dashboard/mentor/training/training-content.tsx`: `Continue to Payment Setup` > `Continue to payment setup`
- `app/dashboard/mentor/training/training-content.tsx`: `Continue to Profile` > `Continue to profile`
- `app/dashboard/mentor/training/training-content.tsx`: `Confirm & Continue` > `Confirm and continue`
- `components/chat/new-conversation-dialog.tsx`: `Start a Conversation` > `Start a conversation`
- `components/chat/v2/messages-content.tsx`: `Start a New Conversation` > `Start a new conversation`
- `components/dashboard/mentorship-onboarding.tsx`: `Subjects & Predicted Grades` > `Subjects and predicted grades`
- `app/dashboard/mentor/profile/page.tsx`: `Keep your details up to date [em dash] this is what students and the team see.` > `Keep your details up to date. This is what students and the team see.`
- `app/dashboard/mentor/payouts/invoicing-panel.tsx`: `label="Billing Country"` > `label="Billing country"`
- `components/dashboard/stripe-dashboard-button.tsx`: `className="px-6 py-3 bg-white text-[#635BFF] font-bold rounded-xl hover:bg-gray-50 transition-colors"
        >
            Open Dashboard →` > `className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-base font-medium whitespace-nowrap text-[#635BFF] transition-[background-color,scale] duration-150 ease-out hover:bg-white/90 active:scale-[0.96]"
        >
            Open dashboard
            <ArrowSquareOut weight="bold" className="size-4" />`
- `components/dashboard/stripe-dashboard-button.tsx`: the `→` is now an external-link icon
- `app/dashboard/mentor/reports/reports-content.tsx`: `To Complete` > `To complete`

## Student home redesign ("A + up next", approved 2026-10-08)

`app/dashboard/student/student-dashboard-content.tsx`
- `Student dashboard` + `Welcome back, {full name}!` > `Welcome back` + `Hi {first name}`
- Next-session card: `Active mentorship` / `Mentor: {name}` > `Up next` / `{Today, Tomorrow, In n days}` / `{weekday day month}` / `{time} with {mentor}` (unscheduled sessions keep `Active mentorship` / `Mentor: {name}`)
- Within an hour of the start: `Starting soon`, with `Join session`, `Top up to join` or `Zoom link pending` (the week calendar's rules)
- New buttons on the card: `Book another session` (when booking is available) and `View my sessions`
- No session or request: `This week` / `{n} sessions booked` > `Up next` with a `{n} sessions this week` chip, and the title `Book your next session` / `Complete your profile` / `Your mentor is on the way`, plus one new line under it:
  - `Pick a few times that suit you and your mentor chooses one.` (can book)
  - `Finish your profile so we can match you with a mentor.` (profile incomplete)
  - `The team is choosing your mentor.` (waiting for a mentor)

`components/dashboard/application-timeline.tsx`
- Title `Application timeline` > `Road to {target university}` when a target is set
