# AI Airport Operations & Gate Allocation Simulator
## System Architecture & Technical Specifications Document

---

## 1. Project Purpose & Overview
The **AI Airport Operations & Gate Allocation Simulator** is an enterprise-grade full-stack simulation platform and operational decision-support system. It simulates airport ground and airspace operations, real-time flight movements, and automated gate allocation.

At the core of the system is a **Constraint Satisfaction Problem (CSP)** solving engine implemented in pure Python. The scheduler allocates arriving and departing flights to compatible airport gates while strictly respecting operational hard constraints, turnaround time windows, gate capability restrictions, and operational flight priorities.

---

## 2. System Architecture

The application adopts a decoupled, modular 3-tier architecture with unidirectional data flow and strict separation of concerns:

```
+-------------------------------------------------------------------------+
|                           CLIENT TIER (Next.js)                         |
|  - Interactive World Map (Leaflet / Mapbox / Canvas)                   |
|  - 2D Airport Surface Visualizer (Runway, Taxiway, Apron, Gates)        |
|  - Interactive Gantt Schedule Matrix                                    |
|  - Operational & AI Analytics Dashboards                               |
|  - XAI Reasoning Tree & Solver Inspection Panel                         |
+-------------------------------------------------------------------------+
                                    |
                                    | REST APIs / WebSocket Streams
                                    v
+-------------------------------------------------------------------------+
|                         APPLICATION TIER (FastAPI)                       |
|  +---------------------------+       +-------------------------------+  |
|  | Authentication & RBAC     |       | Airport & Gate Service        |  |
|  +---------------------------+       +-------------------------------+  |
|  | Flight Management Service |       | Simulation Engine (Clock/Ops) |  |
|  +---------------------------+       +-------------------------------+  |
|  | XAI & Analytics Service   |       | Dynamic Re-scheduler Service  |  |
|  +---------------------------+       +-------------------------------+  |
|                                |                                         |
|                                v                                         |
|  +-------------------------------------------------------------------+  |
|  |                 CORE AI ENGINE (Pure Python CSP)                  |  |
|  |  - Variables, Domains & Constraints Graph                         |  |
|  |  - Backtracking Search with MRV / Degree / LCV Heuristics        |  |
|  |  - Forward Checking & AC-3 Constraint Propagation                 |  |
|  |  - Step-by-Step Solver Execution Tracing & Event Emitter           |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
                                    |
                                    | SQLAlchemy / SQLModel ORM
                                    v
+-------------------------------------------------------------------------+
|                           PERSISTENCE TIER                              |
|                         PostgreSQL Database                             |
+-------------------------------------------------------------------------+
```

---

## 3. Technology Stack

### Frontend
- **Framework:** Next.js (App Router, React 19 / TypeScript)
- **Styling:** Tailwind CSS + Radix UI / Lucide React
- **Visualization:**
  - Gantt Schedule: Custom SVG/Canvas or Visx/Timeline library
  - World Map: React-Leaflet / Leaflet / MapLibre GL
  - Airport Visualizer: HTML5 Canvas / SVG 2D Engine
- **State Management:** TanStack Query (React Query) & Zustand

### Backend
- **Framework:** Python 3.12+ / FastAPI
- **Web Server:** Uvicorn (ASGI)
- **ORM / Database Tooling:** SQLAlchemy 2.0 / SQLModel + Alembic migrations
- **Validation & Serialization:** Pydantic v2
- **Testing:** Pytest, pytest-asyncio, HTTPX

### AI & Constraint Solver
- **Implementation:** 100% Pure Python
- **Algorithm Suite:**
  - Backtracking Search
  - Forward Checking (FC)
  - Constraint Propagation (AC-3 / MAC)
  - Heuristics: Minimum Remaining Values (MRV), Degree Heuristic, Least Constraining Value (LCV)
- **No external black-box solvers** (e.g., no OR-Tools, PuLP, or Z3) to ensure complete algorithmic transparency, custom step tracing, and real-time explanation generation.

### Database & Deployment
- **Database:** PostgreSQL (with SQLite support for local dev/unit testing fallback)
- **Frontend Deployment:** Vercel
- **Backend Deployment:** Python cloud container/runtime (Render, Railway, AWS ECS, or Fly.io)

---

## 4. Core AI / CSP Formulation

### 4.1 CSP Components
1. **Variables ($X$):**
   - Each flight $F_i$ requiring a gate assignment within a designated time window $[A_i, D_i + T_i]$, where $A_i$ is arrival time, $D_i$ is departure time, and $T_i$ is required turnaround buffer.
2. **Domains ($D(F_i)$):**
   - Set of available, active gates $\{G_1, G_2, \dots, G_m\}$ at target airport terminal that physically and operationally match flight criteria.
3. **Hard Constraints ($C$):**
   - **Unary Compatibility Constraints:**
     - *Flight Type Compatibility:* Domestic flights $\to$ Domestic or Swing gates; International flights $\to$ International or Swing gates (customs/border control enabled).
     - *Aircraft Size Compatibility:* Gate maximum wingspan/aircraft category $\ge$ Aircraft wingspan/category (e.g., Narrow-body vs. Wide-body).
     - *Terminal/Airline Alignment:* Specific airline or charter terminal restrictions.
     - *Gate Operational State:* Gate must be `ACTIVE` (not `CLOSED` or under `MAINTENANCE`).
   - **Binary Non-Overlap Constraints:**
     - For any two flights $F_i$ and $F_j$ assigned to the same gate $G_k$:
       $$\text{Interval}(F_i) \cap \text{Interval}(F_j) = \emptyset$$
       where $\text{Interval}(F) = [\text{Arrival}_F, \text{Departure}_F + \text{Turnaround}_F + \text{Buffer}]$.
4. **Flight Priority Weights:**
   - Hierarchy: `EMERGENCY` > `MEDICAL` > `VIP` > `NORMAL`.
   - Variable ordering prioritizes emergency/medical/VIP flights while enforcing hard constraints across all assignments.

### 4.2 Search Strategies & Heuristics
- **Variable Selection:**
  - *MRV (Minimum Remaining Values):* Choose the flight variable with the fewest remaining valid gates.
  - *Degree Heuristic (Tie-Breaker):* Choose the flight that has the most time-overlap conflicts with other unassigned flights.
  - *Priority Pre-sort:* Prioritized flights evaluated first in domain assignments.
- **Value Ordering:**
  - *Least Constraining Value (LCV):* Choose the gate that rules out the fewest choices for remaining unassigned flights.
- **Inference & Pruning:**
  - *Forward Checking (FC):* Prune incompatible/overlapping gates from unassigned variables after each assignment.
  - *AC-3 Arc Consistency:* Enforce arc consistency across binary flight-gate temporal overlap relations.

### 4.3 Explainable AI (XAI)
- The solver instruments its search tree using an observer pattern.
- Search events logged during execution:
  - `VARIABLE_SELECTED` (Flight, Domain Size, Heuristic Score)
  - `VALUE_ATTEMPTED` (Gate, Constraint Evaluation)
  - `DOMAIN_PRUNED` (Pruned Gates, Offending Flight/Constraint)
  - `BACKTRACK` (Dead-end encountered, Node Depth, Reason)
  - `ASSIGNMENT_SUCCESS` (Flight assigned to Gate)
- Rejection explanations and conflict trees are derived directly from these runtime events.

---

## 5. Domain Entities & Database Schema

- **User:** `id`, `username`, `email`, `password_hash`, `role` (`ADMIN`, `OPERATOR`, `VIEWER`), `created_at`
- **Airport:** `id`, `icao_code`, `iata_code`, `name`, `city`, `country`, `latitude`, `longitude`, `timezone`
- **Terminal:** `id`, `airport_id`, `name`, `terminal_code`
- **Gate:** `id`, `terminal_id`, `gate_number`, `gate_type` (`DOMESTIC`, `INTERNATIONAL`, `SWING`), `max_aircraft_size` (`SMALL`, `MEDIUM`, `LARGE`, `HEAVY`), `is_active`, `status` (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`)
- **Aircraft:** `id`, `tail_number`, `model`, `aircraft_type` (`NARROW_BODY`, `WIDE_BODY`, `REGIONAL`), `wingspan_meters`, `passenger_capacity`
- **Flight:** `id`, `flight_number`, `airline_code`, `origin_airport_id`, `destination_airport_id`, `aircraft_id`, `flight_type` (`DOMESTIC`, `INTERNATIONAL`), `priority` (`NORMAL`, `VIP`, `MEDICAL`, `EMERGENCY`), `scheduled_arrival`, `scheduled_departure`, `actual_arrival`, `actual_departure`, `turnaround_time_minutes`, `status` (`SCHEDULED`, `EN_ROUTE`, `APPROACHING`, `LANDED`, `AT_GATE`, `DEPARTED`, `DIVERTED`, `CANCELLED`)
- **GateAssignment:** `id`, `flight_id`, `gate_id`, `assigned_start`, `assigned_end`, `status` (`TENTATIVE`, `CONFIRMED`, `ACTIVE`, `COMPLETED`, `REVOKED`), `solver_run_id`
- **SolverRun:** `id`, `algorithm` (`BACKTRACKING`, `BACKTRACKING_AC3`), `total_flights`, `assigned_flights`, `unassigned_flights`, `nodes_explored`, `backtracks_count`, `execution_time_ms`, `created_at`
- **SolverEvent:** `id`, `solver_run_id`, `step_index`, `event_type`, `flight_id`, `gate_id`, `details` (JSON)
- **SimulationEvent:** `id`, `simulation_timestamp`, `event_type` (`DELAY`, `GATE_CLOSURE`, `EMERGENCY_ARRIVAL`, `TAXI_HOLD`), `details` (JSON)

---

## 6. Major Application Modules

1. **Dashboard & Summary:** Real-time KPI cards (flights in air, gate occupancy, scheduled vs. delayed, solver efficiency).
2. **Flight Management:** CRUD operations, CSV/JSON batch import, priority tagging, filterable list.
3. **Airport & Gate Management:** Terminal configuration, gate status toggle (active/maintenance), aircraft compatibility matrix.
4. **AI Gate Scheduler:**
   - Solver execution trigger (All Flights or Unassigned Flights).
   - Strategy selector: Basic Backtracking vs. Backtracking + Forward Checking/AC-3.
   - Side-by-side performance benchmarks (nodes, backtracks, runtime in ms).
5. **Interactive Gantt Chart:**
   - Timeline grid with Gates as rows and Time as horizontal axis.
   - Color-coded flight blocks by priority/status.
   - Direct conflict markers and drag-and-drop manual override / inspection.
6. **2D Airport Surface Visualizer:**
   - Runway, taxiway nodes, aprons, and gate slots.
   - Visual display of arriving aircraft taxiing to assigned gates.
7. **Interactive World Map:**
   - Great-circle flight routes, origin/destination nodes, live plane positions interpolated along routes.
8. **Explainable AI (XAI) Inspector:**
   - Search tree exploration visualization.
   - Detailed "Why Gate A?" vs. "Why not Gate B?" constraint breakdown.
9. **Simulation Control Hub:**
   - Master simulation clock (Play, Pause, Reset, 1x, 2x, 5x, 10x).
   - Dynamic scenario injector: insert emergency flight, simulate 45-min delay, close gate for maintenance.

---

## 7. Development Rules & Engineering Standards

1. **Phase Discipline:** Strictly one phase at a time. No jumping ahead to future phases without user confirmation.
2. **Modular Decoupling:** AI solver logic must be isolated in Python modules independent of web frameworks to allow standalone unit testing.
3. **Real Metrics:** No simulated delays, dummy node counts, or mocked AI benchmarks. Every metric is computed from actual execution.
4. **Security & Configuration:** Secrets managed via `.env` files; CORS configured securely; passwords hashed with bcrypt / argon2; role-based endpoint protection.
5. **Code Quality:** Type hints in Python (PEP 484); strict TypeScript types in Next.js (no `any`); comprehensive test suites.

---

## 8. Complete Project Roadmap

- **Phase 0:** Project Architecture & Rules *(Current Phase)*
- **Phase 1:** Repository / Project Setup (Monorepo structure, tooling, scripts)
- **Phase 2:** Database & Data Models (PostgreSQL schemas, Alembic migrations, seeds)
- **Phase 3:** Python CSP AI Engine (Pure Python CSP with FC, AC-3, heuristics & metrics)
- **Phase 4:** FastAPI Backend (REST endpoints, solver invocation, CRUD services)
- **Phase 5:** Frontend Foundation (Next.js, Tailwind, theme, navigation shell)
- **Phase 6:** Flight Management UI
- **Phase 7:** Gate Management UI
- **Phase 8:** AI Scheduler Interface (Run solver, select strategy, inspect runs)
- **Phase 9:** Gantt Schedule (Interactive gate-time occupancy matrix)
- **Phase 10:** World Map (Interactive global routes and live flight markers)
- **Phase 11:** Animated Flight Simulation (Clock controls, taxiway & gate movement)
- **Phase 12:** Connect Simulation with AI Gate Allocation (Real-time trigger on approach)
- **Phase 13:** Dynamic Rescheduling (Delays, gate closures, re-allocation)
- **Phase 14:** Explainable AI (Step-by-step reasoning inspector and rejection causes)
- **Phase 15:** Analytics & Comparative Benchmarks
- **Phase 16:** Authentication & Security (JWT, RBAC, route guards)
- **Phase 17:** Testing (Unit, integration, and end-to-end test suites)
- **Phase 18:** Performance & Production Optimization
- **Phase 19:** Deployment Configuration (Docker, Vercel, Cloud deployment)
- **Phase 20:** Final UI/UX Polish & Documentation
