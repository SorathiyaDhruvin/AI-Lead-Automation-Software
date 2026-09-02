# LeadFlow AI — Production AI Lead Automation Platform

**LeadFlow AI** is a full-stack, autonomous sales automation platform powered by Google Gemini AI, PostgreSQL, Express.js, and React.

---

## 🏗 System Architecture & Workflow

```mermaid
graph TD
    User([User / Lead]) -->|Google OAuth / Credentials| Auth[Supabase & JWT Auth]
    User -->|Submit Web Form| WebForm[Public Capture API /api/public-leads/public-capture]
    
    WebForm --> Backend[Express Backend Engine]
    Auth --> Backend
    
    Backend --> DB[(PostgreSQL Database)]
    Backend --> AI[Google Gemini AI Service]
    Backend --> AutoEngine[Autonomous Automation Engine]
    Backend --> Email[Brevo SMTP Email Service]
    
    AI -->|Score 0-100 & Hot/Warm/Cold| DB
    AI -->|Personalized Copy| Email
    
    AutoEngine -->|Triggers & Idempotency| ExecLog[Execution Logs]
    AutoEngine -->|Scheduled Delays| Scheduler[60s Background Processor]
    
    Email -->|1x1 Pixel & Link Redirects| Track[Email Tracking Engine]
    Track -->|Opened / Clicked Events| ActivityTimeline[Activity Timeline]
```

---

## ⚡ Core Features

### 1. Unified Authentication & Sync
- **Google OAuth & Email/Password Auth**: Powered by Supabase Auth with session persistence and background user sync into PostgreSQL `users`.
- **Role-Based Access Control**: Server-side enforced admin authorization on `/api/admin/*`.

### 2. Complete Lead Management
- **CRUD Operations**: Create, View, Edit, Delete, Search, Filter, Sort, and Paginate.
- **CSV Import & Export**: Safe CSV parsing with duplicate email detection (`getByEmailAndUser`) and formula stripping protection against CSV injection (`sanitizeCsvValue`).
- **Database Indexes**: Optimized indexes on `user_id`, `email`, `status`, `ai_score`, `created_at`.

### 3. AI Lead Intelligence
- **AI Lead Scoring**: 0–100 score, Hot/Warm/Cold category rating, key strengths, weaknesses, and recommended action.
- **AI Sales Email Generator**: Custom personalized sales outreach copy generation tailored to lead context, target objective, and tone of voice.
- **AI Follow-Up System**: Multi-step automated follow-up copy generator with optimal delay recommendation.
- **AI Reply Assistant**: Natural language intent detection (`Interested`, `Not Interested`, `Needs Info`, `Pricing`, `Meeting`), sentiment analysis, and instant draft response generator.

### 4. Autonomous Automation Engine
- **Event-Driven Execution**: Listens for triggers (`lead_created`, `lead_scored`, `lead_status_changed`), evaluates server-side conditions (`score >= X`, `status_equals`), and executes actions automatically without manual "Run Now" clicks.
- **Idempotency Protection**: Hour-window database execution locking via `executionModel.checkIdempotency(key)` prevents duplicate actions.
- **Scheduled Delay Processor**: Background processor (`scheduledProcessor.js`) runs every 60s processing delayed action queues with max retry safeguards.

### 5. Email System & Analytics Tracking
- **Brevo SMTP & Nodemailer Integration**: Reliable HTML email delivery.
- **Open & Click Tracking**:
  - Open tracking via 1x1 transparent PNG pixel (`/api/email/track/open/:logId`).
  - Click tracking via redirect link wrapping (`/api/email/track/click/:logId?url=...`).
- **Dashboard Analytics**: Computes real-time Open Rate, Click Rate, Delivery Rate, and Failure Rate.

### 6. Public Lead Form & Embed Builder
- **Public API**: `POST /api/public-leads/public-capture` (rate-limited, anti-spam protected).
- **Embed Builder UI**: Generate copyable HTML form embed snippet and test submissions live inside the app.

---

## 🛠 Local Setup & Running Tests

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Create `.env` inside `backend/`:

```env
PORT=5001
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_service_key
GEMINI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-3.7-flash
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your_brevo_user
BREVO_SMTP_PASSWORD=your_brevo_password
BREVO_FROM_EMAIL=your_email@domain.com
BREVO_FROM_NAME=LeadFlow AI
```

### 3. Run Automated Tests

```bash
cd backend
npm test
```

### 4. Run Servers Locally

```bash
# Terminal 1 — Backend API Server (Port 5001)
cd backend
npm run dev

# Terminal 2 — Frontend Application (Port 5000)
cd frontend
npm run dev
```

Visit the application at: `http://localhost:5000`
