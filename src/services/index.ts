/**
 * Service layer — all API access in the app should go through these classes.
 *
 * Every service uses the shared `http` client which reads its base URL from
 * `VITE_API_DEV_URL` in `.env`. Switch backends by editing `.env` only.
 *
 * Migration note: thin wrappers over `src/lib/api/client.ts` so existing
 * components keep working while new code consumes the service classes.
 */
export { http, HttpClient } from "./http";
export type { ApiEnvelope } from "./http";

export { authService, AuthService } from "./auth.service";
export { usersService, UsersService } from "./users.service";
export { statesService, StatesService } from "./states.service";
export { districtsService, DistrictsService } from "./districts.service";
export { marketsService, MarketsService } from "./markets.service";
export { storesService, StoresService } from "./stores.service";
export { housesService, HousesService } from "./houses.service";
export { externalTeamService, ExternalTeamService } from "./external-team.service";
export { departmentsService, DepartmentsService } from "./departments.service";
export { portalsService, PortalsService } from "./portals.service";
export { hierarchyService, HierarchyService } from "./hierarchy.service";
