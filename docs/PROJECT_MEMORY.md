# PROJECT MEMORY & ARCHITECTURAL SPECIFICATION

## 1. PROJECT IDENTITY
- **Project Name:** AI Airport Operations & Gate Allocation Simulator
- **Purpose:** Production-grade airport operations platform powered by an explainable, Constraint Satisfaction Problem (CSP) gate allocation scheduler, interactive Gantt timeline, spherical route map, simulation engine, dynamic rescheduling, analytics dashboard, and role-based access control.
- **Main Objective:** Automated, collision-free, constraint-satisfying assignment of arrival and departure flights to physical airport gates while dynamically resolving delays and temporal conflicts in real time.

---

## 2. ARCHITECTURE
- **Frontend Stack:** Next.js 16.3.8 (Turbopack, App Router), React 19.2.8, TypeScript 5, Tailwind CSS v4.
- **Backend Stack:** FastAPI (0.110+), Python 3.14, Pydantic v2, SQLAlchemy 2.0.
- **Database:** SQLite (file-based `airport.db` in local environments / PostgreSQL-ready via SQLAlchemy).
- **AI / CSP Architecture:** Pure Python backtracking search with Forward Checking, Minimum Remaining Values (MRV) variable heuristic, Least Constraining Value (LCV) domain ordering, degree heuristic tie-breaker, and granular event telemetry.
- **Security:** Bcrypt salted password hashing, OAuth2 Bearer Tokens (HS256 JWT, 24h expiration), role-based endpoint guards, sanitized serialized schemas.

---

## 3. DATABASE MODELS & SCHEMA
1. **User (`users`):** `id`, `name`, `email` (unique, indexed), `password_hash`, `role` (`ADMIN`, `OPERATOR`, `VIEWER`), `is_active`, `created_at`, `updated_at`.
2. **Airport (`airports`):** `id`, `iata_code` (unique), `icao_code`, `name`, `city`, `country`, `latitude`, `longitude`, `timezone`, `is_active`.
3. **Terminal (`terminals`):** `id`, `airport_id` (FK), `terminal_code`, `name`, `is_active`. Unique constraint: `(airport_id, terminal_code)`.
4. **Gate (`gates`):** `id`, `terminal_id` (FK), `gate_number`, `max_aircraft_size`, `supports_international`, `is_active`, `is_closed`. (Note: To filter gates by airport, JOIN via `Terminal.airport_id`).
5. **Aircraft (`aircraft`):** `id`, `registration` (unique), `model`, `aircraft_type`, `category` (`NARROW_BODY`, `WIDE_BODY`, `REGIONAL`, `JUMBO`), `airline`, `capacity`.
6. **Flight (`flights`):** `id`, `flight_number`, `airline`, `origin_airport_id` (FK), `destination_airport_id` (FK), `aircraft_id` (FK), `scheduled_arrival`, `scheduled_departure`, `actual_arrival`, `actual_departure`, `status` (`SCHEDULED`, `BOARDING`, `DEPARTED`, `IN_AIR`, `APPROACHING`, `LANDED`, `AT_GATE`, `DELAYED`, `CANCELLED`, `COMPLETED`), `priority` (`CRITICAL_EMERGENCY`, `VIP_STATE`, `PASSENGER_COMMERCIAL`), `delay_reason`, `delay_duration_minutes`.
7. **GateAssignment (`gate_assignments`):** `id`, `flight_id` (FK), `gate_id` (FK), `solver_run_id` (FK), `assigned_at`, `assignment_start_time`, `assignment_end_time`, `status` (`TENTATIVE`, `CONFIRMED`, `ACTIVE`, `COMPLETED`, `REVOKED`), `source` (default `"CSP_SOLVER"`).
8. **Conflict (`conflicts`):** `id`, `flight_id` (FK), `gate_id` (FK), `conflict_type` (`GATE_OVERLAP`, `INCOMPATIBLE_GATE`, `TERMINAL_RESTRICTION`, `GATE_CLOSED`, `TURNAROUND_VIOLATION`), `severity` (`CRITICAL`, `WARNING`), `description`, `detected_at`, `is_resolved`, `resolution_info`.
9. **SolverRun (`solver_runs`):** `id`, `strategy` (`BACKTRACKING`, `BACKTRACKING_CONSTRAINT_PROPAGATION`), `is_success`, `execution_time_ms`, `nodes_explored`, `backtracks_count`, `conflicts_count`, `flights_considered`, `assignments_produced`, `metadata_json`, `started_at`, `completed_at`.
10. **SimulationEvent (`simulation_events`):** `id`, `event_type` (`DELAY_APPLIED`, `GATE_REASSIGNED`, `RESCHEDULING_FAILED`, `CONFLICT_RESOLVED`, `GATE_CONFLICT_DETECTED`), `flight_id` (FK), `details_json`, `created_at`.

---

## 4. AI / CSP SOLVER ENGINE SPECIFICATION
- **Variables:** Flights requiring airport gate assignment.
- **Domains:** Eligible gates at destination/origin matching aircraft size category, terminal rules, and international/domestic status.
- **Hard Constraints:**
  1. No two flights may physically overlap on the same gate: `!(arrival_A < departure_B && arrival_B < departure_A)`.
  2. Aircraft size cannot exceed gate maximum capability.
  3. International flights cannot dock at domestic-only gates.
  4. Closed or inactive gates cannot receive assignments.
  5. Mandatory minimum turnaround buffer between successive aircraft: `departure >= arrival + turnaround`.
- **Search & Ordering:**
  - **MRV (Minimum Remaining Values):** Prioritizes variable with the smallest valid gate domain.
  - **LCV (Least Constraining Value):** Ranks candidate gates that eliminate the fewest options for future flights.
  - **Forward Checking:** Immediately prunes conflicting time windows from neighboring variables.
  - **Priority Invariant:** Flights sorted by priority (`CRITICAL_EMERGENCY` > `VIP_STATE` > `PASSENGER_COMMERCIAL`), but priority never overrides hard safety constraints.

---

## 5. CRITICAL DOMAIN RULES
1. **Physical Gate Occupancy:**
   ```text
   occupancy_start = arrival_time
   occupancy_end = departure_time
   ```
2. **Turnaround Rule:**
   ```text
   departure_time >= arrival_time + required_turnaround
   ```
   *Strict Rule:* Physical gate occupancy is exclusively `departure_time - arrival_time`. Turnaround buffer is an inter-flight safety separation constraint, never artificially added onto gate occupancy metrics.
3. **Temporal Overlap Condition:**
   ```text
   arrival_A < departure_B AND arrival_B < departure_A
   ```
   Exact back-to-back flights (`departure_A == arrival_B`) are valid unless an explicit safety separation margin is configured.

---

## 6. FRONTEND APPLICATION ROUTES
- `/` or `/dashboard` — Master Operations Control Console & High-level KPIs.
- `/flights` — Flight schedule management, filtering, and delay application.
- `/gates` — Apron gate status, terminal grouping, and closures.
- `/airports` — Airport and terminal infrastructure catalog.
- `/scheduler` — Interactive CSP Gate Allocation Solver interface & telemetry.
- `/schedule` — Gantt timeline visualization with per-gate visual occupancy blocks.
- `/map` — Interactive Leaflet canvas with Great Circle flight trajectories.
- `/simulation` — Flight operations clock, playback (1x–10x), and real-time aircraft tracking.
- `/reasoning` — Explainable AI (XAI) search tree inspector & step-by-step solver decisions.
- `/conflicts` — Operational conflict monitoring and manual/automated resolution.
- `/analytics` — Comprehensive operations metrics, gate utilization, and delay trends.
- `/settings` — User profile, system parameters, and secure password updates.
- `/login` — User authentication portal with credential verification.
- `/register` — Self-registration interface (defaults to `VIEWER`).

---

## 7. AUTHENTICATION, AUTHORIZATION & RBAC
- **Roles:**
  - `ADMIN`: Full access (Airport infrastructure, terminal management, user management, and all operational tools).
  - `OPERATOR`: Flight CRUD, gate status toggling, CSP solver execution, simulation controls, delay injection, conflict resolution.
  - `VIEWER`: Read-only access across all operational, scheduling, map, simulation, and analytics dashboards.
- **Backend Protection:**
  - Protected endpoints require `Authorization: Bearer <JWT>`.
  - Roles enforced server-side using FastAPI dependencies: `require_authenticated`, `require_operator_or_above`, `require_admin`.
  - Sensitive passwords and password hashes are strictly filtered from all API responses.
  - Safeguard prevents deactivating or demoting the last remaining active administrator.

---

## 8. PHASE COMPLETION HISTORY
- **Phase 1 — Repository / Project Setup:** Completed.
- **Phase 2 — Database / Data Models:** Completed.
- **Phase 3 — CSP AI Engine:** Completed.
- **Phase 4 — FastAPI Backend:** Completed.
- **Phase 5 — Frontend Foundation:** Completed.
- **Phase 6 — Flight Management:** Completed.
- **Phase 7 — Gate Management:** Completed.
- **Phase 8 — AI Scheduler Interface:** Completed.
- **Phase 9 — Gantt Schedule:** Completed.
- **Phase 10 — World Map:** Completed.
- **Phase 11 — Flight Simulation:** Completed.
- **Phase 12 — Simulation + AI Gate Allocation:** Completed.
- **Phase 13 — Dynamic Rescheduling:** Completed.
- **Phase 14 — Explainable AI:** Completed.
- **Phase 15 — Analytics:** Completed.
- **Phase 16 — Authentication / Authorization / Security:** Completed.
- **Phase 17 — Comprehensive Testing & Quality Assurance:** Completed.
- **Phase 18 — Performance, Optimization & Production Hardening:** Completed.

```text
CURRENT PHASE: 18
STATUS: COMPLETED
```

---

## 9. TEST SUITE & VERIFICATION BASELINE
- **Backend Test Framework:** pytest 9.1.1, SQLAlchemy in-memory SQLite fixtures (`conftest.py`).
  - Total tests: **66 passed (100%)** across 11 test modules (`test_performance_hardening.py`, `test_api_auth.py`, `test_csp_solver.py`, `test_api_analytics.py`, `test_api_scheduling.py`, `test_api_simulation_allocation.py`, `test_api_delay_rescheduling.py`, `test_api_conflicts_assignments.py`, `test_api_crud.py`, `test_models.py`, `test_health.py`).
  - Command: `.\backend\.venv\Scripts\pytest backend/tests -v`
- **Frontend Test Framework:** tsx test runner (`tests/*.test.ts`).
  - Total tests: **52 passed (100%)** across 8 test suites (Gantt, World Map, Simulation, Dynamic Allocation, Rescheduling, XAI Reasoning, Analytics, Auth & RBAC).
  - Command: `npm test`
- **Production Build:** Next.js Turbopack production build compiles with **0 errors** across all 18 routes.
  - Command: `npm run build`

---

## 10. PRODUCTION HARDENING & PERFORMANCE MEASURES
- **CSP Engine Scale:** Validated 50 flights scheduled across 10 gates in waves within strict performance budget (< 1500ms).
- **Fast-fail Search:** Guaranteed fast termination (< 200ms) for provably unsolvable scenarios without state-space blowup.
- **Security Headers Middleware:** Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- **Response Performance Timing:** Middleware attaches `X-Process-Time-Ms` response header to all outgoing API responses.
- **Database Connection Pooling:** Configured `DB_POOL_SIZE=20`, `DB_MAX_OVERFLOW=10`, `DB_POOL_TIMEOUT=30`, and `pool_pre_ping=True` in engine arguments.

---

## 11. NEXT RECOMMENDED PHASE
**PROJECT READY FOR PRODUCTION DEPLOYMENT / CONTAINERIZATION**
