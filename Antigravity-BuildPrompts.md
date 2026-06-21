# Antigravity Build Prompts — CareerHQ

How to use this file: paste **one phase at a time** into Antigravity's Editor view agent panel. Wait for it to finish, ask it to verify with the Browser Subagent, review the screenshot/diff, commit, then move to the next phase. Don't skip ahead.

Before Phase 0, drop `schema.prisma` and `CareerHQ-PRD.md` into your repo root so the agent can reference them.

---

## Phase 0 — Scaffold + Deploy Skeleton

```
Create a new Next.js 15 project using the App Router and TypeScript, named "careerhq".
Set up Tailwind CSS. Set up ESLint and Prettier with strict TypeScript (no `any` allowed).
Create a minimal home page that just says "CareerHQ" so I can verify deployment works.
Initialize a git repo, create a .gitignore for Node/Next.js, and prepare it for me to push to GitHub.
Do not add any database, auth, or business logic yet — this phase is purely scaffolding and deploy verification.
```
After this: push to GitHub, import into Vercel, confirm the blank page is live at your Vercel URL before continuing.

---

## Phase 1 — Database + Auth

```
Read schema.prisma in the repo root. Set up Prisma in this Next.js project using that exact schema —
do not modify the models. Configure the Prisma client as a singleton in lib/prisma.ts to avoid
connection exhaustion in serverless functions.

Set up Supabase Auth using magic-link (passwordless) email login. Restrict login to a single
allowed email address read from the ALLOWED_EMAIL environment variable — reject magic-link
requests for any other email server-side. Add a middleware that protects every route except
/login and redirects unauthenticated users there.

Create a simple /login page with an email input and "Send magic link" button, and a callback
route that completes the Supabase session.

Verify in the browser: confirm an unauthenticated visit to "/" redirects to /login, and that
after I click the magic link in my email, I land on a protected page successfully.
```

---

## Phase 2 — Applications CRUD

```
Build the Applications module per section 4.2 of CareerHQ-PRD.md.

Create API routes: POST /api/applications, GET /api/applications (support query params for
status and search), PATCH /api/applications/[id], DELETE /api/applications/[id]. Validate all
input with Zod before touching the database. Every route must check the Supabase session
server-side and return 401 if missing.

Build the Applications page: a real-data table (no mock/seed data, starts empty) with columns
for company, role, status, platform, applied date, days since last activity. Include an "Add
Application" form and inline status updates via a dropdown that calls PATCH immediately.

Add a Kanban view toggle: same data grouped into columns by status, draggable between columns,
calling PATCH on drop.

Design the empty state intentionally — when there are zero applications, show a clear "Add
your first application" prompt, not a blank/broken-looking table.

After building, open the app in the browser, add a real test application, confirm it appears,
update its status via both the table dropdown and the Kanban drag, and report back with
screenshots before I review.
```

---

## Phase 3 — Contacts & Follow-ups

```
Build the Contacts and Follow-ups modules per sections 4.3 and 4.2 of CareerHQ-PRD.md.

API routes: POST /api/contacts, GET /api/contacts?applicationId=, POST /api/followups,
PATCH /api/followups/[id] to mark complete. Zod validation and session checks on every route,
same pattern as Phase 2.

On the Application detail view (clicking a row from Phase 2's table), show linked contacts
with an "Add contact" form, and linked follow-ups with due dates and a "Mark done" checkbox.

On the Applications list, add a visual flag (e.g. a colored dot or badge) on any application
where status is APPLIED and lastActivity is 5+ days ago — this is the "going cold" signal.

Verify in the browser: add a contact and a follow-up to a real application, confirm the stale
flag appears correctly on an application I manually backdate, and screenshot the result.
```

---

## Phase 4 — AI Outreach Studio

```
Build the AI Outreach Studio per section 4.4 of CareerHQ-PRD.md.

Create POST /api/outreach/generate: takes company, role, messageType (cold_email |
linkedin_dm | cover_letter | follow_up), and an optional key requirement. It calls the
Gemini API server-side (API key from GEMINI_API_KEY env var, never exposed to the client)
with a system prompt that includes my real background: React Native + full-stack developer,
3 years experience, led a 4-member team at Afucent Technologies, shipped Adhan (Islamic
prayer-time app, custom native modules for iOS/Android, Firebase push notifications),
Slotifix (B2B scheduling SaaS with Google Calendar/Meet/Zoom integration), a UAE retail
banking platform (Next.js/Node/PostgreSQL/Prisma), and Fanash Beauty (React Native CLI).
Return the generated draft as plain text, no markdown formatting in the output.

Create POST /api/outreach/log: saves the final (possibly edited) draft, message type,
optional linked applicationId, and whether I marked it as sent.

Build the UI: a form for company/role/requirement/type, a "Generate" button, an editable
textarea showing the result, "Copy" and "Mark as Sent" buttons. Below it, a history list of
past generated messages pulled from the database, filterable by company.

Verify by actually generating one real message in the browser, confirming the output reads
naturally and reflects my real background (not placeholder text), and screenshotting it.
```

---

## Phase 5 — Resume Vault

```
Build the Resume Vault per section 4.5 of CareerHQ-PRD.md.

Create POST /api/resume/upload: accepts a multipart PDF upload, stores it in Supabase Storage,
creates a ResumeVersion row with the file URL and a label I provide. Only one ResumeVersion
can be isActive at a time — setting a new one active must unset the previous one.

Create POST /api/resume/score: takes the active resume's file URL and a pasted job description,
sends both to the Gemini API (extract resume text first if needed), and returns a 0-100 ATS
score plus specific, actionable gap feedback (missing keywords, unquantified claims, etc).
Save the score and feedback onto the ResumeVersion row.

Build the UI: upload form, list of all resume versions with their scores, a "set active" toggle,
a job-description paste box with a "Score against this JD" button, and a simple line chart
showing score progression across versions over time.

Verify by uploading a real PDF, scoring it against a real job description, and confirming the
score and feedback are specific (not generic) before reporting back.
```

---

## Phase 6 — Analytics Dashboard

```
Build the Analytics module per section 4.6 of CareerHQ-PRD.md and the Dashboard overview per
section 4.1.

Create GET /api/analytics/summary: returns real aggregate counts from the Application table —
total applied, by status, by platform, response rate (non-Applied/Ghosted over total),
interview rate, offer rate, and a weekly applied-count trend for the last 4 weeks.

Build the dashboard home page using this data: today's targets vs actuals (from DailyGoal,
create today's row if it doesn't exist), the pipeline funnel, and the stale-application list
pulled to the top.

Build a separate Analytics page with Recharts bar/line charts for status breakdown, weekly
trend, and platform effectiveness — all driven by /api/analytics/summary, zero hardcoded numbers.

Verify both pages render correctly with my actual current data (whatever I've entered so far)
and handle the zero-data case gracefully if a chart has nothing to show yet.
```

---

## Phase 7 — Reminders & Cron

```
Build the daily digest per section 4.7 of CareerHQ-PRD.md.

Create GET /api/cron/daily-digest: protected by checking a CRON_SECRET header matches the
environment variable (not user auth, since Vercel Cron calls this directly). It queries for
FollowUp rows due today or overdue, and Application rows in APPLIED status with lastActivity
5+ days ago. If either list is non-empty, send one email via Resend (API key from RESEND_API_KEY)
summarizing both lists with company/role names. If both lists are empty, send nothing.

Add a vercel.json with a cron entry calling this route once daily at a fixed time.

Verify by manually hitting the route with the correct secret header in development and
confirming the email content is accurate against my real current data.
```

---

## Phase 8 — Responsive + PWA Polish

```
Do a full responsive pass across every page built so far (Applications, Contacts, Outreach
Studio, Resume Vault, Analytics, Dashboard) targeting mobile (375px), tablet (768px), and
desktop (1280px+). The Kanban board especially needs a mobile-friendly fallback (e.g. switch
to the table view automatically below a breakpoint, or make columns horizontally scrollable).

Add a PWA manifest.json with app name "CareerHQ", icons, and theme color, plus the necessary
next.config setup so it can be added to a phone home screen as an installable app.

Add a dark/light theme toggle persisted in local state.

Verify by resizing the browser to each breakpoint and screenshotting the Applications and
Dashboard pages at each size before reporting back.
```

---

## Phase 9 — Harden & Monitor

```
Add a global error boundary and a custom 404 page consistent with the app's design.
Add loading skeletons to every data-fetching page so nothing flashes blank content.
Double check every API route has both Zod input validation and a server-side session check
(except the cron route, which checks CRON_SECRET instead).
Add Vercel Analytics (the official @vercel/analytics package) to track basic usage.
Review and list out every environment variable the app depends on so I can audit them in
the Vercel dashboard before final launch.
```
