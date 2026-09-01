import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { InboxCard, InboxResponse } from "@shared/inbox";
import { getInbox } from "@client/src/api/inbox";
import { logger } from "@client/src/lib/logger";

const REFRESH_INTERVAL_MS = 60_000;

interface InboxContextValue {
  items: InboxCard[] | null;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InboxCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const loadedRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    if (loadedRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const request = getInbox()
      .then((response: InboxResponse) => {
        if (!mountedRef.current) return;
        setItems(response.items ?? []);
        loadedRef.current = true;
      })
      .catch((caught: unknown) => {
        const nextError =
          caught instanceof Error ? caught : new Error(String(caught));
        logger.error("Failed to refresh shared inbox", nextError);
        if (mountedRef.current) {
          setError(nextError);
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
        inFlightRef.current = null;
      });

    inFlightRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);
    const handleFocus = (): void => {
      void refresh();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  const value = useMemo<InboxContextValue>(
    () => ({ items, loading, refreshing, error, refresh }),
    [error, items, loading, refresh, refreshing],
  );

  return (
    <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
  );
}

export function useInbox(): InboxContextValue {
  const value = useContext(InboxContext);
  if (!value) {
    throw new Error("useInbox must be used inside InboxProvider");
  }
  return value;
}
