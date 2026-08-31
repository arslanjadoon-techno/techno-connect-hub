import { usersService, UsersService } from "./users.service";
import { departmentsService, DepartmentsService } from "./departments.service";
import { statesService, StatesService } from "./states.service";
import { marketsService, MarketsService } from "./markets.service";
import { districtsService, DistrictsService } from "./districts.service";
import { storesService, StoresService } from "./stores.service";
import { housesService, HousesService } from "./houses.service";
import { externalTeamService, ExternalTeamService } from "./external-team.service";
import { hierarchyService, HierarchyService } from "./hierarchy.service";

/**
 * Unified User Manager Portal Service
 * Aggregates all User Manager domain services under a single portal service class.
 */
export class UserManagerService {
  public readonly users: UsersService = usersService;
  public readonly departments: DepartmentsService = departmentsService;
  public readonly states: StatesService = statesService;
  public readonly markets: MarketsService = marketsService;
  public readonly districts: DistrictsService = districtsService;
  public readonly stores: StoresService = storesService;
  public readonly houses: HousesService = housesService;
  public readonly externalTeam: ExternalTeamService = externalTeamService;
  public readonly hierarchy: HierarchyService = hierarchyService;
}

export const userManagerService = new UserManagerService();
