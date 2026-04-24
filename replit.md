# LeadFlow AI

## Overview

LeadFlow AI is an AI-powered lead automation platform for businesses. It enables users to manage, score, and segment leads using intelligent AI-driven insights. The platform provides a dashboard for lead management, AI-powered lead scoring, automatic segmentation, and actionable insights to help sales teams prioritize and convert leads effectively.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite for development and production builds
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON APIs with JWT authentication
- **Build**: esbuild for production bundling with selective dependency bundling

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for schema migrations (`npm run db:push`)
- **Tables**: users, leads, segments, activities, conversations, messages, leadRequests

### Authentication
- **Method**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Token Storage**: Client-side localStorage
- **Middleware**: Custom auth middleware validates Bearer tokens on protected routes
- **Session Duration**: 7-day token expiration

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations)
- **Features**: Lead scoring, lead segmentation, insights generation
- **Fallback**: Rule-based scoring when AI is unavailable
- **Audio Support**: Voice chat capabilities with speech-to-text and text-to-speech

### Project Structure
```
├── client/           # React frontend application
│   ├── src/
│   │   ├── components/   # UI components and feature components
│   │   ├── pages/        # Route page components
│   │   ├── lib/          # Utilities, auth context, query client
│   │   └── hooks/        # Custom React hooks
├── server/           # Express backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database access layer
│   ├── auth.ts       # JWT authentication logic
│   ├── ai-service.ts # AI scoring and segmentation
│   └── replit_integrations/  # AI integration modules
├── shared/           # Shared code between client and server
│   └── schema.ts     # Drizzle database schema and Zod types
```

### Key Design Decisions
- **Monorepo Structure**: Frontend and backend colocated for simpler deployment
- **Shared Types**: Schema definitions shared between client and server via `@shared` alias
- **Component Library**: shadcn/ui provides unstyled, accessible components that are fully customizable
- **Database Abstraction**: Storage interface pattern allows swapping implementations

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### AI Services
- **OpenAI API**: Used for lead scoring, segmentation, and insights
- **Environment Variables**:
  - `AI_INTEGRATIONS_OPENAI_API_KEY`: API key for OpenAI
  - `AI_INTEGRATIONS_OPENAI_BASE_URL`: Base URL for API requests

### Authentication
- **Environment Variables**:
  - `SESSION_SECRET`: Secret key for JWT signing (falls back to default in development)

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `jsonwebtoken` / `bcryptjs`: Authentication
- `zod`: Runtime validation and type inference
- `recharts`: Data visualization for lead analytics
- `date-fns`: Date formatting and manipulation

## Recent Changes (January 2026)

### Login Flow Fix
- Fixed React warning about setState during render in ProtectedRoute by using useEffect for redirects
- Added small delay (100ms) in login page before navigation to ensure React state settles

### Demo Account
- Email: demo@leadflow.ai
- Password: demo1234
- Role: admin (can access Admin Panel)
- Includes 7 sample leads across 3 segments (Hot Leads, Enterprise Prospects, Nurture Required)

### Admin Panel & Lead Request System (January 2026)
- **Lead Requests**: Users can submit requests for new leads via /lead-requests page
- **Admin Panel**: Admin users can manage lead requests at /admin
- **Role-Based Access Control**: JWT tokens include role field, adminMiddleware protects /api/admin/* routes
- **Request Statuses**: pending → in_review → approved/rejected
- **AdminProtectedRoute**: Component that redirects non-admin users to dashboard
- **Database Table**: leadRequests stores user submissions with priority, status, and admin notes

### AI Lead Scoring & Dashboard Analytics (April 2026)
- **Enhanced AI Scoring**: POST /api/leads/:id/score now returns and stores score (0-100), category (Hot/Warm/Cold), prediction, insights, and recommended action
- **New Schema Columns**: `leads` table has `ai_category` and `ai_recommended_action` columns
- **Dashboard Stats API**: GET /api/dashboard/stats returns totalLeads, hotLeads, avgScore, conversionRate, statusCounts (per-status breakdown), dailyTrend (last 7 days)
- **Dashboard Charts**: Line chart for daily lead volume (7-day trend), horizontal bar chart for leads by status (Recharts)
- **Lead Details UI**: Shows Hot/Warm/Cold category badge and recommended action card in both LeadDetailsSheet and lead-management inline sheet
- **AI Model**: Updated to gpt-4o-mini for scoring

### Design System
- Primary: #0066FF (blue)
- Secondary: #6C5CE7 (purple)
- Success: #00D68F (green)
- Background: #F7F9FC (light grey)
- Text: #2D3748 (dark grey)
- Accent: #FFB946 (amber)