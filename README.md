# AI Airport Operations & Gate Allocation Simulator

## Description
A full-stack airport operations simulation system that uses Constraint Satisfaction Problem (CSP) techniques to intelligently allocate aircraft to airport gates while respecting operational constraints.

## Technology Stack
- **Frontend:**
  - Next.js (App Router)
  - TypeScript
  - Tailwind CSS
- **Backend:**
  - Python (3.12+)
  - FastAPI
  - Uvicorn
  - Pydantic v2
- **Database:**
  - PostgreSQL (configured in Phase 2)
- **AI:**
  - Custom Pure Python CSP Engine (Backtracking, Forward Checking, AC-3)

## Project Structure
```text
ai-airport-gate-simulator/
│
├── frontend/                     # Next.js App Router Client Application
│   ├── app/                      # Routes, layout, and page components
│   ├── components/               # Reusable UI component library
│   ├── lib/                      # API client, utilities, and helper functions
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # Shared TypeScript interfaces & types
│   ├── public/                   # Static assets (images, icons)
│   ├── .env.example              # Frontend environment variables template
│   ├── package.json              # Frontend npm dependencies
│   ├── tsconfig.json             # TypeScript compiler configuration
│   └── next.config.ts            # Next.js configuration
│
├── backend/                      # Python FastAPI Application & Simulation Engine
│   ├── app/                      # Application source code
│   │   ├── api/                  # REST API routes and versioned endpoints
│   │   ├── core/                 # Core configuration, settings, and security
│   │   ├── models/               # Database ORM models (Phase 2)
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/             # Business logic and domain services
│   │   ├── ai/                   # Custom Python CSP gate allocation engine
│   │   ├── simulation/           # Simulation clock and event orchestrator
│   │   └── main.py               # FastAPI application entry point
│   ├── tests/                    # Unit, integration, and endpoint tests
│   ├── .env.example              # Backend environment variables template
│   └── requirements.txt          # Python runtime dependencies
│
├── docs/                         # Architecture, schemas, and API documentation
│   └── ARCHITECTURE.md           # System architecture & technical specification
│
├── .gitignore                    # Monorepo git ignore definitions
└── README.md                     # Project documentation
```

## Development Status
```text
Phase 1 — Repository & Project Setup
```

## Running Locally

### Prerequisites
- Node.js (v18.0.0 or higher) and npm
- Python (v3.12 or higher)

### 1. Backend Setup & Startup
Navigate to the `backend/` directory:
```bash
cd backend
```

Create and activate a Python virtual environment:
- Windows (PowerShell):
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  ```
- macOS / Linux:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

Install dependencies:
```bash
pip install -r requirements.txt
```

Run the FastAPI development server:
```bash
uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- API Health Check: `http://localhost:8000/health`
- Interactive API Docs (Swagger UI): `http://localhost:8000/docs`

To run the backend test suite:
```bash
pytest
```

### 2. Frontend Setup & Startup
Navigate to the `frontend/` directory:
```bash
cd frontend
```

Install npm dependencies (if not already installed):
```bash
npm install
```

Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
