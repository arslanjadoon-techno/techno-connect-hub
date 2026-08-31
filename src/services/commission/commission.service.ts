import { COMMISSION_API_BASE_URL, COMMISSION_API_PATHS } from "@/lib/config";
import type {
  CommissionRow,
  GetEmployeeCommissionParams,
  GetAllCommissionParams,
  CommissionUserContext,
} from "./types";

const DEFAULT_OTP = "123456";

/**
 * Commission Portal Service Class
 * Handles all API calls related to the Commission Portal.
 */
export class CommissionService {
  constructor(public readonly baseUrl: string = COMMISSION_API_BASE_URL) {}

  /**
   * Helper to build query parameter strings safely.
   */
  private buildQueryString(params: Record<string, string | number | undefined | null>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.length > 0 ? `?${parts.join("&")}` : "";
  }

  /**
   * Fetch single employee commission records by NTID and OTP.
   * Endpoint: /GetEmployeeCommission?NTID=...&OTP=...
   */
  async getEmployeeCommission(params: GetEmployeeCommissionParams): Promise<CommissionRow[]> {
    const query = this.buildQueryString({
      NTID: params.ntid,
      OTP: params.otp ?? DEFAULT_OTP,
    });

    const url = `${this.baseUrl}${COMMISSION_API_PATHS.getEmployeeCommission}${query}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch employee commission (${response.status}: ${response.statusText})`,
      );
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  /**
   * Fetch all employees commission market-wise, optionally filtered by state, market, or district.
   * Endpoint: /GetAllEmployeeCommissionMarketWise?OTP=...&state=...&market=...&district=...
   */
  async getAllEmployeeCommissionMarketWise(
    params: GetAllCommissionParams = {},
  ): Promise<CommissionRow[]> {
    const query = this.buildQueryString({
      OTP: params.otp ?? DEFAULT_OTP,
      state: params.state,
      market: params.market,
      district: params.district,
    });

    const url = `${this.baseUrl}${COMMISSION_API_PATHS.getAllEmployeeCommissionMarketWise}${query}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch market commission data (${response.status}: ${response.statusText})`,
      );
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  /**
   * Automatically determines the appropriate commission API call based on the user's role and assigned hierarchy.
   */
  async getCommissionByUserContext(user: CommissionUserContext | null): Promise<{
    role: string;
    rows: CommissionRow[];
  }> {
    if (!user) {
      return { role: "user", rows: [] };
    }

    const commissionPortal = user.portalAccess?.find((p) => p.portalName === "commission");
    const role = commissionPortal?.roleName || "user";

    let rows: CommissionRow[] = [];

    if (role === "user") {
      // Default / employee NTID
      const ntid = user.ntid || "SPC44739";
      rows = await this.getEmployeeCommission({ ntid });
    } else if (role === "admin") {
      rows = await this.getAllEmployeeCommissionMarketWise();
    } else if (role === "stateManager") {
      const stateName = user.states?.[0]?.name;
      rows = await this.getAllEmployeeCommissionMarketWise({ state: stateName });
    } else if (role === "marketManager") {
      const marketName = user.markets?.[0]?.name;
      rows = await this.getAllEmployeeCommissionMarketWise({ market: marketName });
    } else if (role === "districtManager") {
      const districtName = user.districts?.[0]?.name;
      rows = await this.getAllEmployeeCommissionMarketWise({ district: districtName });
    } else {
      rows = await this.getAllEmployeeCommissionMarketWise();
    }

    return { role, rows };
  }

  /**
   * Fetch dashboard summary metrics (MTD stats, trends, top markets).
   */
  async getDashboardMetrics(params: { otp?: string } = {}): Promise<CommissionRow[]> {
    return this.getAllEmployeeCommissionMarketWise({ otp: params.otp ?? DEFAULT_OTP });
  }
}

/**
 * Singleton instance of CommissionService
 */
export const commissionService = new CommissionService();
