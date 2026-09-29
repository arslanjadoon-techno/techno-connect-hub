"use client";

import { useEffect, useState } from "react";

type ReportQueryState<T> = {
  data: T;
  isLoading: boolean;
  isDeferred: boolean;
  error: string;
};

type ReportLoader<T> = (signal: AbortSignal) => Promise<T>;

export function useReportQuery<T>(
  load: ReportLoader<T>,
  initialData: T,
  errorMessage = "Report request failed",
  enabled = true,
): ReportQueryState<T> {
  const [state, setState] = useState<ReportQueryState<T>>({
    data: initialData,
    isLoading: true,
    isDeferred: false,
    error: "",
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setState((previous) => ({
          ...previous,
          isLoading: true,
          error: "",
        }));
      }
    });

    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, isLoading: false, isDeferred: false, error: "" });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({
            data: initialData,
            isLoading: false,
            isDeferred: false,
            error: errorMessage,
          });
        }
      });

    return () => controller.abort();
  }, [enabled, errorMessage, initialData, load]);

  return {
    ...state,
    isLoading: enabled && state.isLoading,
    isDeferred: !enabled,
  };
}
