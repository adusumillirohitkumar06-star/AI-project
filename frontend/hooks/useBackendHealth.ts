"use client";

import { useCallback, useEffect, useState } from "react";
import { checkBackendHealth } from "@/lib/api";
import { HealthApiResponse } from "@/types/api";

interface HealthState {
  data: HealthApiResponse | null;
  loading: boolean;
  error: string | null;
}

export function useBackendHealth() {
  const [state, setState] = useState<HealthState>({
    data: null,
    loading: true,
    error: null,
  });

  const check = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await checkBackendHealth();
      setState({ data, loading: false, error: null });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to connect to backend server";
      setState({ data: null, loading: false, error: message });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    checkBackendHealth()
      .then((data) => {
        if (isMounted) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to connect to backend server";
          setState({ data: null, loading: false, error: message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { ...state, refetch: check };
}
