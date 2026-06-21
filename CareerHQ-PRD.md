# CareerHQ — Personal Career Command Center
**Product Requirements Document & Build Plan**
Owner: Mo. Adnan Sheikh · Built with: Google Antigravity (Gemini 3 Pro) · Deployed on: Vercel

---

## 1. Vision

A single-user, real-data web app that runs your entire job search and long-term career growth: every application, every recruiter contact, every follow-up, every AI-drafted email, every resume version, and the analytics that tell you what's actually working. Accessible from your phone, laptop, or any browser, anywhere.

**Not in scope (by design):** auto-submitting applications or auto-messaging recruiters on LinkedIn/Naukri. Those platforms detect and ban automation, and a banned account during a job search costs you more than it saves. The system drafts, tracks, and reminds — you click send. This keeps your accounts safe and your outreach looking (because it is) genuinely from you.

---

## 2. Tech Stack

| Layer | Choice | Reasoning |
|---|---|---|
| Frontend/Backend | Next.js 15, App Router, TypeScript | One framework, one deploy target, matches your existing experience |
| Styling | Tailwind CSS | Fast, matches your existing stack |
| Database | Supabase Postgres (free tier: 500MB, generous for this use case) | Relational data fits this domain; Antigravity has native Supabase MCP support |
| ORM | Prisma | You've used this on the RBA project already |
| Auth | Supabase Auth, magic-link, allow-list of one email (yours) | No passwords to manage, instant login from any device |
| File Storage | Supabase Storage (free tier: 1GB) | Resume PDF versions |
| AI | Google Gemini API (AI Studio free tier) | You're already in the Gemini ecosystem via Antigravity |
| Email | Resend (free tier: 100/day) | Daily follow-up digest emails |
| Cron | Vercel Cron (native, free) | Daily stale-application check |
| Charts | Recharts | Lightweight, matches prior dashboard work |
| Hosting | Vercel (Hobby/free tier) | As planned |

**Estimated total monthly cost: ₹0.** Every service above has a free tier sufficient for one user's job-search data.

---

## 3. Data Model

See `schema.prisma` (companion file) for the exact schema. Summary:

- **Application** — company, role, location, salary range, status, platform, dates, notes
- **Contact** — recruiter/hiring manager linked to an application
- **FollowUp** — scheduled reminder linked to an application
- **OutreachLog** — every AI-generated email/DM/cover letter, with whether you actually sent it
- **ResumeVersion** — uploaded resume files with AI-generated ATS score and feedback per version
- **DailyGoal** — daily apply/outreach targets vs actuals, powers the streak/habit view

No seed data, no mock data anywhere — the app ships empty and fills with your real activity from day one.

---

## 4. Feature Modules

### 4.1 Dashboard (Overview)
- Today's targets (applications to send, outreach to send) vs. actual, pulled live from `DailyGoal`
- Pipeline funnel: Applied → Screening → Interview → Offer, real counts
- Stale-application alerts: anything in `APPLIED` status untouched for 5+ days, surfaced first
- This-week vs last-week applied count

### 4.2 Applications
- Full CRUD table + a Kanban-style board (drag between status columns)
- Filter by status, platform, search by company/role
- Each application expands to show linked contacts, follow-ups, and outreach history
- One-click "Mark followed up today" that updates `lastActivity`

### 4.3 Contacts
- Recruiter/hiring-manager directory, searchable, linked back to applications
- Shows last contacted date and next scheduled follow-up

### 4.4 AI Outreach Studio
- Form: company, role, key requirement to address, message type (cold email / LinkedIn DM / cover letter / follow-up)
- Calls Gemini API server-side with your real background baked into the system prompt (your actual projects: Adhan, Slotifix, RBA, Fanash — not placeholder text)
- Editable output, "Copy" button, "Mark as Sent" button that logs to `OutreachLog` and links to the application
- History view of every message ever generated, filterable by company

### 4.5 Resume Vault
- Upload resume PDF → stored in Supabase Storage → new `ResumeVersion` row
- Paste a job description → Gemini scores the active resume against it (0–100) with specific gap feedback
- Score history chart across versions, so you can see your resume actually improving

### 4.6 Analytics
- Response rate, interview rate, offer rate — computed live from real `Application` data
- Platform effectiveness (which platform actually gets you replies)
- Weekly application volume trend

### 4.7 Reminders (background)
- Vercel Cron runs daily at a fixed time
- Queries for `FollowUp` rows due today/overdue and `Application` rows stale 5+ days
- Sends you one digest email via Resend: "3 follow-ups due, 2 applications going cold"

---

## 5. API Routes

```
POST   /api/applications              create
GET    /api/applications              list (filters via query params)
PATCH  /api/applications/[id]          update status/notes/etc
DELETE /api/applications/[id]

POST   /api/contacts
GET    /api/contacts?applicationId=

POST   /api/followups
PATCH  /api/followups/[id]            mark complete

POST   /api/outreach/generate         calls Gemini, returns draft (does NOT save)
POST   /api/outreach/log              saves a generated/edited draft + sent status

POST   /api/resume/upload             multipart -> Supabase Storage -> ResumeVersion row
POST   /api/resume/score              Gemini ATS scoring against pasted JD

GET    /api/analytics/summary         aggregate stats for dashboard/analytics pages

GET    /api/cron/daily-digest         called by Vercel Cron only, protected by a secret header
```

---

## 6. Non-Functional Requirements

- **Responsive**: mobile-first breakpoints; usable one-handed on a phone for quick status updates
- **Installable**: PWA manifest so it can be added to your phone's home screen and feel like a native app
- **Single-user security**: every API route checks the Supabase session server-side; no route is public except the cron endpoint (protected by a secret header, not auth)
- **No dummy data**: empty states everywhere, designed to look intentional (not broken) when a table has zero rows
- **Performance**: server components for data-heavy pages, client components only where interactivity is needed

---

## 7. Phased Build Plan

Each phase is sized for a working professional doing this evenings/weekends. Each phase ends with something **deployed and clickable on Vercel** — never go more than one phase without a live deploy, so bugs surface immediately instead of compounding.

| Phase | Goal | Output | Est. time |
|---|---|---|---|
| 0 | Scaffold + deploy skeleton | Next.js app live on Vercel, blank page | 0.5 day |
| 1 | Database + Auth | Supabase wired, Prisma migrated, magic-link login working | 1 day |
| 2 | Applications CRUD | Full table + form + status updates, real data only | 1.5 days |
| 3 | Contacts & Follow-ups | Linked contacts, follow-up scheduling, stale-application flag | 1 day |
| 4 | AI Outreach Studio | Gemini-powered draft generator + history log | 1.5 days |
| 5 | Resume Vault | Upload, storage, AI ATS scoring, version history | 1 day |
| 6 | Analytics Dashboard | Real charts from real data | 1 day |
| 7 | Reminders & Cron | Daily digest email working in production | 0.5 day |
| 8 | Responsive + PWA polish | Mobile pass, installable, dark mode | 1 day |
| 9 | Harden & monitor | Error boundaries, Vercel Analytics, backup check | 0.5 day |

**Total: ~10 days of focused evening/weekend work.**

---

## 8. Antigravity Workflow — How to Avoid Bugs

1. **One phase per agent session.** Don't paste the whole PRD and ask for everything — feed one phase prompt at a time (see companion `Antigravity-BuildPrompts.md`). Smaller scope = fewer compounding errors.
2. **Use the Browser Subagent to self-verify.** After each phase, explicitly ask the agent to open the app, click through the new feature, and report back with a screenshot before you review code. Don't trust a diff you haven't seen run.
3. **Commit after every phase**, not after every file. If a later phase breaks something, you have a clean rollback point.
4. **Use the Manager view for independent work**, e.g., one agent polishing Phase 2's UI while another starts Phase 3's API routes — but only once Phase 2 is committed and verified, to avoid two agents fighting over the same files.
5. **Add a project Skill** (Antigravity Skills folder) with your coding standards once, so every later phase agent automatically follows them without you repeating yourself:
   - TypeScript strict mode, no `any`
   - Server Components by default, `"use client"` only when needed
   - All dates stored/queried in UTC, displayed in IST
   - Every new API route must validate input with Zod before touching the database

---

## 9. Deployment Checklist

1. Create a free Supabase project → copy `DATABASE_URL` and `DIRECT_URL` (pooled + direct)
2. Create a free Resend account → copy API key, verify your sending domain or use their test domain initially
3. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com) (separate from your Gemini Pro subscription — the app subscription doesn't include API credits, but AI Studio's free tier does)
4. Push repo to GitHub → import into Vercel
5. Set environment variables in Vercel: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `ALLOWED_EMAIL`
6. Add `vercel.json` cron config pointing to `/api/cron/daily-digest`
7. Run `npx prisma migrate deploy` against production DB on first deploy
8. Test the full flow live: log in via magic link on your phone, add a real application, confirm it appears on desktop too
