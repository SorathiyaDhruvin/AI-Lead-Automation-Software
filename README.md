# LeadFlow AI — AI Lead Automation Software

An AI-powered lead automation platform that helps businesses manage, score, and convert leads using intelligent insights and automated workflows.

---

## Features

- **AI Lead Scoring** — Automatically scores leads (0–100) using OpenAI, categorizing them as Hot, Warm, or Cold based on profile data and behavior
- **Lead Management** — Full CRUD for leads with server-side filtering by search, status, score range, and date range
- **Lead Segmentation** — Create named segments with custom criteria; leads are auto-assigned based on AI scoring
- **Automation Rules** — Define trigger-based rules (score threshold or no-contact duration) that auto-set priority or send emails
- **Email Automation** — Send templated emails to leads from within the app; SMTP-backed with fallback to console logging
- **CSV Import / Export** — Bulk import leads via CSV upload; export the current filtered lead list as a CSV file
- **Activity Timeline** — Automatic audit trail of lead creation, status changes, notes, and scoring events
- **Lead Notes** — Structured per-lead notes with author and timestamp
- **Notifications** — Real-time notification bell with unread count; auto-notified on lead creation and CSV imports
- **Lead Requests** — Users can submit lead requests; admins can review, approve, or reject them
- **Admin Panel** — Role-based admin interface for managing users and lead requests
- **Insights Dashboard** — Analytics and charts powered by Recharts for pipeline health and conversion tracking
- **Dark / Light Mode** — Full theme toggle support
- **Voice Chat** — Optional voice interface with speech-to-text and text-to-speech via Replit AI integrations
- **Google OAuth** — Sign in with Google in addition to email/password

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Routing | Wouter |
| State / Data Fetching | TanStack React Query |
| UI Components | shadcn/ui, Radix UI, Tailwind CSS |
| Forms | React Hook Form + Zod |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL, Drizzle ORM |
| Authentication | JWT + bcrypt, Google OAuth (Passport.js) |
| AI | OpenAI API |
| Email | Nodemailer (SMTP) |
| Scheduling | node-cron |
| Charts | Recharts |
| Security | Helmet, CORS, express-rate-limit |

---

## Project Structure

```
├── client/                     # React frontend
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.tsx             # Root app with routing and notification bell
│       ├── components/         # Shared UI components
│       │   ├── app-sidebar.tsx
│       │   ├── lead-details-sheet.tsx
│       │   ├── lead-dialog.tsx
│       │   ├── lead-score-chart.tsx
│       │   ├── recent-leads.tsx
│       │   ├── score-badge.tsx
│       │   ├── segment-dialog.tsx
│       │   └── ui/             # shadcn/ui primitives
│       ├── hooks/
│       │   ├── use-auth.ts
│       │   └── use-toast.ts
│       ├── lib/
│       │   ├── auth.tsx        # Auth context provider
│       │   ├── auth-utils.ts
│       │   └── queryClient.ts
│       └── pages/
│           ├── dashboard.tsx
│           ├── leads.tsx
│           ├── lead-management.tsx
│           ├── lead-automation.tsx
│           ├── lead-generation.tsx
│           ├── lead-requests.tsx
│           ├── segments.tsx
│           ├── insights.tsx
│           ├── settings.tsx
│           ├── admin.tsx
│           └── login.tsx / register.tsx
│
├── server/                     # Express backend
│   ├── index.ts                # Server entry point
│   ├── routes.ts               # All API routes
│   ├── storage.ts              # Database access layer (Drizzle)
│   ├── auth.ts                 # JWT middleware
│   ├── ai-service.ts           # OpenAI lead scoring & segmentation
│   ├── email-service.ts        # Nodemailer email sending
│   ├── cron.ts                 # Hourly automation rule evaluation
│   ├── google-oauth.ts         # Google OAuth strategy
│   ├── db.ts                   # Drizzle DB connection
│   └── seed.ts                 # Demo data seed script
│
├── shared/                     # Shared between client and server
│   ├── schema.ts               # Drizzle table definitions + Zod types
│   └── models/
│       └── auth.ts
│
├── script/
│   └── build.ts                # Production build script
├── drizzle.config.ts
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Database Schema

| Table | Description |
|---|---|
| `users` | Email/password accounts with role (`user` / `admin`) |
| `leads` | Lead profiles including AI score, category, prediction, insights |
| `segments` | Named lead groups with criteria and color |
| `activities` | Audit log of all lead events |
| `lead_notes` | Structured notes per lead with author |
| `lead_requests` | User-submitted lead requests with approval workflow |
| `automation_rules` | Trigger-action rules for automated lead handling |
| `notifications` | Per-user notification feed with read status |
| `conversations` / `messages` | Voice/chat history |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Ai-Lead-Automation-Software

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/leadflow

# Authentication
SESSION_SECRET=your-secret-key-here

# OpenAI (AI scoring and segmentation)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

# Email (optional — falls back to console.log if not set)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-smtp-password

# Google OAuth (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Database Setup

```bash
# Push schema to the database
npm run db:push
```

To seed the database with demo data including sample leads and segments:

```bash
npx tsx server/seed.ts
```

### Running the App

```bash
# Development (hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

The app runs on `http://localhost:5000` by default.

---

## Demo Account

A pre-seeded demo account is available after running the seed script:

| Field | Value |
|---|---|
| Email | `demo@leadflow.ai` |
| Password | `demo1234` |
| Role | `admin` |

The demo account includes 7 sample leads across 3 segments: Hot Leads, Enterprise Prospects, and Nurture Required.

---

## API Overview

All API routes are prefixed with `/api` and require a `Bearer <token>` Authorization header unless noted.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/leads` | List leads (with filtering) |
| POST | `/api/leads` | Create a lead |
| PATCH | `/api/leads/:id` | Update a lead |
| DELETE | `/api/leads/:id` | Delete a lead |
| POST | `/api/leads/:id/score` | AI-score a lead |
| GET | `/api/leads/:id/notes` | Get notes for a lead |
| POST | `/api/leads/:id/notes` | Add a note to a lead |
| GET | `/api/leads/:id/activity` | Get activity timeline |
| POST | `/api/leads/:id/send-email` | Send an email to a lead |
| GET | `/api/leads/export` | Export leads as CSV |
| POST | `/api/leads/import` | Import leads from CSV |
| GET | `/api/segments` | List segments |
| POST | `/api/segments` | Create a segment |
| GET | `/api/automation/rules` | List automation rules |
| POST | `/api/automation/rules` | Create an automation rule |
| PATCH | `/api/automation/rules/:id/toggle` | Enable/disable a rule |
| DELETE | `/api/automation/rules/:id` | Delete an automation rule |
| GET | `/api/notifications` | Get notifications + unread count |
| PATCH | `/api/notifications/:id/read` | Mark a notification as read |
| POST | `/api/notifications/mark-all-read` | Mark all notifications as read |
| GET | `/api/admin/lead-requests` | (Admin) List all lead requests |
| PATCH | `/api/admin/lead-requests/:id` | (Admin) Update request status |

**Rate limiting:** 200 req/min on all `/api/*` routes; 20 req/15min on auth endpoints.

---

## Automation Rules

Rules are evaluated hourly by the cron scheduler. Each rule has:

- **Trigger**: `score_threshold` (fires when a lead's AI score exceeds a value) or `no_contact_hours` (fires when a lead hasn't been contacted in N hours)
- **Action**: `set_priority` (updates lead status) or `send_email` (sends a templated email via SMTP)

---

## Security

- HTTP headers hardened with [Helmet](https://helmetjs.github.io/)
- CORS restricted to `*.replit.dev` and `*.repl.co` origins (update for your domain)
- Rate limiting on all API and auth endpoints
- Passwords hashed with bcrypt
- JWTs expire after 7 days
- Admin routes protected by role middleware

---

## License

MIT
