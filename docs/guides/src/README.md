# Portal guide source

Source for `docs/guides/student_portal_guide.pdf` and
`docs/guides/mentor_portal_guide.pdf`: section-by-section walkthroughs of the
portal. These are separate from the onboarding PDFs in
`lib/email/attachments/`, which are emailed when an account is created.

| File | What it is |
|---|---|
| `student.html`, `mentor.html` | Guide content |
| `guide.css` | Shared layout and branding (gold logo, cream bars, gold rules) |
| `render.cjs` | HTML to A4 PDF, with the logo footer and page numbers |
| `capture.cjs` | Screenshots of the student portal |
| `login-mentor.cjs`, `capture-mentor.cjs` | Sign in, then screenshots of the mentor portal |
| `process-shots.py` | Crops and compresses raw captures into the JPEGs the guides use |
| `pdfpages.swift` | Renders PDF pages to PNG for review (macOS) |

Writing rules: plain UK English, no em or en dashes, no blank stretches on a
page (fill gaps with useful tips or common questions), and only describe
behaviour the code actually has.

## Updating the text only

```bash
npm i --no-save --prefix docs/guides/src playwright@1.63.0
node docs/guides/src/render.cjs docs/guides/src/student.html docs/guides/student_portal_guide.pdf "Student Portal Guide"
node docs/guides/src/render.cjs docs/guides/src/mentor.html docs/guides/mentor_portal_guide.pdf "Mentor Portal Guide"
```

Then check every page for gaps or overflow:

```bash
swift docs/guides/src/pdfpages.swift docs/guides/mentor_portal_guide.pdf /tmp/pages
```

## Retaking screenshots

The dev server talks to the **production** Supabase project (see the repo
`CLAUDE.md`), so the capture scripts are built not to change anything:

- A person signs in by hand in the window the script opens. Never script a
  password; logins go to production.
- After sign-in, every non-GET request is aborted (Supabase writes, server
  actions, API POSTs) and logged as `BLOCKED`. Opening Messages, for example,
  would otherwise mark the test account's messages as read.
- Names and placeholder content from the test accounts are swapped on screen
  only for British sample data (student Alex Morgan, mentor Dr Emily Carter,
  support Claire Marlowe). Nothing is saved.

Run the before/after count check from `CLAUDE.md` around every capture.

```bash
npm run dev                                   # in another terminal
node docs/guides/src/capture.cjs              # sign in as the test student
node docs/guides/src/login-mentor.cjs         # sign in as the test mentor
node docs/guides/src/capture-mentor.cjs       # headless, reuses that sign-in
python3 docs/guides/src/process-shots.py
```

Pass step names to retake only some shots, for example
`node docs/guides/src/capture-mentor.cjs payouts students`.

The pin positions on the "Finding your way around" pages are percentages of
the dashboard screenshot. Re-check them if the layout changes.
