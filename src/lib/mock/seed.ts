/**
 * Mock data has been removed — the app now consumes real data from the backend APIs.
 * These empty exports are kept so existing imports continue to compile while the
 * remaining endpoints are wired up. As new APIs are integrated, the corresponding
 * arrays will be populated from the API responses (via the data-store).
 */
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
  User,
} from "../types";

export const seedStates: State[] = [];
export const seedMarkets: Market[] = [];
export const seedDistricts: District[] = [];
export const seedStores: Store[] = [];
export const seedHouses: House[] = [];
export const seedUsers: User[] = [];
export const seedVendors: ExternalVendor[] = [];
export const seedTickets: Ticket[] = [];
export const seedChatGroups: ChatGroup[] = [];
export const seedChatMessages: ChatMessage[] = [];
export const seedNotifications: AppNotification[] = [];
