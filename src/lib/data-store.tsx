import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  seedChatGroups,
  seedChatMessages,
  seedDistricts,
  seedHouses,
  seedMarkets,
  seedNotifications,
  seedStates,
  seedStores,
  seedTickets,
  seedUsers,
  seedVendors,
} from "./mock/seed";
import type {
  AppNotification,
  ChatGroup,
  ChatMessage,
  District,
  ExternalVendor,
  House,
  Market,
  State,
  Store,
  Ticket,
  TicketStatus,
  User,
} from "./types";

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
  notifications: AppNotification[];
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
  notifications: seedNotifications,
};

interface DataCtx {
  data: Store$;
  set: <K extends keyof Store$>(key: K, next: Store$[K]) => void;
  reset: () => void;
}

const DataContext = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  // 🧹 Removed localStore() helper and storage keys. Explicitly initializing with base/empty template.
  const [data, setData] = useState<Store$>(initial);

  // 🛠️ Optimized state setter with stability guard
  const set = useCallback(<K extends keyof Store$>(key: K, next: Store$[K]) => {
    setData((s) => {
      // Don't trigger component re-renders if incoming payload matches exactly (avoids infinity route re-hits)
      if (JSON.stringify(s[key]) === JSON.stringify(next)) return s;
      return { ...s, [key]: next };
    });
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
export function transitionTicket(t: Ticket, status: TicketStatus, byUserId: string): Ticket {
  return {
    ...t,
    status,
    updatedAt: new Date().toISOString(),
    history: [...t.history, { status, at: new Date().toISOString(), by: byUserId }],
  };
}
