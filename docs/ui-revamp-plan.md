# Portal UI revamp plan

Status: **approved 2026-10-07; phase 0 in progress.** Branch: `feat/ui-revamp` (local only, nothing pushed).

Who it's for: students aged 14 to 18, their mentors, and the admin team. The goal is a portal that is calm, simple and pleasing to look at, in the shadcn/ui style we used for the CRM, with the blue sidebar kept and refined.

Inputs used: the `better-ui` and `emil-design-eng` skills, Refero references (listed in section 15), the CRM revamp (same playbook), and a full read of this repo.

---

## 1. Guardrails

- **UI only. No functionality changes, not even one.** Server actions, API routes, data fetching, Supabase queries, Stripe, Zoom, Resend, emails, crons, auth, redirects, form fields, validation rules and what every button does all stay exactly as they are. Anything that looks like a behaviour change is listed in section 12 and only happens if you approve it item by item.
- **Database Rule 1 applies throughout** (see `CLAUDE.md`). The revamp never writes to the database. Testing uses only your three test accounts.
- **Work stays local on `feat/ui-revamp`** until everything is done, tested and approved. Then we push the branch, test the Vercel preview, and open one PR into `main`.
- **No em dashes anywhere we write**: UI copy, docs and code comments. The 45 em dashes in visible copy today get replaced (section 7.6).
- **Every phase ends with a checkpoint.** You look at real screens before the next phase starts.

---

## 2. Why it looks "AI-made" today

Measured in this repo:

| Signal | Count | What we do |
|---|---|---|
| Hard-coded greys (`text-gray-500`, `bg-gray-50`, ...) | ~3,760 | Replace with design tokens |
| Extra-rounded corners (`rounded-2xl`, `rounded-3xl`) | 310 | One radius scale, concentric where nested |
| Heavy shadows (`shadow-lg`, `shadow-xl`) | 172 | Hairline ring plus a soft shadow, only where something is raised |
| Gradients | 19 | Remove, except one deliberate brand moment if it earns it |
| Entrance animation classes (`animate-in`, `slide-in-from-bottom-4 duration-700`, ...) | 17 in 11 files | They have **never run**: the animation library was commented out. Removed or replaced in phase 1, then the library is switched on |
| Hand-built popups (`fixed inset-0`) | 31 | One dialog component, bottom sheet on phones |
| Native dropdowns / date inputs | 17 / 9 | The custom select and date picker from the CRM |
| Separate spinners | 57 | One spinner, plus skeletons for page loads |
| Browser `alert()` / `confirm()` boxes | 14 files | Needs your approval (section 12) |
| Route loading screens | 0 | Skeleton loading screens (section 12) |

---

## 3. Design direction

### 3.1 Two looks, one system

| Area | Look | Density |
|---|---|---|
| Student and mentor pages, auth pages, blog | **Option B: calm with warm touches** | Comfortable: 16px body text, roomier cards |
| Admin pages | **Option A: strict shadcn** | Compact: 14px body text, tighter tables (like the CRM) |

Both share the same components and tokens. The difference is a density switch on the layout plus a small set of "warm" tokens that only student and mentor pages use.

### 3.2 Colour tokens (first draft, tuned and contrast-checked in phase 0)

| Token | Value | Use |
|---|---|---|
| `--sidebar` | `#13275A` (blue 2, "deep navy") | Desktop sidebar, mobile top bar accent, `theme-color` |
| `--sidebar-foreground` | white at 72% / 100% active | Nav text |
| `--sidebar-accent` | white at 10% (hover), 14% (active pill) | Nav states |
| `--primary` | `#13275A` | Main buttons (one per view) |
| `--brand` | `#2563EB`-ish, tuned for 4.5:1 | Links, progress, focus accents, selected states |
| `--background` | `#FAFAF9` (stone 50) | Page canvas |
| `--card` | `#FFFFFF` | Cards, with the hairline ring |
| `--muted`, `--border`, `--muted-foreground` | shadcn stone neutrals | Secondary surfaces, dividers, supporting text |
| `--success` / `--warning` / `--destructive` | green 600 / amber 600 / red 600, each with a soft tint | Status only |

**Warm tints (student and mentor only).** Soft background plus dark text from the same hue, never more than two on one card:

| Tint | Background / text | Used for |
|---|---|---|
| Blue | `#EFF6FF` / `#1E3A8A` | Next session card, university chip |
| Violet | `#F5F3FF` / `#4C1D95` | Course or subject chip |
| Amber | `#FFFBEB` / `#78350F` | Entry year, "needs attention" |
| Green | `#ECFDF5` / `#065F46` | Hours left, completed, positive feedback |
| Rose | `#FFF1F2` / `#9F1239` | Cancelled, missed |

Subjects and session types get a **stable colour dot** (the same subject is always the same colour), so a student can scan a week at a glance.

The brand gold from the main site stays only in the logo.

### 3.3 Typography

- **Geist** for everything (shared with the CRM), replacing Inter. Geist Mono only for codes and IDs.
- Sizes: page title 24px (student) / 20px (admin), section title 16px, body 16px (student) / 14px (admin), small 13px, caption 12px. Nothing below 12px.
- Weights: 400 body, 500 labels and buttons, 600 titles. No `font-extrabold`.
- `text-balance` on headings, `text-pretty` on paragraphs, `tabular-nums` on times, money, hours and counts.
- Sentence case everywhere ("My sessions", not "My Sessions"). Friendly, plain copy for students ("You're on track"), neutral for admin.

### 3.4 Shape and depth

- Radius scale: 8px controls, 12px cards, 16px sheets and dialogs. Student and mentor buttons are **pills**; admin buttons keep 8px.
- Nested surfaces follow `outer radius = inner radius + padding` (better-ui).
- Depth: cards use a 1px transparent-ink ring plus a very soft shadow, with `border: 1px solid transparent` so Windows high-contrast mode still draws an edge (better-ui). Borders stay for structure: dividers, table rows, inputs.
- Images and avatars get a 1px `black/10` outline inset by 1px (better-ui).

---

## 4. Shared component library (`components/ui`)

Built once in phase 1 and used by every page, the same idea as the CRM. Where the CRM already has a polished version, we copy it in and keep the two in sync by hand. A shared npm package across both repos is possible later, but it isn't worth the build plumbing now.

| Component | Notes |
|---|---|
| Button | primary / secondary / ghost / destructive / link; pill on student and mentor pages; press scale `0.96` over 150ms `ease-out`, never when disabled; pending state keeps width and swaps the label for a spinner |
| Input, Textarea, Label, Field | 16px text on phones so iOS never zooms; clear error text under the field |
| Select | The custom dropdown from the CRM (keeps native `onChange` and form submission) |
| DatePicker / DateTimeField | From the CRM: calendar popover plus 15-minute time list |
| Checkbox, Switch, RadioGroup, SegmentedControl | shadcn |
| Card, StatCard, Section, PageHeader | One spacing rhythm |
| Badge, StatusPill | One status palette for sessions, payouts, approvals, issues |
| Avatar | Image outline; initials fallback on a tint picked from the name, so each mentor always has the same colour |
| Tabs | Instant switch (no animation, high frequency) |
| Table | Admin density, sticky header, row hover, empty and loading rows |
| Dialog / Sheet ("ResponsiveDialog") | Centred dialog on desktop, **bottom sheet on phones**: same content and buttons |
| Popover, DropdownMenu, Tooltip | Origin-aware scale from the trigger |
| Skeleton, Spinner | One of each, used everywhere |
| EmptyState | Icon, one-line title, one sentence, one action |
| Progress, ProgressRing | Bars for the application timeline, ring for hours used |
| Stepper / Timeline | **Dashed circle** for upcoming, filled ring for current, check for done (section 7) |
| WeekCalendar | Restyle of `weekly-calendar.tsx` |
| Chat parts | Bubbles, day dividers, unread marker, attachment tiles, composer |
| Chart theme | Recharts colours from tokens, light gridlines, tabular axis numbers |

---

## 5. Icons

The portal uses **Lucide** today (98 files, 91 different icons). Options:

| Set | Strengths | Weaknesses |
|---|---|---|
| **Lucide** (keep) | shadcn's default, zero migration, huge set | Outline only, so no filled "active" variant; feels generic |
| **Phosphor** (`@phosphor-icons/react`) | 6 weights of the same icon (regular, bold, fill, duotone, ...); friendly and rounded without being childish; SSR build available | One-time swap of 91 icons |
| **Hugeicons** (free stroke-rounded set) | Very modern, soft, large set | Free tier is stroke-only; less consistent fill story |
| **Tabler** | 5,900+ outline icons, consistent | Outline only, more technical feel |

**Recommendation: Phosphor.** It fits better-ui's rule "outline is the default, fill marks the active state": regular weight in the UI, the **fill** weight for the active sidebar item and active mobile tab, and **duotone** for empty states and celebrations. That gives the warm-touch look for students while staying one consistent library. Stroke weight tracks the text beside it (better-ui).

The swap is mechanical: a mapping table of 91 icons, same sizes, done in phase 1. In phase 0 I'll show Lucide and Phosphor side by side on the real sidebar and student home so you can choose by eye.

---

## 6. Motion, loading and feedback

Rules from both skills, with the exact values we'll use.

### 6.1 Tokens

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Anything entering, popovers, dropdowns |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Things moving on screen |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Bottom sheets and drawers |
| `--ease-icon` | `cubic-bezier(0.2, 0, 0, 1)` | Icon cross-fades |

### 6.2 What animates, and what doesn't

| Thing | Motion | Why |
|---|---|---|
| Page navigation | **None** (remove the 700ms slide-in on every page) | Seen dozens of times a day |
| Tabs, row hovers, nav hovers | None, or a 150ms colour change | High frequency (better-ui) |
| Button press | Scale to `0.96`, 150ms `ease-out` | Feels responsive |
| Dropdowns, popovers, tooltips | 150 to 200ms, scale `0.96` to 1 plus opacity, from the trigger | Origin-aware (Emil) |
| Dialogs (desktop) | 200ms fade and scale from `0.96`, centred | Occasional |
| Bottom sheets (phones) | Slide up with `--ease-drawer`, ~300ms; swipe down or a quick flick to close | Feels native |
| Exits | Shorter than enters: 150ms, opacity plus `-12px` and 4px blur | better-ui |
| Student home, first load of the day only | Title, next-session card and timeline enter 100ms apart, each 300ms with opacity, 4px blur and `12px` rise | A gentle "welcome", rare enough to earn it |
| Copy, mute, saved and similar icon swaps | Cross-fade: scale `0.25` to 1, opacity, blur 4px to 0, 300ms | better-ui exact values |
| Hours left / credits changing | Number rolls to the new value | Rare, shows the change |
| Celebrations (milestone, onboarding complete) | Keep the confetti, tuned shorter | The one place for fun |

Every animation:
- runs only under `prefers-reduced-motion: no-preference`, with an opacity cross-fade as the fallback;
- names its properties (never `transition: all`);
- uses transitions, not keyframes, for anything that can be interrupted;
- keeps hover effects behind `@media (hover: hover)`;
- never starts from `scale(0)`.

### 6.3 Loading

- **Skeleton screens** for every page while data loads, shaped like the real content (cards, rows, calendar), with a slow, subtle pulse. Skeletons stay up for at least ~300ms once shown, so they never flash.
- **One spinner design** (fast, 600ms per turn, since a faster spinner feels quicker), used only inside buttons and small inline areas. The button keeps its width, and the label says what's happening ("Booking…", "Saving…").
- **Images** (mentor photos, blog) fade in once loaded, on a tinted placeholder.
- **Uploads** (avatars, attachments) show real progress where the code already reports it.

---

## 7. The small details

### 7.1 Progress and steps
- **Upcoming step: dashed circle.** Current step: filled ring in the brand blue. Completed: solid check. Connecting lines are dashed until the step before them is done.
- The application timeline gets a thin progress bar above the steps.
- Hours used shows as a ring, with hours left in the middle as tabular numbers.

### 7.2 Empty states
An invitation, not an apology. Each has a duotone icon, a title naming the space, one sentence, and the existing action button if the page already has one. For example, "No sessions this week" with "Book a session". We only use buttons that already exist; no new actions.

### 7.3 Status language
One palette for every status (scheduled, completed, cancelled, missed, pending, approved, paid, failed) so the same word is the same colour on every page.

### 7.4 Forms
Labels above fields, help text under them, errors in red under the field. 44px tall touch targets on phones. Inputs never trigger iOS zoom.

### 7.5 Tables (admin)
Sticky header, zebra-free rows with hairline dividers, tabular numbers right-aligned, a muted placeholder for empty cells, horizontal scroll inside the table on phones (never the whole page).

### 7.6 Copy clean-up
- The 45 em dashes in visible copy are replaced: commas, colons or full stops in sentences, and a muted "None" or "Not set" for empty values (your call, section 14).
- Title Case headings become sentence case.
- No "please", "successfully" or "!" in system copy. Student-facing copy stays warm and plain.

### 7.7 Focus and keyboard
Visible focus rings everywhere, Escape closes the top-most layer only, focus returns to the button that opened a dialog.

### 7.8 Scroll
Sheets and dialogs use `overscroll-behavior: contain`, so scrolling inside them never scrolls the page behind. Chat keeps its scroll position while new messages arrive.

### 7.9 Browser chrome
`theme-color` becomes the new sidebar blue, so the phone's status bar matches. Favicon unchanged.

---

## 8. Mobile

Phones are the main device for many students, so mobile is designed, not squeezed.

- **Bottom tab bar** restyled: Phosphor fill icon for the active tab, labels always visible, safe-area padding for the home bar.
- **Top bar**: page title, notifications, and the "More" sheet, which becomes a proper bottom sheet.
- **All popups become bottom sheets on phones** (book, reschedule, rate, check-in, request, credits, milestones): same content, same buttons, thumb-reachable.
- Cards go single-column, with the "what's next" card first.
- Tables (mostly admin) scroll horizontally inside their card.
- Checked at 375px (small iPhone), 390px, 768px (tablet) and 1440px.

---

## 9. Page-by-page

Every route, in the order we'll do them. "Heavy" means a large file or complex states.

### Shell (everyone)
`dashboard-shell`, `sidebar` (heavy, 596 lines), `mobile-tab-bar`, `mobile-top-bar`, `mobile-more-sheet`, `notification-bell`, `help-support-button`, `credits-floating-button`, logo.

### Student (option B)
| Route | Notes |
|---|---|
| `/dashboard/student` | Home: greeting, chips, next-session card, timeline, week. The first-load stagger lives here |
| `/student/sessions` (heavy, 803 lines) | Upcoming / past lists, session cards, reschedule and rate entry points |
| `/student/sessions/[id]/feedback` | Rating form |
| `/student/messages` | Chat (shared with mentor and admin chat) |
| `/student/mentors`, `/student/mentors/[id]` | Mentor cards with photo outline, profile page |
| `/student/recordings` | Video list, thumbnails |
| `/student/reports` | Report list and reader |
| `/student/profile` (heavy, 533 lines) | Academic profile form |
| `/student/services`, `/student/services/success`, `/student/credits/success` | Packages, success screens (celebration moment) |
| `/student/events`, `/events/webinars`, `/events/in-person`, `/student/resources` | Hidden from nav today; restyled anyway so nothing old is left |
| Student popups | Book session (heavy), reschedule, rate session, satisfaction survey, credits request, milestone, student onboarding flow (heavy, 713 lines) |

### Mentor (option B)
| Route | Notes |
|---|---|
| `/dashboard/mentor` | Dashboard |
| `/mentor/sessions`, `/mentor/sessions/[id]/report` | Session list, report form |
| `/mentor/requests` | Request cards |
| `/mentor/students` | Student list |
| `/mentor/availability` | Weekly availability editor |
| `/mentor/messages` | Chat |
| `/mentor/payouts` | Invoicing panel (heavy), Stripe buttons (Stripe's own pages unchanged) |
| `/mentor/profile` | Profile and avatar upload |
| `/mentor/reports` | Report list |
| `/mentor/training` (heaviest, 1,304 lines) | Long training content |
| `/mentor/onboarding` (heavy, 894 lines) | Multi-step onboarding form |
| Mentor popups | Check-in (heavy), request session, mentorship onboarding (heavy) |

### Admin (option A, compact)
`/dashboard/admin` overview, approvals, mentors, `mentors/[id]`, students, clients, create-account (heavy), student-help, events (heavy), products, sessions, manage-sessions, session-payouts (heavy table), recordings, feedbacks, satisfaction, performance (charts), messages (heaviest chat, 805 lines, plus compose dialog), blog (list, create, edit with the markdown editor), reports, fortnightly-report, transactions, payouts, issues, legal, creators. Plus the adjust-credits modal and session target fields.

### Shared and public (option B)
`/dashboard/settings` (and login history), `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/become-a-mentor`, `/blog/[slug]` (article typography), `/error`, `/maintenance`. Dev-only preview pages (`milestone-preview`, `mentor-checkin-preview`) are restyled too, since we use them for testing.

### Not in scope
Emails (Resend templates), the mentor invoice PDF, Stripe-hosted checkout and onboarding pages, and the inside of the markdown editor's toolbar (styled as far as its theme allows).

---

## 10. Phases and timeline

Roughly **7 to 8 working days**, spread across the week as you planned. Each phase is one or more local commits, and the portal works after every one.

| Day | Phase | What you'll see at the checkpoint |
|---|---|---|
| 1 | **0. Foundation and choices**: tokens, Geist, density switch, shadcn setup, check scripts ported from the CRM, a dev-only comparison page | Blue 1 to 4 side by side on real pages, Lucide vs Phosphor, final colour tokens |
| 2 | **1. Components and shell**: the library in section 4, icon swap, sidebar, mobile tab bar, top bar, More sheet, ResponsiveDialog | Every component on a dev-only gallery page; the new shell on desktop and phone |
| 3 | **2. Student**: all student pages and popups | Student home, sessions, booking sheet on a phone |
| 4 | **3. Mentor and chat**: all mentor pages, the shared chat | Mentor dashboard, availability, chat on a phone |
| 5 | **4. Admin**: all 26 admin pages in compact density | Tables, payouts, performance charts |
| 6 | **5. Public, onboarding, motion and loading**: auth pages, blog, settings, onboarding flows, skeletons, motion pass, copy clean-up | Sign-in, onboarding, loading states, reduced-motion check |
| 7 | **6. Full test and polish**: every gate in section 11, both skills' checklists, fixes | Test report with anything not verified listed |
| After | **Push and preview**: push the branch, test on the Vercel preview with your test accounts, then one PR into `main` | Your sign-off |

If something big turns up (most likely chat or the admin tables), it spills into the following week rather than being rushed.

---

## 11. Testing

The portal has no automated test suite, so we lean on automatic checks plus a careful visual walk. Same idea as the CRM, with a few portal-specific safety steps.

### 11.1 Automatic gates (run after every phase)

| Gate | Check |
|---|---|
| G1 | **No backend files touched**: nothing under `app/api`, `lib/` (except UI helpers listed in the commit), `utils/`, `supabase/`, `migrations/`, `proxy.ts`, `scripts/`, `config/` |
| G2 | **Behaviour contract** (script ported from the CRM, compared to `main`): every server action call, API call, form field `name`, submit button, link, redirect, router call, search-param key, storage key, Supabase call and `'use server'` must be identical. Any difference is listed and must be explained |
| G3 | **Class-only check**: for restyled files, everything except class names and copy is byte-identical |
| G4 | `tsc --noEmit`: no new type errors |
| G5 | `eslint`: clean |
| G6 | `next build`: passes, same route list as `main` |
| G7 | **No em dashes** in changed files |

### 11.2 Database safety (start and end of every test session)
The `CLAUDE.md` count query (conversations, messages, read messages, profiles, sessions, newest message) must match before and after. Testing only ever uses your three test accounts:
- never open a real student's or mentor's chat as admin, because opening a thread marks it read;
- open the notification bell only on test accounts;
- signing in records a login event: that's normal app behaviour, and you sign in yourself.

### 11.3 Visual walk (phase 6, then again on the preview)
- Every route in section 9, signed in as the right role, at **375px, 768px and 1440px**.
- Every state we can reach: empty, loading, error, long text, many items.
- Every popup on desktop (dialog) and phone (sheet).
- Hard-to-reach states (payout failures, Zoom, milestone, check-in) on dev-only preview pages with sample data, like `milestone-preview` already does.
- Look and open only. We never press submit, send, pay, book or approve on real data.

### 11.4 Accessibility and motion
- Contrast measured for every token pair: AA (4.5:1) for text, 3:1 for icons and input borders.
- Keyboard-only pass on the shell, a form, a dialog and a sheet.
- Reduced-motion pass: everything still works and fades instead of moving.
- Both skills' "before you finish" checklists run on the final diff.

### 11.5 Preview and merge
Only after everything above passes: push the branch, test the Vercel preview with the test accounts (same rules), then the PR. Note that preview deployments may use production environment variables, so the same database rules apply there.

---

## 12. Things that need your explicit approval

These are UI-facing, but each one touches behaviour slightly, so none happens without a yes.

| # | Change | Why it isn't purely visual | Recommendation |
|---|---|---|---|
| 1 | Replace browser `alert()` / `confirm()` (14 files) with in-app dialogs and toasts | `confirm()` pauses the code; an in-app dialog doesn't, so each call site needs careful wiring | Yes, as a separate commit, each one checked |
| 2 | Add route **loading screens** (`loading.tsx`) | Changes what you see while a page loads (shows a skeleton instead of the old page) | Yes |
| 3 | Add a **toast** system (needed for #1) | New component; no new messages, only the existing ones moved | Yes, with #1 |
| 4 | **Icon set** swap (section 5) | Imports only, but touches 98 files | Decide in phase 0 |
| 5 | **Copy edits**: em dashes, sentence case, friendlier student wording | Text changes, not behaviour | Yes; I'll list every changed sentence for review |
| 6 | Update the `theme-color` meta tag to the new blue | Changes the phone's status-bar colour | Yes |
| 7 | Remove the page entrance animation classes | They never actually ran (see section 2), so removing them changes nothing you see | Yes |

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Chat (real-time, 645 to 805-line files) breaks scroll or unread behaviour | Class-only edits there; walk it on test accounts; G2 catches logic edits |
| Bottom sheets on phones fight with existing focus or scroll code | One ResponsiveDialog built and tested first, then rolled out popup by popup |
| `alert()`/`confirm()` replacement changes flow | Only with approval, one call site at a time |
| The markdown editor and Recharts only partly take our theme | Style what they expose; accept the rest |
| Tailwind v4 border-colour compatibility rule in `globals.css` | Keep it until every border has an explicit token, then remove |
| Big diff, hard to review | One commit per phase, a short summary per commit, and the gates' reports |
| Preview deployment touches production services | Same database rules; no submits on real data |

---

## 14. Decisions (2026-10-07)

1. **Icon set: Phosphor.** Regular weight in the UI, fill for the active item, duotone for empty states and celebrations.
2. **Empty values:** a muted "None" or "Not set" (whichever reads better in context), never a dash.
3. **Section 12 items 1 to 7: all approved.**
4. **Student home stagger:** first visit of each day only.
5. **Code comments:** the em dashes in existing comments are removed in one mechanical commit at the end, so the whole project has none.
6. **Sidebar blue:** blue 2, deep navy `#13275A`, confirmed against the real pages in phase 0.

### Phase 0 findings

- **Package manager:** Vercel installs with **npm** (`package-lock.json`); `bun.lock` is stale since February and is left alone.
- **Lint baseline:** 338 errors and 58 warnings already exist (mostly `any` in API routes). The gate is "no new problems", not "zero".
- **Type check:** clean. **Build:** passes with 121 routes. Next 16's Turbopack refuses a symlinked `node_modules`, so builds run in the working copy instead of a scratch copy.
- **Token clash:** the portal used `accent` for its navy (918 classes). Renamed to `legacy-accent` (same colour, proven by a line-by-line check) so shadcn's `accent` hover token can exist.
- **Default borders:** today every unstyled border is `currentColor` (the old rule pointed at a token that was never defined). That is now spelled out, so adding the revamp's `--color-border` changes nothing on untouched pages.
- **Control borders:** shadcn's light input border is only 1.5:1, below the 3:1 rule, so inputs and dashed step circles use `#958E8A` (3.2:1).
- **Shared working copy:** another dev server (port 3001) and someone else's untracked files live in this same folder. We commit only our own paths.

## 15. References

Refero screens used for direction (search them on refero.design):

- **Google Classroom** home and style: calm white canvas, one blue for action, soft radius, light shadows. Our base mood.
- **Quizlet** style: soft grey page, pastel category tints with dark text, friendly but organised. Source of the warm tints, toned down.
- **Brilliant** home: one "jump back in" card, streak and progress shown simply. Source of "what's next first".
- **Preply** My lessons: lesson cards, tabs, messages panel. Session list and chat layout.
- **Airbnb, Revolut, Roi** booking bottom sheets: rounded top, slot grid, one confirm button. Booking and reschedule sheets on phones.
- **Luma, Hers** empty states: one icon, one line, one action.
- **DocuSign** onboarding checklist and **Hers** step timeline: progress bar plus clear done / current / next steps.
- **Headspace, Synthesia** skeletons: quiet placeholders shaped like the content.

Skills: `better-ui` (surfaces, icons, motion values) and `emil-design-eng` (animation decisions, easing, sheets, perceived speed).
