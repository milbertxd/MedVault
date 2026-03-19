# MedVault - Smart Medicine Inventory Management System

A production-ready, full-stack MERN application for Barangay Health Centers to manage medicine inventory with real-time tracking, automated alerts, and comprehensive reporting.

## Features

- **Dashboard** - Real-time overview of inventory stats, low stock alerts, and category breakdown
- **Inventory Management** - Full CRUD with search, filters, stock adjustments, batch tracking, and QR code generation
- **QR Dispensing Workflow** - Mobile camera scan, real-time stock sufficiency check, auto-decrement, and dispensing history record
- **Automated Alerts** - Low stock, out of stock, expiring soon, and expired medicine notifications
- **PDF Reports** - Printable inventory reports for administrative compliance
- **Audit Trail + Logs Export** - Every stock change and user action is logged, with printable logs PDF export
- **User Management** - Role-Based Access Control (Barangay Staff, CHO Admin, CHO Monitor)
- **Multi-Center Support** - CHO administrators can monitor all health centers

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, Radix UI
- **Backend:** Node.js, Express.js, MongoDB with Mongoose
- **Security:** Helmet, express-rate-limit, JWT authentication, Zod validation, bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

1. **Clone and install dependencies:**

```bash
cd server && npm install
cd ../client && npm install
```

2. **Configure environment variables:**

Edit `server/.env`:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medvault
JWT_SECRET=your-secure-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

3. **Seed the database:**

```bash
cd server && npm run seed
```

4. **Start development servers:**

```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

5. **Open** `http://localhost:5173`

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| CHO Admin | admin@cho.gov.ph | Admin@123 |
| Barangay Staff | staff@cupang.gov.ph | Staff@123 |
| CHO Monitor | monitor@cho.gov.ph | Monitor@123 |

## Security Features

- JWT-based authentication with secure token handling
- Helmet HTTP header security
- Rate limiting (100 req/15min general, 20 req/15min auth)
- Zod schema validation on all inputs
- Password hashing with bcryptjs (12 rounds)
- RBAC (Role-Based Access Control)
- Input sanitization against injection attacks
- No API keys exposed (all via environment variables)
- Console logs disabled in production

## Project Structure

```
server/
  src/
    config/       # Database configuration
    controllers/  # Route handlers
    cron/         # Scheduled alert checks
    middleware/   # Auth, validation middleware
    models/       # Mongoose schemas
    routes/       # API route definitions
    seeds/        # Database seed script
    utils/        # Audit logger utilities
    validators/   # Zod schemas

client/
  src/
    components/
      layout/     # Sidebar, AppLayout
      ui/         # shadcn/ui components
    context/      # Auth context
    lib/          # API client, utilities
    pages/        # Dashboard, Inventory, Alerts, Reports, Users
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | User login |
| GET | /api/auth/me | Get current user |
| GET | /api/medicines | List medicines |
| POST | /api/medicines | Add medicine |
| PUT | /api/medicines/:id | Update medicine |
| PATCH | /api/medicines/:id/stock | Adjust stock |
| DELETE | /api/medicines/:id | Remove medicine |
| GET | /api/medicines/stats | Dashboard stats |
| GET | /api/alerts | List alerts |
| PATCH | /api/alerts/:id/read | Acknowledge alert |
| GET | /api/reports/inventory-pdf | Download PDF report |
| GET | /api/reports/audit-logs | View audit trail |
| GET | /api/users | List users (CHO only) |

## Deployment (Render)

### Fastest Way (Blueprint)

1. Push this project to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Select the repository. Render will detect `render.yaml` and create:
   - `medvault-api` (Node Web Service)
   - `medvault-web` (Static Site)
4. Set required env values during setup:
   - For API service: `MONGODB_URI`, `CLIENT_URL`
   - For Web service: `VITE_API_URL` (must be the API URL + `/api`)
5. Deploy.

### Required Production Env Values

- API (`medvault-api`)
  - `MONGODB_URI=mongodb+srv://...`
  - `CLIENT_URL=https://<your-web-domain>`
  - `JWT_SECRET=<strong-random-value>`
  - `JWT_EXPIRES_IN=7d`

- Web (`medvault-web`)
  - `VITE_API_URL=https://<your-api-domain>/api`

### Post-Deploy Check

- API health: `https://<your-api-domain>/api/health`
- App login: `https://<your-web-domain>/login`
- Scanner works best on HTTPS pages (Render provides HTTPS by default).

For repeatable operations, use:

- `POST_DEPLOY_SMOKE_TEST.md` for functional validation after each deployment
- `SECURITY_CLEANUP_CHECKLIST.md` for production hardening and release hygiene
