import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  seedChatGroups, seedChatMessages, seedDistricts, seedHouses, seedMarkets,
  seedStates, seedStores, seedTickets, seedUsers, seedVendors,
} from "./mock/seed";
import type {
  ChatGroup, ChatMessage, District, ExternalVendor, House, Market, State,
  Store, Ticket, TicketStatus, User,
} from "./types";

const STORAGE_KEY = "techno-ticket-store-v1";

interface Store$ {
  users: User[];
  states: State[];
  markets: Market[];
  districts: District[];
  stores: Store[];
  houses: House[];
  tickets: Ticket[];
  vendors: ExternalVendor[];
  chatGroups: ChatGroup[];
  chatMessages: ChatMessage[];
}

const initial: Store$ = {
  users: seedUsers,
  states: seedStates,
  markets: seedMarkets,
  districts: seedDistricts,
  stores: seedStores,
  houses: seedHouses,
  tickets: seedTickets,
  vendors: seedVendors,
  chatGroups: seedChatGroups,
  chatMessages: seedChatMessages,
};

function loadStore(): Store$ {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    return { ...initial, ...(JSON.parse(raw) as Store$) };
  } catch {
    return initial;
  }
}

interface DataCtx {
  data: Store$;
  set: <K extends keyof Store$>(key: K, next: Store$[K]) => void;
  reset: () => void;
}

const DataContext = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Store$>(() => loadStore());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore quota */ }
  }, [data]);

  const set = useCallback(<K extends keyof Store$>(key: K, next: Store$[K]) => {
    setData((s) => ({ ...s, [key]: next }));
  }, []);

  const reset = useCallback(() => setData(initial), []);

  const value = useMemo(() => ({ data, set, reset }), [data, set, reset]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

/** Move a ticket to a new status and append history. */
export function transitionTicket(
  t: Ticket,
  status: TicketStatus,
  byUserId: string,
): Ticket {
  return {
    ...t,
    status,
    updatedAt: new Date().toISOString(),
    history: [...t.history, { status, at: new Date().toISOString(), by: byUserId }],
  };
}
