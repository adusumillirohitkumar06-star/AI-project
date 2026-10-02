"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/FeedbackStates";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Input } from "@/components/ui/Input";
import { GateTable } from "@/components/gates/GateTable";
import { GateDetailModal } from "@/components/gates/GateDetailModal";
import { GateFormModal } from "@/components/gates/GateFormModal";
import { GateFilters } from "@/components/gates/GateFilters";
import { getAirports } from "@/lib/api/flights";
import {
  createGate,
  deleteGate,
  getGates,
  getTerminals,
  updateGate,
} from "@/lib/api/gates";
import { Airport } from "@/types/flight";
import {
  Gate,
  GateCreatePayload,
  GateFilterParams,
  Terminal,
} from "@/types/gate";

export default function GatesManager() {
  // Gate state
  const [gates, setGates] = useState<Gate[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [airportFilter, setAirportFilter] = useState("");
  const [terminalFilter, setTerminalFilter] = useState("");
  const [capabilityFilter, setCapabilityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");

  // Relational data
  const [airports, setAirports] = useState<Airport[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);

  // Loading & error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGate, setEditingGate] = useState<Gate | null>(null);

  // Delete confirmation
  const [deletingGate, setDeletingGate] = useState<Gate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Quick closure toggle modal
  const [togglingGate, setTogglingGate] = useState<Gate | null>(null);
  const [closureReasonInput, setClosureReasonInput] = useState("");
  const [isTogglingClosure, setIsTogglingClosure] = useState(false);

  // Success alert feedback
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Fast relational lookups
  const airportsMap = useMemo(() => {
    const map = new Map<number, Airport>();
    airports.forEach((a) => map.set(a.id, a));
    return map;
  }, [airports]);

  const terminalsMap = useMemo(() => {
    const map = new Map<number, Terminal>();
    terminals.forEach((t) => map.set(t.id, t));
    return map;
  }, [terminals]);

  // Load airports and terminals on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([getAirports(100), getTerminals(undefined, 100)])
      .then(([airportsRes, terminalsRes]) => {
        if (isMounted) {
          setAirports(airportsRes.items || []);
          setTerminals(terminalsRes.items || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load relational airport/terminal data:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch gates from backend with active filters
  const loadGates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: GateFilterParams = {
        page: currentPage,
        page_size: pageSize,
      };

      if (terminalFilter) {
        params.terminal_id = Number(terminalFilter);
      }
      if (airportFilter) {
        params.airport_id = Number(airportFilter);
      }
      if (availabilityFilter === "AVAILABLE") {
        params.is_active = true;
        params.is_closed = false;
      } else if (availabilityFilter === "CLOSED") {
        params.is_closed = true;
      } else if (availabilityFilter === "INACTIVE") {
        params.is_active = false;
      }

      const res = await getGates(params);
      let items = res.items || [];

      // Client-side search and capability filtering where backend API has no query parameter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toUpperCase();
        items = items.filter((g) => g.gate_code.toUpperCase().includes(q));
      }
      if (capabilityFilter) {
        items = items.filter((g) => g.capability === capabilityFilter);
      }

      setGates(items);
      setTotalRecords(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load gates from backend.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, terminalFilter, airportFilter, availabilityFilter, searchQuery, capabilityFilter]);

  // Trigger loadGates on dependency updates
  useEffect(() => {
    loadGates();
  }, [loadGates]);

  // Handle Form Submission (Create or Edit)
  const handleFormSubmit = async (payload: GateCreatePayload) => {
    if (editingGate) {
      await updateGate(editingGate.id, payload);
      setFeedbackMessage(`Gate ${payload.gate_code} updated successfully.`);
    } else {
      await createGate(payload);
      setFeedbackMessage(`Gate ${payload.gate_code} created successfully.`);
    }
    await loadGates();
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Handle Gate Deletion
  const handleDeleteConfirm = async () => {
    if (!deletingGate) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteGate(deletingGate.id);
      setFeedbackMessage(`Gate ${deletingGate.gate_code} deleted successfully.`);
      setDeletingGate(null);
      await loadGates();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete gate.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick closure toggle
  const handleToggleClosureClick = (gate: Gate) => {
    if (gate.is_closed) {
      // Reopen directly
      updateGate(gate.id, { is_closed: false, closure_reason: null })
        .then(() => {
          setFeedbackMessage(`Gate ${gate.gate_code} reopened.`);
          loadGates();
          setTimeout(() => setFeedbackMessage(null), 4000);
        })
        .catch((err) => {
          alert(`Error reopening gate: ${err.message}`);
        });
    } else {
      // Open modal to specify closure reason
      setClosureReasonInput("Maintenance / Jet bridge service");
      setTogglingGate(gate);
    }
  };

  const handleConfirmClosure = async () => {
    if (!togglingGate) return;
    setIsTogglingClosure(true);
    try {
      await updateGate(togglingGate.id, {
        is_closed: true,
        closure_reason: closureReasonInput.trim() || "Maintenance",
      });
      setFeedbackMessage(`Gate ${togglingGate.gate_code} marked as closed.`);
      setTogglingGate(null);
      await loadGates();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to close gate.";
      alert(msg);
    } finally {
      setIsTogglingClosure(false);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setAirportFilter("");
    setTerminalFilter("");
    setCapabilityFilter("");
    setStatusFilter("");
    setAvailabilityFilter("");
    setCurrentPage(1);
  };

  return (
    <PageContainer
      title="Gate Management"
      description="Supervise airport apron gates, terminal jet bridges, aircraft compatibility, and operational closures."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadGates()}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingGate(null);
              setIsFormOpen(true);
            }}
          >
            + Add Gate
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
      <GateFilters
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        airportFilter={airportFilter}
        onAirportChange={(a) => {
          setAirportFilter(a);
          setCurrentPage(1);
        }}
        terminalFilter={terminalFilter}
        onTerminalChange={(t) => {
          setTerminalFilter(t);
          setCurrentPage(1);
        }}
        capabilityFilter={capabilityFilter}
        onCapabilityChange={(c) => {
          setCapabilityFilter(c);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(s) => {
          setStatusFilter(s);
          setCurrentPage(1);
        }}
        availabilityFilter={availabilityFilter}
        onAvailabilityChange={(av) => {
          setAvailabilityFilter(av);
          setCurrentPage(1);
        }}
        airports={airports}
        terminals={terminals}
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
          title="Failed to retrieve gate data"
          description="Could not connect to the backend gate management service."
          error={error}
          onRetry={loadGates}
        />
      ) : gates.length === 0 ? (
        <EmptyState
          title={
            searchQuery || airportFilter || terminalFilter || capabilityFilter || availabilityFilter
              ? "No matching gates found"
              : "No gates available"
          }
          description={
            searchQuery || airportFilter || terminalFilter || capabilityFilter || availabilityFilter
              ? "No gates match your search query or filter criteria. Try clearing filters."
              : "No airport gates are currently configured in the database. Add your first gate to configure airport capacity."
          }
          actionText={
            searchQuery || airportFilter || terminalFilter || capabilityFilter || availabilityFilter
              ? "Clear Filters"
              : "+ Add Gate"
          }
          onAction={() => {
            if (searchQuery || airportFilter || terminalFilter || capabilityFilter || availabilityFilter) {
              handleResetFilters();
            } else {
              setEditingGate(null);
              setIsFormOpen(true);
            }
          }}
        />
      ) : (
        <div className="space-y-0">
          <GateTable
            gates={gates}
            terminals={terminalsMap}
            airports={airportsMap}
            onView={(gate) => {
              setSelectedGate(gate);
              setIsDetailOpen(true);
            }}
            onEdit={(gate) => {
              setEditingGate(gate);
              setIsFormOpen(true);
            }}
            onDelete={(gate) => {
              setDeleteError(null);
              setDeletingGate(gate);
            }}
            onToggleClosure={handleToggleClosureClick}
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

      {/* Gate Detail Modal */}
      <GateDetailModal
        gate={selectedGate}
        terminals={terminalsMap}
        airports={airportsMap}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedGate(null);
        }}
        onEdit={(gate) => {
          setIsDetailOpen(false);
          setEditingGate(gate);
          setIsFormOpen(true);
        }}
      />

      {/* Gate Form Modal (Create / Edit) */}
      <GateFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGate(null);
        }}
        onSubmit={handleFormSubmit}
        gate={editingGate}
        airports={airports}
        terminals={terminals}
      />

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingGate)}
        onClose={() => {
          setDeletingGate(null);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Confirm Gate Deletion"
        message={
          deleteError
            ? `Error deleting gate: ${deleteError}`
            : `Are you sure you want to delete gate ${deletingGate?.gate_code}? Deleting this gate may affect existing historical assignments or schedules.`
        }
        confirmText="Delete Gate"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Gate Closure Modal */}
      {togglingGate && (
        <Modal
          isOpen={Boolean(togglingGate)}
          onClose={() => setTogglingGate(null)}
          title={`Mark Gate ${togglingGate.gate_code} as Closed`}
          description="Closing this gate will remove it from active domain values in CSP scheduling."
          maxWidth="sm"
        >
          <div className="space-y-4">
            <Input
              label="Closure Reason *"
              placeholder="e.g. Jet bridge maintenance, Tarmac resurfacing"
              value={closureReasonInput}
              onChange={(e) => setClosureReasonInput(e.target.value)}
              required
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTogglingGate(null)}
                disabled={isTogglingClosure}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmClosure}
                isLoading={isTogglingClosure}
              >
                Close Gate
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
