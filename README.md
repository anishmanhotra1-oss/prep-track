# PrepWise — Full-Stack Study & Exam-Preparation Tracker

PrepWise is a production-quality, multi-user web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, **PostgreSQL**, **TanStack Query**, **Zustand**, and **Chart.js**.

---

## 🌟 Key Features

1. **Authentication & Session Security:**
   - Multi-user authentication via email + password with `bcrypt` password hashing.
   - HttpOnly JWT access tokens and database-backed rotating refresh tokens.
   - Register, Login, Logout, Logout All Devices, Password Reset, and Account Deletion with confirmation.

2. **Real-Time Timestamp-Based Server Timer:**
   - Server-side single active timer per user (`ActiveTimer` model) that survives page refreshes, tab closes, and device switches without drift.
   - Real-time Server-Sent Events (SSE) synchronization across open tabs and devices.
   - Fixed vertical right-edge mini-timer tab and slide-in drawer on all pages except main Stopwatch.

3. **Study Sessions & History:**
   - Detailed session recording with lap split timing, subject tags (`#hard`), and study notes.
   - GitHub-style 12-week activity heatmap, interactive month calendar, and day detail log cards.
   - Manual session entry with strict time range validation.

4. **Spaced Repetition Revisions Engine:**
   - Chronological roadmap (Overdue, Today, Tomorrow, This Week, This Month, Later).
   - Configurable interval sets (e.g. Default `1d → 7d → 30d` vs Quick Recall `1d → 3d → 7d`).
   - Overdue item persistence, step completion, snoozing options (1d, 3d, 1w), ignore/restore, and bulk editing.

5. **To-Dos & Daily Routines:**
   - Today's agenda with planned time aggregation and automatic injection of due revisions and scheduled routines.
   - For Later backlog queue.
   - Habit routine tracker calculating flame streaks, days done / scheduled ratios, and completion percentages.

6. **Syllabus Tracker:**
   - Interactive subject cards with customizable text and date columns.
   - Debounced cell autosaving (500ms) with `"Saved"` indicators.
   - Overdue target date row highlighting and one-click conversion of syllabus topics into spaced repetition cards.

7. **Interactive Planner:**
   - Day, Work week, and Week grid views with zoom controls (48px – 96px hour height).
   - Live red "now" indicator line that updates every minute.
   - Popover event cards with quick controls to launch prefilled timers, mark completed with auto-session logging, and handle single-day vs recurring series deletions.

8. **Settings & Data Management:**
   - Custom day-start hour, daily goal minutes, timezone, and week-start day.
   - Full subject manager with color palette selectors.
   - JSON and CSV data backup export & import tools.

---

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query v5, Zustand, Chart.js (`react-chartjs-2`), Lucide React icons, date-fns.
- **Backend:** Next.js Route Handlers with Zod validation.
- **Database & ORM:** PostgreSQL with Prisma ORM.
- **Auth:** `bcryptjs` hashing, `jose` JWTs, HttpOnly SameSite=Lax cookies, and Prisma database session tracking.
- **Realtime Sync:** Server-Sent Events (SSE) at `/api/sync/sse`.

---

## 🚀 Setup & Installation Instructions

### 1. Prerequisites
- Node.js `v18+` or `v20+` or `v24+`
- PostgreSQL database (or Docker installed for local PG)

### 2. Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://prepwise:prepwise_secret@localhost:5432/prepwise?schema=public"
JWT_SECRET="your-jwt-secret-at-least-32-chars-long"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-at-least-32-chars-long"
NODE_ENV="development"
PORT="3000"
```

### 3. Database Setup (Docker or Remote PG)
Start local PostgreSQL container using Docker Compose:
```bash
docker-compose up -d
```

Generate Prisma Client and push database schema:
```bash
npx prisma generate
npx prisma db push
```

Run seed script for default subjects and revision sets:
```bash
npx tsx prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Running Automated Tests

Run the automated test suite verifying streak calculations and revision step interval scheduling:
```bash
npx tsx scripts/run-tests.ts
```

---

## 📊 Streak Calculation & Revision Rules

- **Streak Rule:** A day counts towards consecutive streak if total studied time is $\ge 1$ minute OR if the day was explicitly marked as a **Rest Day** (`isRestDay === true`). The streak checks backwards from Today (or Yesterday if today has no study yet).
- **Revision Rule:** Completing step $i$ advances topic to interval $i+1$. After completing all interval steps in a set (e.g. 1d $\rightarrow$ 7d $\rightarrow$ 30d), the topic is marked as `mastered`. Overdue topics persist in red until completed or snoozed.
