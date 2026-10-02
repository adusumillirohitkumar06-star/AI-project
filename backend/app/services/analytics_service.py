"""Service layer for Analytics & Performance Dashboard calculations."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session

from app.models.airport import Airport
from app.models.assignment import GateAssignment
from app.models.conflict import Conflict, ConflictType, ConflictSeverity
from app.models.flight import Flight, FlightStatus, FlightPriority, FlightType
from app.models.gate import Gate
from app.models.simulation import SimulationEvent
from app.models.solver import SolverRun
from app.models.terminal import Terminal
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    AirportFlightCount,
    ConflictAnalyticsResponse,
    ConflictTimelineItem,
    FlightAnalyticsResponse,
    FlightDelaySummary,
    GateUtilizationItem,
    GateUtilizationResponse,
    ReschedulingAnalyticsResponse,
    SolverPerformanceResponse,
    SolverRunHistoryPoint,
    StrategyMetricSummary,
)


def get_analytics_overview(
    db: Session,
    airport_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> AnalyticsOverviewResponse:
    """Compute top-level factual operations summary."""
    flight_query = db.query(Flight)
    gate_query = db.query(Gate).join(Terminal, Gate.terminal_id == Terminal.id)
    conflict_query = db.query(Conflict)
    solver_query = db.query(SolverRun)

    if airport_id:
        flight_query = flight_query.filter(
            or_(
                Flight.origin_airport_id == airport_id,
                Flight.destination_airport_id == airport_id,
            )
        )
        gate_query = gate_query.filter(Terminal.airport_id == airport_id)

    if start_time:
        flight_query = flight_query.filter(
            or_(
                Flight.scheduled_arrival >= start_time,
                Flight.scheduled_departure >= start_time,
            )
        )
    if end_time:
        flight_query = flight_query.filter(
            or_(
                Flight.scheduled_arrival <= end_time,
                Flight.scheduled_departure <= end_time,
            )
        )

    flights = flight_query.all()
    total_flights = len(flights)
    flight_ids = [f.id for f in flights]

    # Assigned flights: flights with valid persisted assignments
    assigned_flight_ids = set()
    gates_used_set = set()
    if flight_ids:
        assignments = (
            db.query(GateAssignment)
            .filter(GateAssignment.flight_id.in_(flight_ids))
            .all()
        )
        for a in assignments:
            status_str = a.status.value if hasattr(a.status, "value") else str(a.status)
            if status_str != "REVOKED":
                assigned_flight_ids.add(a.flight_id)
                gates_used_set.add(a.gate_id)

    assigned_flights = len(assigned_flight_ids)
    unassigned_flights = max(0, total_flights - assigned_flights)

    total_gates = gate_query.count()
    gates_used = len(gates_used_set)

    # Active conflicts
    if airport_id:
        # Conflicts on gates of this airport or flights of this airport
        gate_ids_for_airport = [g.id for g in gate_query.all()]
        conflict_query = conflict_query.filter(
            or_(
                Conflict.flight_id.in_(flight_ids) if flight_ids else False,
                Conflict.gate_id.in_(gate_ids_for_airport) if gate_ids_for_airport else False,
            )
        )
    active_conflicts = conflict_query.filter(Conflict.is_resolved == False).count()

    # Delay statistics
    delayed_flights_list = [f for f in flights if (f.delay_duration_minutes or 0) > 0]
    delayed_flights = len(delayed_flights_list)
    total_delay_minutes = sum(f.delay_duration_minutes or 0 for f in delayed_flights_list)
    avg_delay_minutes = (
        round(total_delay_minutes / delayed_flights, 1) if delayed_flights > 0 else 0.0
    )
    max_delay_minutes = (
        max((f.delay_duration_minutes or 0) for f in delayed_flights_list)
        if delayed_flights > 0
        else 0
    )

    total_solver_runs = solver_query.count()
    successful_solver_runs = solver_query.filter(SolverRun.is_success == True).count()

    return AnalyticsOverviewResponse(
        total_flights=total_flights,
        assigned_flights=assigned_flights,
        unassigned_flights=unassigned_flights,
        total_gates=total_gates,
        gates_used=gates_used,
        active_conflicts=active_conflicts,
        delayed_flights=delayed_flights,
        total_delay_minutes=total_delay_minutes,
        avg_delay_minutes=avg_delay_minutes,
        max_delay_minutes=max_delay_minutes,
        total_solver_runs=total_solver_runs,
        successful_solver_runs=successful_solver_runs,
    )


def get_flight_analytics(
    db: Session,
    airport_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> FlightAnalyticsResponse:
    """Compute detailed flight status, priority, and delay distributions."""
    query = db.query(Flight)
    if airport_id:
        query = query.filter(
            or_(
                Flight.origin_airport_id == airport_id,
                Flight.destination_airport_id == airport_id,
            )
        )
    if start_time:
        query = query.filter(
            or_(
                Flight.scheduled_arrival >= start_time,
                Flight.scheduled_departure >= start_time,
            )
        )
    if end_time:
        query = query.filter(
            or_(
                Flight.scheduled_arrival <= end_time,
                Flight.scheduled_departure <= end_time,
            )
        )

    flights = query.all()
    total_flights = len(flights)

    # By status
    by_status: Dict[str, int] = {}
    for status_enum in FlightStatus:
        by_status[status_enum.value] = 0
    for f in flights:
        key = f.status.value if hasattr(f.status, "value") else str(f.status)
        by_status[key] = by_status.get(key, 0) + 1

    # By priority
    by_priority: Dict[str, int] = {}
    for priority_enum in FlightPriority:
        by_priority[priority_enum.value] = 0
    for f in flights:
        key = f.priority.value if hasattr(f.priority, "value") else str(f.priority)
        by_priority[key] = by_priority.get(key, 0) + 1

    # By flight type
    by_flight_type: Dict[str, int] = {}
    for ft_enum in FlightType:
        by_flight_type[ft_enum.value] = 0
    for f in flights:
        key = f.flight_type.value if hasattr(f.flight_type, "value") else str(f.flight_type)
        by_flight_type[key] = by_flight_type.get(key, 0) + 1

    # By airport
    airports = db.query(Airport).all()
    by_airport: List[AirportFlightCount] = []
    for apt in airports:
        dep_count = sum(1 for f in flights if f.origin_airport_id == apt.id)
        arr_count = sum(1 for f in flights if f.destination_airport_id == apt.id)
        if dep_count > 0 or arr_count > 0:
            by_airport.append(
                AirportFlightCount(
                    airport_id=apt.id,
                    airport_code=apt.iata_code,
                    airport_name=apt.name,
                    city=apt.city,
                    departures=dep_count,
                    arrivals=arr_count,
                )
            )

    # Delay breakdown
    delayed_flights = [f for f in flights if (f.delay_duration_minutes or 0) > 0]
    total_delay_minutes = sum(f.delay_duration_minutes or 0 for f in delayed_flights)
    avg_delay = (
        round(total_delay_minutes / len(delayed_flights), 1) if delayed_flights else 0.0
    )
    max_delay = (
        max((f.delay_duration_minutes or 0) for f in delayed_flights)
        if delayed_flights
        else 0
    )

    by_reason: Dict[str, int] = {}
    for f in delayed_flights:
        r = f.delay_reason.value if hasattr(f.delay_reason, "value") else str(f.delay_reason)
        if r:
            by_reason[r] = by_reason.get(r, 0) + 1

    delay_summary = FlightDelaySummary(
        delayed_count=len(delayed_flights),
        total_delay_minutes=total_delay_minutes,
        avg_delay_minutes=avg_delay,
        max_delay_minutes=max_delay,
        by_reason=by_reason,
    )

    return FlightAnalyticsResponse(
        total_flights=total_flights,
        by_status=by_status,
        by_priority=by_priority,
        by_flight_type=by_flight_type,
        by_airport=by_airport,
        delay_summary=delay_summary,
    )


def get_gate_utilization(
    db: Session,
    airport_id: Optional[int] = None,
    terminal_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> GateUtilizationResponse:
    """Calculate gate occupancy using arrival->departure durations (no turnaround added to physical occupancy)."""
    gate_query = db.query(Gate).join(Terminal, Gate.terminal_id == Terminal.id)
    if airport_id:
        gate_query = gate_query.filter(Terminal.airport_id == airport_id)
    if terminal_id:
        gate_query = gate_query.filter(Gate.terminal_id == terminal_id)

    gates = gate_query.all()
    total_gates = len(gates)
    active_gates = sum(1 for g in gates if g.is_active)

    if total_gates == 0:
        return GateUtilizationResponse(
            total_gates=0,
            active_gates=0,
            gates_used=0,
            total_occupied_minutes=0,
            overall_utilization_percentage=0.0,
            analysis_window_minutes=1440,
            gates=[],
        )

    # Determine analysis time window in minutes
    if start_time and end_time:
        window_minutes = max(1, int((end_time - start_time).total_seconds() / 60))
    else:
        # Default analysis window to 24 hours (1440 min)
        window_minutes = 1440

    gate_items: List[GateUtilizationItem] = []
    total_occupied_all = 0
    gates_used_count = 0

    for gate in gates:
        terminal_code = gate.terminal.terminal_code if gate.terminal else "T1"
        airport_code = (
            gate.terminal.airport.iata_code
            if gate.terminal and gate.terminal.airport
            else "APT"
        )
        max_size = (
            gate.max_aircraft_size.value
            if hasattr(gate.max_aircraft_size, "value")
            else str(gate.max_aircraft_size)
        )

        asg_query = db.query(GateAssignment).filter(
            GateAssignment.gate_id == gate.id,
            GateAssignment.status != "REVOKED",
        )
        if start_time:
            asg_query = asg_query.filter(GateAssignment.assignment_end_time >= start_time)
        if end_time:
            asg_query = asg_query.filter(GateAssignment.assignment_start_time <= end_time)

        assignments = asg_query.all()
        flight_count = len(assignments)

        occupied_minutes = 0
        for asg in assignments:
            # Physical occupancy duration is departure_time - arrival_time
            # Clamp to window boundaries if applicable
            s = asg.assignment_start_time
            e = asg.assignment_end_time
            if start_time and s < start_time:
                s = start_time
            if end_time and e > end_time:
                e = end_time
            diff_min = max(0, int((e - s).total_seconds() / 60))
            occupied_minutes += diff_min

        total_occupied_all += occupied_minutes
        if flight_count > 0:
            gates_used_count += 1

        # Utilization % = occupied_minutes / window_minutes * 100
        util_pct = round(min(100.0, (occupied_minutes / window_minutes) * 100), 1) if gate.is_active else 0.0

        gate_items.append(
            GateUtilizationItem(
                gate_id=gate.id,
                gate_code=gate.gate_code,
                terminal_code=terminal_code,
                airport_code=airport_code,
                max_aircraft_size=max_size,
                is_active=gate.is_active,
                flight_count=flight_count,
                occupied_minutes=occupied_minutes,
                utilization_percentage=util_pct,
            )
        )

    # Sort gates by utilization descending
    gate_items.sort(key=lambda x: x.utilization_percentage, reverse=True)

    available_capacity_minutes = active_gates * window_minutes
    overall_util = (
        round(min(100.0, (total_occupied_all / available_capacity_minutes) * 100), 1)
        if available_capacity_minutes > 0
        else 0.0
    )

    return GateUtilizationResponse(
        total_gates=total_gates,
        active_gates=active_gates,
        gates_used=gates_used_count,
        total_occupied_minutes=total_occupied_all,
        overall_utilization_percentage=overall_util,
        analysis_window_minutes=window_minutes,
        gates=gate_items,
    )


def get_conflict_analytics(
    db: Session,
    airport_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> ConflictAnalyticsResponse:
    """Compute conflict categories, severities, and temporal occurrence."""
    query = db.query(Conflict)
    if start_time:
        query = query.filter(Conflict.detected_at >= start_time)
    if end_time:
        query = query.filter(Conflict.detected_at <= end_time)

    conflicts = query.all()
    total_conflicts = len(conflicts)
    open_conflicts = sum(1 for c in conflicts if not c.is_resolved)
    resolved_conflicts = sum(1 for c in conflicts if c.is_resolved)

    by_type: Dict[str, int] = {}
    by_severity: Dict[str, int] = {}
    timeline_map: Dict[str, int] = {}

    for c in conflicts:
        t_key = c.conflict_type.value if hasattr(c.conflict_type, "value") else str(c.conflict_type)
        by_type[t_key] = by_type.get(t_key, 0) + 1

        s_key = c.severity.value if hasattr(c.severity, "value") else str(c.severity)
        by_severity[s_key] = by_severity.get(s_key, 0) + 1

        if c.detected_at:
            d_str = c.detected_at.strftime("%Y-%m-%d")
            timeline_map[d_str] = timeline_map.get(d_str, 0) + 1

    timeline = [
        ConflictTimelineItem(date_str=d, count=cnt)
        for d, cnt in sorted(timeline_map.items())
    ]

    return ConflictAnalyticsResponse(
        total_conflicts=total_conflicts,
        open_conflicts=open_conflicts,
        resolved_conflicts=resolved_conflicts,
        by_type=by_type,
        by_severity=by_severity,
        timeline=timeline,
    )


def get_solver_performance(
    db: Session,
) -> SolverPerformanceResponse:
    """Aggregate actual SolverRun telemetry and compare strategies without ranking."""
    runs = db.query(SolverRun).order_by(SolverRun.created_at.desc()).all()
    total_runs = len(runs)
    successful_runs = sum(1 for r in runs if r.is_success)
    failed_runs = total_runs - successful_runs

    exec_times = [r.execution_time_ms for r in runs if r.execution_time_ms is not None]
    avg_exec_time = round(sum(exec_times) / len(exec_times), 1) if exec_times else 0.0

    total_nodes = sum(r.nodes_explored for r in runs)
    total_backtracks = sum(r.backtracks_count for r in runs)

    # Strategy comparison aggregation
    strategy_groups: Dict[str, List[SolverRun]] = {}
    for r in runs:
        strat_key = r.strategy.value if hasattr(r.strategy, "value") else str(r.strategy)
        if strat_key not in strategy_groups:
            strategy_groups[strat_key] = []
        strategy_groups[strat_key].append(r)

    strategy_summaries: List[StrategyMetricSummary] = []
    for strat, strat_runs in strategy_groups.items():
        count = len(strat_runs)
        succ = sum(1 for r in strat_runs if r.is_success)
        times = [r.execution_time_ms for r in strat_runs if r.execution_time_ms is not None]
        avg_t = round(sum(times) / len(times), 1) if times else 0.0
        avg_nodes = round(sum(r.nodes_explored for r in strat_runs) / count, 1) if count else 0.0
        avg_bt = round(sum(r.backtracks_count for r in strat_runs) / count, 1) if count else 0.0
        avg_asg = round(sum(r.assignments_produced for r in strat_runs) / count, 1) if count else 0.0

        # Estimate constraint checks from reasoning events in metadata_json
        checks_list = []
        for r in strat_runs:
            meta = r.metadata_json or {}
            evts = meta.get("reasoning_events", [])
            checks = sum(1 for e in evts if "CONSTRAINT" in e.get("event_type", ""))
            checks_list.append(checks)
        avg_checks = round(sum(checks_list) / count, 1) if count else 0.0

        strategy_summaries.append(
            StrategyMetricSummary(
                strategy=strat,
                run_count=count,
                success_count=succ,
                avg_execution_time_ms=avg_t,
                avg_nodes_explored=avg_nodes,
                avg_backtracks=avg_bt,
                avg_assignments=avg_asg,
                avg_constraint_checks=avg_checks,
            )
        )

    # Recent runs history points for time series chart (up to 20 most recent)
    runs_history: List[SolverRunHistoryPoint] = []
    for r in reversed(runs[:20]):
        strat_str = r.strategy.value if hasattr(r.strategy, "value") else str(r.strategy)
        runs_history.append(
            SolverRunHistoryPoint(
                run_id=r.id,
                strategy=strat_str,
                is_success=r.is_success,
                execution_time_ms=r.execution_time_ms or 0.0,
                nodes_explored=r.nodes_explored,
                backtracks_count=r.backtracks_count,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
        )

    return SolverPerformanceResponse(
        total_runs=total_runs,
        successful_runs=successful_runs,
        failed_runs=failed_runs,
        avg_execution_time_ms=avg_exec_time,
        total_nodes_explored=total_nodes,
        total_backtracks=total_backtracks,
        strategy_comparison=strategy_summaries,
        runs_history=runs_history,
    )


def get_rescheduling_analytics(
    db: Session,
) -> ReschedulingAnalyticsResponse:
    """Calculate dynamic rescheduling and operational delay statistics from events and runs."""
    events = db.query(SimulationEvent).all()
    delays_applied = sum(1 for e in events if e.event_type == "DELAY_APPLIED")
    reassignments_succeeded = sum(1 for e in events if e.event_type == "GATE_REASSIGNED")
    reassignments_failed = sum(1 for e in events if e.event_type == "RESCHEDULING_FAILED")
    conflicts_resolved = sum(1 for e in events if e.event_type == "CONFLICT_RESOLVED")

    affected_flight_ids = set(
        e.flight_id for e in events
        if e.flight_id and e.event_type in ("DELAY_APPLIED", "GATE_REASSIGNED", "RESCHEDULING_REQUESTED")
    )

    total_reschedule_events = sum(
        1 for e in events
        if e.event_type in (
            "DELAY_APPLIED",
            "GATE_CONFLICT_DETECTED",
            "RESCHEDULING_REQUESTED",
            "GATE_REASSIGNED",
            "RESCHEDULING_FAILED",
            "CONFLICT_RESOLVED",
        )
    )

    return ReschedulingAnalyticsResponse(
        total_reschedule_events=total_reschedule_events,
        delays_applied=delays_applied,
        reassignments_succeeded=reassignments_succeeded,
        reassignments_failed=reassignments_failed,
        conflicts_resolved=conflicts_resolved,
        affected_flights_count=len(affected_flight_ids),
    )
