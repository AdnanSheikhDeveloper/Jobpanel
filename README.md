# 🚀 CareerHQ — Personal Career Command Center

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=for-the-badge&logo=googlegemini)](https://deepmind.google/technologies/gemini/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=progressive-web-apps)](https://web.dev/explore/progressive-web-apps)

**CareerHQ** is a production-grade, full-stack personal CRM and AI-powered Job Search Command Center. Built with Next.js 15 App Router, Supabase, and Prisma ORM, it is designed to automate the manual friction of job searching. CareerHQ tailors resumes to a >90% ATS match score, drafts cold emails, aggregates conversion analytics, and triggers automated daily email digests.

---

## 🎨 Core Architectural Features

### 1. Unified CRM Application Dashboard
* **Dynamic Pipeline Funnel**: Tracks listing conversions from `Wishlist` and `Applied` up to `Technical Round`, `HR Round`, and `Offer`.
* **Habit & Goal Tracker**: Monitor progress meters comparing applications and outreach metrics completed against custom daily targets.
* **Stale Alerts & Quick Hooks**: Detects applications stuck in the applied stage for 5+ days and provides rapid hooks to mark them followed up or trigger auto-draft generators.

### 2. AI Resume Vault & PDF Compiler
* **Supabase File Storage**: Securely archives multiple resume versions.
* **Real-time ATS Suitability Scanner**: Feeds PDF resume text and target Job Descriptions into the Gemini AI model to calculate match scores and detect missing keywords or unquantified impact.
* **One-Click Auto-Tailoring**: Gemini dynamically rewrites your resume using target keywords and the **Google X-Y-Z formula** (*"Accomplished X, measured by Y, by doing Z"*).
* **PDF Exporter**: Renders the optimized resume in a print-ready PDF template leveraging browser engine printing layout styles.

### 3. AI Outreach Studio
* **Contextual Asset Generators**: Automatically generates customized, high-converting Cover Letters and recruiter Cold Email templates prefilled with pipeline listing details.

### 4. Visual Analytics Engine
* **Interactive Charting (Recharts)**:
  * **Application Trend**: An Area Chart showing daily application volume cadences.
  * **Funnel Stages**: A Bar Chart representing active pipelines by status.
  * **Platform Stats**: A grouped Column Chart comparing total submittals, response frequencies, and percentage conversion rates by platform.

### 5. Automated Daily Digest Cron
* **Secure Vercel Cron Endpoint**: A background route (`/api/cron/daily-digest`) secured via Vercel `CRON_SECRET` tokens.
* **Resend Email Integration**: Aggregates due follow-up tasks and stale listings, compiles them into a clean, dark-themed HTML digest, and emails it daily.

### 6. PWA Installability & Performance Hardening
* **Progressive Web App**: Features dynamic Next.js Web Manifests and custom-compiled launcher icons for full mobile installation.
* **Resiliency**: Hardened with React Global Error Boundaries, custom 404 navigation pages, and Vercel Analytics + Speed Insights telemetry tracking.

---

## 🏗️ System Architecture & Data Flow

The diagram below details the end-to-end data lifecycle of the application:

```mermaid
graph TD
    User["User Client (Next.js PWA)"] -->|Uploads PDF / JD| API["Next.js App API (Server Actions)"]
    API -->|Saves Assets| SupaDB[("Supabase Postgres (Prisma ORM)")]
    API -->|Saves PDF file| SupaStore[("Supabase File Storage")]
    API -->|Feeds Data| Gemini["Gemini 2.5 Flash Engine"]
    Gemini -->|Returns JSON ATS Scores & Tailored Markdown| API
    API -->|Renders Print Window| PrintEngine["Browser Print Engine (PDF Export)"]
    Cron["Vercel Cron (Daily)"] -->|GET requests + CRON_SECRET| API_Cron["/api/cron/daily-digest"]
    API_Cron -->|Queries due reminders| SupaDB
    API_Cron -->|Triggers Email| Resend["Resend API"]
    Resend -->|Delivers HTML Digest| Inbox["User Inbox (ALLOWED_EMAIL)"]
```

---

## 💾 Database Schema (Prisma)

The application utilizes a PostgreSQL relational database. Below is the Prisma schema core data model:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum ApplicationStatus {
  WISHLIST
  APPLIED
  SCREENING
  INTERVIEW
  TECHNICAL
  HR_ROUND
  OFFER
  REJECTED
  GHOSTED
  WITHDRAWN
}

enum Platform {
  LINKEDIN
  INDEED
  WELLFOUND
  OTTER
  COMPANY_WEBSITE
  OTHER
}

model Application {
  id             String            @id @default(cuid())
  company        String
  role           String
  location       String?
  salaryMin      Int?
  salaryMax      Int?
  salaryCurrency String            @default("INR")
  jobUrl         String?
  status         ApplicationStatus @default(APPLIED)
  platform       Platform
  appliedDate    DateTime          @default(now())
  lastActivity   DateTime          @default(now())
  notes          String?
  contacts       Contact[]
  followUps      FollowUp[]
  outreachLogs   OutreachLog[]
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  @@index([status])
  @@index([appliedDate])
}

model Contact {
  id            String      @id @default(cuid())
  name          String
  role          String?
  email         String?
  phone         String?
  linkedinUrl   String?
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())
}

model FollowUp {
  id            String      @id @default(cuid())
  dueDate       DateTime
  completed     Boolean     @default(false)
  note          String?
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())

  @@index([dueDate, completed])
}

model OutreachLog {
  id            String      @id @default(cuid())
  type          String      // e.g. COLD_EMAIL, COVER_LETTER, FOLLOW_UP
  content       String
  sentDate      DateTime    @default(now())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())
}

model ResumeVersion {
  id          String   @id @default(cuid())
  label       String
  fileUrl     String
  targetRole  String?
  atsScore    Int?
  feedback    String?
  isActive    Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model DailyGoal {
  id             String   @id @default(cuid())
  date           DateTime @unique @default(now())
  applyTarget    Int      @default(5)
  applyDone      Int      @default(0)
  outreachTarget Int      @default(10)
  outreachDone   Int      @default(0)
  createdAt      DateTime @default(now())
}
```

---

## 📂 Project Structure

```bash
careerhq/
├── public/                 # Static PWA launcher icons and SVG graphics
├── src/
│   ├── app/                # Next.js App Router root directories
│   │   ├── analytics/      # Recharts visualizations dashboard
│   │   ├── api/            # Serverless backend API routes
│   │   │   ├── analytics/  # Aggregated summary logic endpoints
│   │   │   ├── cron/       # Secured Vercel Cron Daily digests
│   │   │   ├── outreach/   # AI Outreach generations
│   │   │   └── resume/     # PDF upload, scoring, and tailoring
│   │   ├── auth/           # OAuth and Magic Link callback processing
│   │   ├── login/          # Auth access controls page
│   │   ├── outreach/       # Generative outreach workspace UI
│   │   └── resume/         # AI Resume Vault & Auto-Tailoring interface
│   ├── components/         # Reusable dashboard and modular CRM views
│   ├── lib/
│   │   ├── prisma.ts       # Singleton Prisma Client instances
│   │   └── supabase/       # SSR client and server configurations
│   ├── types/              # Domain-level TypeScript definitions
│   └── middleware.ts       # Route guard middleware (Supabase Auth Session)
├── vercel.json             # Deployment cron configurations
└── prisma/
    └── schema.prisma       # Relational models and database adapters
```

---

## 🛠️ Local Development Setup

Follow these steps to spin up CareerHQ locally:

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/AdnanSheikhDeveloper/Jobpanel.git
cd careerhq
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Supabase PostgreSQL database connections
DATABASE_URL="postgresql://postgres:[password]@db.zzmsgecantawbdfofoop.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[password]@db.zzmsgecantawbdfofoop.supabase.co:5432/postgres"

# Supabase Auth Client secrets
NEXT_PUBLIC_SUPABASE_URL="https://zzmsgecantawbdfofoop.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."

# Next.js Public Host URL (used for Auth redirects)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# AI Model Keys (Gemini)
GEMINI_API_KEY="AIzaSy..."

# Telemetry and Notifications
RESEND_API_KEY="re_..."
ALLOWED_EMAIL="your-registered-email@gmail.com"
CRON_SECRET="your-random-cron-authorization-secret"
```

### 3. Initialize Prisma Database Model
Sync the models, configure the client, and build standard indexes:
```bash
npx prisma generate
npx prisma db push
```

### 4. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application center.

---

## 🚢 Deployment to Vercel

1. **Deploy Repository**: Link your GitHub repository to Vercel.
2. **Environment Variables**: Add all variables defined in the `.env` settings to your Vercel Dashboard.
3. **Register Supabase Callback Redirects**:
   - In Supabase > **Authentication** > **URL Configuration**:
     - Set **Site URL** to: `https://your-app-domain.vercel.app`
     - Add **Redirect URL**: `https://your-app-domain.vercel.app/**`
4. **Vercel Cron**: Vercel will automatically read [`vercel.json`](file:///d:/Projects/Jobpanel/careerhq/vercel.json) to trigger the `/api/cron/daily-digest` daily cron job at your scheduled time.

---

## 🏆 Engineering Best Practices Demonstration
* **Strict Type Safety**: Handled entirely under strict TypeScript type checks for DB models, React states, and API responses.
* **Optimal Loading & Performance**: Client-side bundling optimizations, lightweight custom Markdown-to-HTML parser engines, and Recharts responsiveness configurations.
* **Next.js App Router Structure**: Clean distinction between server APIs, Server Actions, client wrapper components, and route middlewares.
