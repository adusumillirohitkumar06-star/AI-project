# PRODUCTION DEPLOYMENT & LAUNCH GUIDE

This guide provides instructions for deploying the **AI Airport Operations & Gate Allocation Simulator** to production.

---

## 1. TARGET ARCHITECTURE
```text
User / Browser
      ↓
Next.js Frontend (Hosted on Vercel)
      ↓ (HTTPS + Authorization: Bearer <JWT>)
FastAPI Backend (Hosted on Render / Railway / Containerized)
      ↓ (SQLAlchemy 2.0 + Connection Pooling)
Managed PostgreSQL Database (Render Postgres / Supabase / Neon)
      ↓
Pure Python CSP Scheduling Engine (In-process execution)
```

---

## 2. PRODUCTION ENVIRONMENT VARIABLES

### Backend Configuration (Render / Railway / Docker)
Set the following environment variables in your hosting provider's dashboard:

| Variable | Recommended Value / Description | Sensitive? |
|---|---|:---:|
| `ENVIRONMENT` | `production` | No |
| `DEBUG` | `false` | No |
| `DATABASE_URL` | `postgresql://user:password@host:port/database` | **YES** |
| `SECRET_KEY` | High-entropy 64-char hex string (e.g. `openssl rand -hex 32`) | **YES** |
| `ALGORITHM` | `HS256` | No |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24 hours) | No |
| `ENABLE_SECURITY_HEADERS` | `true` | No |
| `DB_POOL_SIZE` | `20` | No |
| `DB_MAX_OVERFLOW` | `10` | No |
| `DB_POOL_TIMEOUT` | `30` | No |
| `CORS_ORIGINS` | JSON list of frontend production URLs, e.g. `["https://your-app.vercel.app"]` | No |
| `PORT` | Auto-provided by hosting provider (default `8000`) | No |

### Frontend Configuration (Vercel)
Set in Vercel project settings:

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public HTTPS URL of the deployed FastAPI backend | `https://ai-airport-backend.onrender.com` |

---

## 3. DEPLOYMENT WORKFLOW

### Step 1: Database Setup
1. Provision a managed PostgreSQL instance (e.g. Render Postgres, Supabase, Neon, or Railway).
2. Copy the production connection string (`DATABASE_URL`).

### Step 2: Backend Deployment (Render or Railway)
#### Option A: Deploy via Render Blueprint (Recommended)
1. Push this repository to GitHub.
2. In Render, select **New +** → **Blueprint**.
3. Select your repository. Render will automatically parse [`render.yaml`](../render.yaml) and create:
   - A managed PostgreSQL instance (`ai-airport-db`)
   - The FastAPI web service (`ai-airport-backend`)
4. Render will execute:
   ```bash
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Copy your deployed backend service URL: `https://<backend-slug>.onrender.com`.

#### Option B: Deploy via Docker / Railway
1. Point Railway or your container service to [`backend/Dockerfile`](../backend/Dockerfile).
2. Configure the environment variables listed in Section 2.
3. The container automatically runs `alembic upgrade head` before binding Uvicorn to the allocated `$PORT`.

### Step 3: Frontend Deployment (Vercel)
1. Connect your GitHub repository to Vercel.
2. Set the **Root Directory** to `frontend`.
3. Set the **Build Command** to `next build` and **Install Command** to `npm install`.
4. Add the environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://<backend-slug>.onrender.com`
5. Click **Deploy**.
6. Once deployed, note your frontend URL (e.g. `https://your-app.vercel.app`) and add it to the backend's `CORS_ORIGINS` environment variable.

---

## 4. PRE-FLIGHT SMOKE TEST & HEALTH VERIFICATION

After both services are running:

1. **Verify Backend Health:**
   ```bash
   curl -i https://<backend-url>/health
   ```
   Expected response:
   - Status: `200 OK`
   - Headers include: `X-Process-Time-Ms`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
   - Body: `{"status":"ok","service":"ai-airport-backend","environment":"production"}`

2. **Verify Database Connectivity:**
   ```bash
   curl -i https://<backend-url>/api/v1/health
   ```
   Expected response: `{"status":"ok","database":{"status":"connected","engine":"PostgreSQL"}}`

3. **Verify Frontend Application:**
   - Navigate to `https://<frontend-url>/login`.
   - Log in with default admin credentials (`admin@airport.local` / `Admin@123`).
   - Immediately change the administrator password under `/settings`.
   - Test AI Scheduler solve execution on `/scheduler`.
   - Inspect Gantt timeline on `/schedule`.
   - Run simulation clock on `/simulation`.
   - Review XAI reasoning events on `/reasoning`.

---

## 5. ROLLBACK & DISASTER RECOVERY
- **Database Migrations:** If a schema rollback is necessary, run `alembic downgrade -1`.
- **Application Rollback:** Vercel and Render maintain instant rollbacks to previous build commits with zero downtime via their control dashboards.
