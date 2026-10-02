"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/FeedbackStates";
import { ConfirmModal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { FlightTable } from "@/components/flights/FlightTable";
import { FlightDetailModal } from "@/components/flights/FlightDetailModal";
import { FlightFormModal } from "@/components/flights/FlightFormModal";
import { FlightFilters } from "@/components/flights/FlightFilters";
import {
  createFlight,
  deleteFlight,
  getAircraftList,
  getAirports,
  getFlights,
  updateFlight,
} from "@/lib/api/flights";
import {
  Aircraft,
  Airport,
  Flight,
  FlightCreatePayload,
  FlightFilterParams,
  FlightPriority,
  FlightStatus,
  FlightType,
} from "@/types/flight";

export default function FlightsManager() {
  // Flight state
  const [flights, setFlights] = useState<Flight[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [airportFilter, setAirportFilter] = useState("");

  // Relational data
  const [airports, setAirports] = useState<Airport[]>([]);
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);

  // Loading & error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);

  // Delete confirmation
  const [deletingFlight, setDeletingFlight] = useState<Flight | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Success alert feedback
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Fast relational lookups
  const airportsMap = useMemo(() => {
    const map = new Map<number, Airport>();
    airports.forEach((a) => map.set(a.id, a));
    return map;
  }, [airports]);

  const aircraftMap = useMemo(() => {
    const map = new Map<number, Aircraft>();
    aircraftList.forEach((a) => map.set(a.id, a));
    return map;
  }, [aircraftList]);

  // Load airports and aircraft once on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([getAirports(100), getAircraftList(100)])
      .then(([airportsRes, aircraftRes]) => {
        if (isMounted) {
          setAirports(airportsRes.items || []);
          setAircraftList(aircraftRes.items || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load relational airport/aircraft data:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch flights from backend with active filters
  const loadFlights = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: FlightFilterParams = {
        page: currentPage,
        page_size: pageSize,
      };

      if (searchQuery.trim()) {
        params.flight_number = searchQuery.trim();
      }
      if (statusFilter) {
        params.status = statusFilter as FlightStatus;
      }
      if (priorityFilter) {
        params.priority = priorityFilter as FlightPriority;
      }
      if (typeFilter) {
        params.flight_type = typeFilter as FlightType;
      }
      if (airportFilter) {
        params.airport_id = Number(airportFilter);
      }

      const res = await getFlights(params);
      setFlights(res.items || []);
      setTotalRecords(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load flights from backend.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, priorityFilter, typeFilter, airportFilter]);

  // Trigger flight loading whenever dependencies change
  useEffect(() => {
    loadFlights();
  }, [loadFlights]);

  // Handle Form Submission (Create or Edit)
  const handleFormSubmit = async (payload: FlightCreatePayload) => {
    if (editingFlight) {
      await updateFlight(editingFlight.id, payload);
      setFeedbackMessage(`Flight ${payload.flight_number} updated successfully.`);
    } else {
      await createFlight(payload);
      setFeedbackMessage(`Flight ${payload.flight_number} created successfully.`);
    }
    // Refresh flights
    await loadFlights();
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Handle Flight Deletion
  const handleDeleteConfirm = async () => {
    if (!deletingFlight) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteFlight(deletingFlight.id);
      setFeedbackMessage(`Flight ${deletingFlight.flight_number} was deleted.`);
      setDeletingFlight(null);
      await loadFlights();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete flight.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setPriorityFilter("");
    setTypeFilter("");
    setAirportFilter("");
    setCurrentPage(1);
  };

  return (
    <PageContainer
      title="Flight Operations"
      description="Supervise scheduled airline flights, arrivals, departures, turnarounds, and priority rankings."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadFlights()}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingFlight(null);
              setIsFormOpen(true);
            }}
          >
            + Add Flight
          </Button>
        </div>
      }
    >
      {/* Toast Feedback Message */}
      {feedbackMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in">
          <span>{feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <FlightFilters
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(s) => {
          setStatusFilter(s);
          setCurrentPage(1);
        }}
        priorityFilter={priorityFilter}
        onPriorityChange={(p) => {
          setPriorityFilter(p);
          setCurrentPage(1);
        }}
        typeFilter={typeFilter}
        onTypeChange={(t) => {
          setTypeFilter(t);
          setCurrentPage(1);
        }}
        airportFilter={airportFilter}
        onAirportChange={(a) => {
          setAirportFilter(a);
          setCurrentPage(1);
        }}
        airports={airports}
        onReset={handleResetFilters}
        totalResults={totalRecords}
      />

      {/* Main Content: Loading, Error, Empty, or Table */}
      {isLoading ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-3 bg-white dark:bg-zinc-900">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to retrieve flight data"
          description="Could not connect to the backend flight management service."
          error={error}
          onRetry={loadFlights}
        />
      ) : flights.length === 0 ? (
        <EmptyState
          title={searchQuery || statusFilter || priorityFilter || airportFilter ? "No matching flights found" : "No flights in database"}
          description={
            searchQuery || statusFilter || priorityFilter || airportFilter
              ? "No flights match your search query or filter criteria. Try clearing filters."
              : "No flight schedules are currently recorded in the system. Add your first flight to begin operations."
          }
          actionText={searchQuery || statusFilter || priorityFilter || airportFilter ? "Clear Filters" : "+ Add Flight"}
          onAction={() => {
            if (searchQuery || statusFilter || priorityFilter || airportFilter) {
              handleResetFilters();
            } else {
              setEditingFlight(null);
              setIsFormOpen(true);
            }
          }}
        />
      ) : (
        <div className="space-y-0">
          <FlightTable
            flights={flights}
            airports={airportsMap}
            aircraft={aircraftMap}
            onView={(flight) => {
              setSelectedFlight(flight);
              setIsDetailOpen(true);
            }}
            onEdit={(flight) => {
              setEditingFlight(flight);
              setIsFormOpen(true);
            }}
            onDelete={(flight) => {
              setDeleteError(null);
              setDeletingFlight(flight);
            }}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Flight Detail Modal */}
      <FlightDetailModal
        flight={selectedFlight}
        airports={airportsMap}
        aircraft={aircraftMap}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedFlight(null);
        }}
        onEdit={(flight) => {
          setIsDetailOpen(false);
          setEditingFlight(flight);
          setIsFormOpen(true);
        }}
      />

      {/* Flight Form Modal (Create / Edit) */}
      <FlightFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingFlight(null);
        }}
        onSubmit={handleFormSubmit}
        flight={editingFlight}
        airports={airports}
        aircraftList={aircraftList}
      />

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingFlight)}
        onClose={() => {
          setDeletingFlight(null);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Confirm Flight Deletion"
        message={
          deleteError
            ? `Error deleting flight: ${deleteError}`
            : `Are you sure you want to delete flight ${deletingFlight?.flight_number}? This action cannot be undone.`
        }
        confirmText="Delete Flight"
        variant="danger"
        isLoading={isDeleting}
      />
    </PageContainer>
  );
}
