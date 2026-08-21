# AI Lead Automation Backend

Production-ready REST API for the AI Lead Automation platform. Built with Express.js, PostgreSQL, and deployed on Vercel.

## Project Structure

```
ai-lead-automation-backend/
├── api/
│   └── index.js              # Vercel serverless entry point
├── src/
│   ├── config/
│   │   └── db.js             # PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js           # JWT auth & admin middleware
│   │   ├── cors.js           # CORS whitelist config
│   │   └── errorHandler.js   # Global error handler + asyncHandler
│   ├── models/
│   │   ├── userModel.js      # User SQL queries
│   │   ├── leadModel.js      # Lead SQL queries
│   │   ├── activityModel.js  # Activity SQL queries
│   │   └── aiSuggestionModel.js # AI scoring SQL queries
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── leadController.js
│   │   ├── activityController.js
│   │   ├── aiSuggestionController.js
│   │   └── healthController.js
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── leadRoutes.js
│   │   ├── activityRoutes.js
│   │   ├── aiSuggestionRoutes.js
│   │   └── healthRoutes.js
│   └── app.js                # Express app setup
├── server.js                 # Local dev server
├── vercel.json               # Vercel deployment config
├── .env                      # Environment variables (local only)
├── .gitignore
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

```bash
npm install
```

### Configure Environment

Edit `.env` with your database credentials:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=demodb
```

### Run Locally

```bash
npm run dev
```

Server starts at `http://localhost:5000`

## API Endpoints

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | API health check |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users/register` | No | Register new user |
| POST | `/api/users/login` | No | Login |
| GET | `/api/users/profile` | Yes | Get current user |
| GET | `/api/users` | Admin | List all users |

### Leads
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/leads` | Yes | List user's leads |
| GET | `/api/leads/:id` | Yes | Get single lead |
| POST | `/api/leads` | Yes | Create lead |
| PUT | `/api/leads/:id` | Yes | Update lead |
| DELETE | `/api/leads/:id` | Yes | Delete lead |

### Activities
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/activities` | Yes | All user activities |
| GET | `/api/activities/lead/:leadId` | Yes | Lead activities |

### AI Suggestions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/ai-suggestions` | Yes | Get scored leads |
| POST | `/api/ai-suggestions/:leadId` | Yes | Generate AI score |

## Deploying to Vercel

1. Push this repo to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel Dashboard:
   - `DATABASE_URL` — your production PostgreSQL connection string
   - `JWT_SECRET` — a strong secret key
   - `NODE_ENV` — set to `production`
4. Deploy!

## CORS

Allowed origins:
- `https://ai-lead-automation-software.vercel.app` (production)
- `localhost:3000`, `localhost:5173` (development only)
