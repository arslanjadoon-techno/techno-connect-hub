/**
 * Central Service layer — all API access in the app goes through these portal service classes.
 *
 * Folder organization:
 * - /src/services/portals/commission/       -> Commission Portal APIs (CommissionService)
 * - /src/services/portals/leave-management/ -> Leave Management Portal APIs (LeaveService)
 * - /src/services/portals/ranker/           -> Ranker Portal APIs (RankerService)
 * - /src/services/portals/ticketing/        -> Ticketing Portal APIs (TicketingService)
 * - /src/services/user-manager/             -> User Manager Portal APIs (UserManagerService, etc.)
 * - /src/services/auth/                     -> Authentication APIs (AuthService)
 * - /src/services/portals/                  -> Portals listing (PortalsService)
 */

export { http, HttpClient } from "./http";
export type { ApiEnvelope } from "./http";

// Commission Portal
export { commissionService, CommissionService } from "./portals/commission";
export type {
  CommissionRow,
  CommissionMarket,
  CommissionPaginationParams,
  CommissionPaginationResponse,
  GetEmployeeCommissionParams,
  GetAllCommissionParams,
  CommissionUserContext,
} from "./portals/commission";

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
export { rankerService, RankerService } from "./portals/ranker";
export type { RankerKpi, RankerStar, RankerWeight, RankerStandingsQuery } from "./portals/ranker";

// Ticketing Portal
export { ticketingService, TicketingService } from "./portals/ticketing";
export type {
  TicketQueryParams,
  CreateTicketPayload,
  UpdateTicketPayload,
} from "./portals/ticketing";

// Leave Management Portal
export { leaveService, LeaveService } from "./portals/leave-management";
export type {
  LeaveQueryParams,
  CreateLeaveRequestPayload,
  ApproveLeavePayload,
  RejectLeavePayload,
  CancelLeavePayload,
  LeaveTypeOption,
} from "./portals/leave-management";
