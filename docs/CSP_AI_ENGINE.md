# Pure Python Constraint Satisfaction Problem (CSP) AI Engine
## Gate Allocation & Operations Scheduling Documentation

---

## 1. Mathematical CSP Formulation

The airport gate allocation problem is modeled as a formal **Constraint Satisfaction Problem (CSP)** defined as a triple $\langle X, D, C \rangle$:

1. **Variables ($X$):**
   A finite set of flight variables needing gate assignments:
   $$X = \{F_1, F_2, \dots, F_n\}$$
   Each flight variable $F_i$ is characterized by:
   - Scheduled arrival time $A_i$
   - Scheduled departure time $D_i$
   - Turnaround buffer duration $T_i$
   - Physical aircraft category $K_i \in \{\text{REGIONAL}, \text{NARROW\_BODY}, \text{WIDE\_BODY}, \text{HEAVY}\}$
   - Route classification $R_i \in \{\text{DOMESTIC}, \text{INTERNATIONAL}\}$
   - Operational priority $P_i \in \{\text{EMERGENCY}, \text{MEDICAL}, \text{VIP}, \text{NORMAL}\}$
   - Optional terminal preference $Term_i$

2. **Domains ($D$):**
   For each flight variable $F_i$, its initial domain $D(F_i)$ is a discrete subset of available airport gates:
   $$D(F_i) \subseteq \{G_1, G_2, \dots, G_m\}$$
   where each gate $G_k$ has physical properties (terminal, capability, supported aircraft categories, active/closed state).

3. **Constraints ($C$):**
   A set of unary and binary relations that must simultaneously be satisfied for any valid assignment:
   $$C = \{C_{\text{avail}}, C_{\text{aircraft}}, C_{\text{routing}}, C_{\text{terminal}}, C_{\text{turnaround}}, C_{\text{overlap}}\}$$

---

## 2. Occupancy Window & Temporal Intervals

Each flight $F_i$ occupies a gate during the discrete time window:
$$\text{Occupancy}(F_i) = [A_i, \max(D_i, A_i + T_i) + B]$$
where $B$ is an optional inter-flight buffer (minutes) for gate clearing and pushback operations.

Two flights $F_i$ and $F_j$ are temporally overlapping if and only if:
$$\text{Occupancy}(F_i) \cap \text{Occupancy}(F_j) \neq \emptyset \iff (A_i < \text{End}_j) \land (A_j < \text{End}_i)$$

---

## 3. Hard Constraints

All constraints are modular, explicitly evaluated, and never bypassed by priority:

| Constraint Name | Type | Description | Violation Consequence |
|---|---|---|---|
| `GATE_AVAILABILITY` | Unary | Gate must have `is_active=True` and `is_closed=False`. Must be open during flight occupancy. | Gate pruned from $D(F_i)$ |
| `AIRCRAFT_COMPATIBILITY` | Unary | Gate supported size $\ge$ Aircraft category ($K_i$). | Gate pruned from $D(F_i)$ |
| `DOMESTIC_INTERNATIONAL` | Unary | Domestic flight requires DOMESTIC/BOTH gate; International flight requires INTERNATIONAL/BOTH gate. | Gate pruned from $D(F_i)$ |
| `TERMINAL_COMPATIBILITY` | Unary | If flight specifies required terminal, gate must belong to that terminal. | Gate pruned from $D(F_i)$ |
| `TURNAROUND` | Unary | Flight departure must allow minimum turnaround duration ($D_i - A_i \ge T_i$). | Rejection / Conflict |
| `GATE_OVERLAP` | Binary | If $F_i$ and $F_j$ overlap temporally, they cannot share the same gate ($G(F_i) \neq G(F_j)$). | Gate rejected during search / pruned via FC |

---

## 4. Search Algorithm & Heuristics

### 4.1 Variable Selection Heuristics
When selecting the next unassigned flight variable, the engine applies a cascading decision rule:
1. **Minimum Remaining Values (MRV):** Choose $F_i$ with the minimum $|D(F_i)|$ (fewest candidate gates remaining).
2. **Degree Heuristic (Tie-Breaker):** Choose the flight with the highest number of temporal overlaps with other unassigned flights:
   $$\text{Degree}(F_i) = |\{F_j \in X_{\text{unassigned}} \setminus \{F_i\} \mid \text{Occupancy}(F_i) \cap \text{Occupancy}(F_j) \neq \emptyset\}|$$
3. **Priority Tie-Breaker:** Choose flight with higher priority (`EMERGENCY` > `MEDICAL` > `VIP` > `NORMAL`).
4. **Deterministic Tie-Breaker:** Lexical order on `flight_number`.

### 4.2 Value Ordering: Least Constraining Value (LCV)
When exploring candidate gates for flight $F_i$, gates are ordered by the number of choices they eliminate from other overlapping unassigned flights. Gates that eliminate fewer choices are tried first:
$$\text{Cost}(G_k) = \sum_{F_j \in \text{OverlappingUnassigned}(F_i)} \mathbf{1}_{\{G_k \in D(F_j)\}}$$

---

## 5. Inference & Constraint Propagation

The solver supports two distinct algorithmic modes:

1. **`BACKTRACKING` (Basic Backtracking):**
   - Standard chronological backtracking search with MRV and LCV.
   - Evaluates binary non-overlap constraints upon tentative assignment.

2. **`BACKTRACKING_WITH_CONSTRAINT_PROPAGATION` (Backtracking + Forward Checking):**
   - After assigning $F_i \to G_k$, immediately executes **Forward Checking**:
     $$\forall F_j \in \text{OverlappingUnassigned}(F_i), \quad D(F_j) \leftarrow D(F_j) \setminus \{G_k\}$$
   - If any $|D(F_j)| = 0$, a domain wipeout is detected immediately. The solver triggers an immediate backtrack, restoring previous domains from reversible pruning stacks.
   - Eliminates vast swaths of futile subtrees before deep exploration.

---

## 6. Explainable AI (XAI) Reasoning Events

During execution, the solver continuously logs structured reasoning events:

```json
{
  "step_index": 14,
  "event_type": "CONFLICT_DETECTED",
  "message": "Conflict assigning BA102 to C1: Gate C1 is already assigned to BA101 from 10:00 to 11:30 (overlaps with BA102)",
  "flight_id": "F2",
  "gate_id": "G1",
  "constraint": "GATE_OVERLAP",
  "details": {
    "reason": "Temporal interval collision"
  }
}
```

Available event types:
- `DOMAIN_CREATED`
- `VARIABLE_SELECTED`
- `VALUE_CONSIDERED`
- `CONSTRAINT_CHECK`
- `ASSIGNMENT_MADE`
- `DOMAIN_REDUCED`
- `PROPAGATION_STARTED`
- `PROPAGATION_COMPLETED`
- `CONFLICT_DETECTED`
- `BACKTRACK_STARTED`
- `BACKTRACK_COMPLETED`
- `SOLUTION_FOUND`
- `NO_SOLUTION`

---

## 7. Metrics & Performance Telemetry

Every solver run records exact, un-fabricated execution metrics:
- `execution_time_ms`: Wall-clock execution time in milliseconds.
- `nodes_explored`: Total recursive search nodes visited.
- `assignments_attempted`: Gate assignments tested.
- `backtracks`: Dead-end recovery steps executed.
- `constraint_checks`: Total constraint evaluations performed.
- `conflicts_detected`: Total constraint violations intercepted.
- `domain_reductions`: Total gate candidate values pruned from domains.
- `propagation_steps`: Forward checking / inference iterations.
- `maximum_search_depth`: Deepest search tree branch traversed.
- `success`: Boolean resolution status.
