# LeadFlow AI — Production AI Lead Automation Software 🚀

**LeadFlow AI** is a powerful, full-stack, autonomous sales and lead automation platform. It leverages advanced AI (Google Gemini) to automatically score leads, draft highly personalized sales outreach emails, and intelligently follow up with prospects based on event-driven triggers.

---

## 🌟 Key Features

### 🧠 1. AI-Powered Lead Intelligence
- **AI Lead Scoring:** Automatically scores incoming leads (0–100) and categorizes them as Hot, Warm, or Cold based on demographic and firmographic data.
- **AI Sales Email Generator:** Crafts personalized outreach emails tailored to the lead's context, your target objective, and preferred tone of voice.
- **AI Reply Assistant:** Detects natural language intent (Interested, Not Interested, Needs Info, Pricing, Meeting) and generates instant draft responses.
- **Smart Follow-Up System:** Multi-step automated follow-up copy generator with intelligent delay recommendations.

### ⚙️ 2. Autonomous Automation Engine
- **Event-Driven Execution:** Runs entirely autonomously based on triggers (e.g., `lead_created`, `lead_scored`, `lead_status_changed`). No manual "Run Now" clicks needed.
- **Background Processing:** Scheduled delay processors run seamlessly in the background (every 60s) to process delayed action queues with max-retry safeguards.
- **Idempotency Protection:** Hour-window database execution locking prevents duplicate actions from firing.

### 📊 3. Complete Lead Management & CRM
- **Unified CRM Dashboard:** Full CRUD capabilities (Create, View, Edit, Delete, Search, Filter, Sort, Paginate).
- **Import/Export:** Robust CSV parsing with duplicate email detection and protection against CSV injection.
- **Public Lead Form Builder:** Generate copyable HTML form embed snippets to capture leads directly from your public website.

### ✉️ 4. Email System & Analytics Tracking
- **Brevo SMTP & Nodemailer Integration:** Reliable HTML email delivery.
- **Engagement Tracking:** 
  - Open tracking via 1x1 transparent PNG pixels.
  - Click tracking via secure redirect links.
- **Real-Time Analytics:** Dashboard computes real-time Open Rate, Click Rate, Delivery Rate, and Failure Rate.

### 🔐 5. Robust Security & Auth
- **Supabase Authentication:** Secure Google OAuth and Email/Password authentication.
- **Role-Based Access Control (RBAC):** Server-side enforced admin authorization on sensitive API routes.

---

## 🛠 Tech Stack

### Frontend (Client-Side)
- **Framework:** React 18 & Vite
- **Styling:** Tailwind CSS, `tailwindcss-animate`, Radix UI Primitives
- **Animations:** Framer Motion
- **Data Visualization:** Recharts
- **State/Data Fetching:** `@tanstack/react-query`
- **Routing:** `wouter`
- **Forms & Validation:** `react-hook-form` & `zod`

### Backend (Server-Side)
- **Runtime & Framework:** Node.js, Express.js
- **Database:** PostgreSQL (with `pg` driver)
- **Authentication:** Supabase Auth & JWT
- **AI Integration:** Google Gemini AI SDK (`@google/genai`), OpenAI SDK (optional fallback)
- **Email Delivery:** Brevo SMTP via `nodemailer`
- **Security:** `helmet`, `cors`, `express-rate-limit`, `bcryptjs`

---

## 🏗 System Architecture

```mermaid
graph TD
    User([User / Lead]) -->|Google OAuth / Credentials| Auth[Supabase & JWT Auth]
    User -->|Submit Web Form| WebForm[Public Capture API]
    
    WebForm --> Backend[Express Backend Engine]
    Auth --> Backend
    
    Backend --> DB[(PostgreSQL Database)]
    Backend --> AI[Google Gemini AI Service]
    Backend --> AutoEngine[Autonomous Automation Engine]
    Backend --> Email[Brevo SMTP Email Service]
    
    AI -->|Score 0-100 & Hot/Warm/Cold| DB
    AI -->|Personalized Copy| Email
    
    AutoEngine -->|Triggers & Idempotency| ExecLog[Execution Logs]
    AutoEngine -->|Scheduled Delays| Scheduler[Background Processor]
    
    Email -->|1x1 Pixel & Link Redirects| Track[Email Tracking Engine]
    Track -->|Opened / Clicked Events| ActivityTimeline[Activity Timeline]
```

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/SorathiyaDhruvin/AI-Lead-Automation-Software.git
cd AI-Lead-Automation-Software-github
```

### 2. Environment Variables Setup

You need to configure environment variables for both the frontend and backend.

**Backend (`backend/.env`):**
Create a `.env` file in the `backend/` directory using `backend/.env.example` as a reference.
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
```

**Frontend (`frontend/.env`):**
Create a `.env` file in the `frontend/` directory.

### 3. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Run the Application Locally

You will need two terminals to run the frontend and backend concurrently.

```bash
# Terminal 1 — Start Backend Server (runs on Port 5001)
cd backend
npm run dev

# Terminal 2 — Start Frontend Application (runs on Port 5000/Vite default)
cd frontend
npm run dev:frontend
```

Visit the application in your browser at `http://localhost:5173` (or the port Vite specifies in the terminal).

---

## 🧪 Testing

The backend includes an automated testing suite for API routes.

```bash
cd backend
npm test
```

---

## 📚 Documentation
For deeper technical dives, please refer to the internal documentation:
- [Backend Documentation](./backend/README.md) - Detailed insights into the API, Automation Engine, and Email Tracking.
