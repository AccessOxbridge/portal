# AO Mentorship Platform - Portal

## 3 Interfaces

- Client
- Mentor
- Admin

## Functional requirements

- Students & mentors should be able to register
- Students should be recommended top mentors relevant for them
- Student should be able to schedule mentorship with any mentor
- Students pay for our services

- Mentors should be notified about each request
- Mentors Accept or Deny student requests (?)
- Mentors connect with the student
- Mentors & students schedule a meeting (Zoom automation)

- We track each meeting for calculating the price we need to pay the mentor
- Admins monitor how many students / mentors on the platform
- Admins review & add mentors to the platform
- Admin autopay mentors each fortnight based on their hourly rate & sessions completed (Stripe, Wise automation)

- White label the web dashboard (logos, color theme, headings, etc ..)

## Non Functional requirements

- Scalability: Should handle many users (1M+)
- Availability: Should be functional at all times
- Smooth UI/UX for Students, Mentors & admins

## Tech Stack

- Frontend: Nextjs, posthog, intercom (?)
- Backend: Vercel edge functions, Supabase (Auth, postgres, realtime, notifications, Webhook Edge functions)
- DB: Postgres + pgVector, Supabase Storage
- Integrations: Stripe, Wise, Zoom, Google, etc ..

## Rough Database design (Role based access control db schema todo!)

- Students: (name, email, metadata, session_count (?))
- Mentors: (name, email, metadata, hourly_rate, session_count (?))
- Reports: (id, student_id, blob_url, date, session_id)
- Sessions: (student_id, mentor_id, duration, date, report_id)
- Transactions: (mentor_id, date, amount, invoice_url, etc …)
