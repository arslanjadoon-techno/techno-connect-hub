/**
 * Central Service layer — all API access in the app goes through these portal service classes.
 *
 * Folder organization:
 * - /src/services/commission/    -> Commission Portal APIs (CommissionService)
 * - /src/services/user-manager/  -> User Manager Portal APIs (UserManagerService, UsersService, StatesService, etc.)
 * - /src/services/auth/          -> Authentication APIs (AuthService)
 * - /src/services/portals/       -> Portals listing (PortalsService)
 * - /src/services/ranker/        -> Ranker Portal APIs (RankerService)
 * - /src/services/ticketing/     -> Ticketing Portal APIs (TicketingService)
 */

export { http, HttpClient } from "./http";
export type { ApiEnvelope } from "./http";

// Commission Portal
export { commissionService, CommissionService } from "./commission";
export type {
  CommissionRow,
  GetEmployeeCommissionParams,
  GetAllCommissionParams,
  CommissionUserContext,
} from "./commission";

// User Manager Portal
export {
  userManagerService,
  UserManagerService,
  usersService,
  UsersService,
  statesService,
  StatesService,
  districtsService,
  DistrictsService,
  marketsService,
  MarketsService,
  storesService,
  StoresService,
  housesService,
  HousesService,
  externalTeamService,
  ExternalTeamService,
  departmentsService,
  DepartmentsService,
  hierarchyService,
  HierarchyService,
} from "./user-manager";

// Auth
export { authService, AuthService } from "./auth";

// Portals
export { portalsService, PortalsService } from "./portals";

// Ranker Portal
export { rankerService, RankerService } from "./ranker";
export type { RankerKpi, RankerStar, RankerWeight, RankerStandingsQuery } from "./ranker";

// Ticketing Portal
export { ticketingService, TicketingService } from "./ticketing";
export type { TicketQueryParams, CreateTicketPayload, UpdateTicketPayload } from "./ticketing";

// Leave Management Portal
export { leaveService, LeaveService } from "./leave";
export type {
  LeaveQueryParams,
  CreateLeaveRequestPayload,
  ApproveLeavePayload,
  RejectLeavePayload,
  CancelLeavePayload,
  LeaveTypeOption,
} from "./leave";
