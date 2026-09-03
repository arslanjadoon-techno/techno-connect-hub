export interface CommissionRow {
  ntid: string;
  day: number;
  month: number;
  year: number;
  market: string;
  employee_Name: string;
  commission: number;
  total_Box: number;
  box_Commission: number;
  acc_Sales: number;
  activation_Retention_Commission: number;
  vaS_Commission: number;
  hsI_Commission: number;
  contest: number;
  hsi: number;
  write_Ups_Chargebacks: number;
  final_Commission_After_Deduction: number;
  eligible?: unknown;
  // Dynamic MRC fields
  _5_MRC?: number;
  _10_MRC?: number;
  _15_MRC?: number;
  _20_MRC?: number;
  _24_MRC?: number;
  _25_MRC?: number;
  _26_MRC?: number;
  _30_MRC?: number;
  _35_MRC?: number;
  _40_MRC?: number;
  _45_MRC?: number;
  _48_MRC?: number;
  _50_MRC?: number;
  _55_MRC?: number;
  _60_MRC?: number;
  _65_MRC?: number;
  _75_MRC?: number;
  // Web Commission mapping
  _40L1WEB_Comm?: number;
  l40?: number;
  e40?: number;
  e45?: number;
  e48?: number;
  e50?: number;
  e55?: number;
  e60?: number;
  e65?: number;
  e75?: number;
  [key: string]: unknown;
}

export interface CommissionMarket {
  id: number;
  name: string;
}

export interface CommissionPaginationParams {
  fromDate: string;
  toDate: string;
  page?: number;
  pageSize?: number;
  market?: string;
}

export interface CommissionPaginationResponse {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  data: CommissionRow[];
}

export interface GetEmployeeCommissionParams {
  ntid: string;
  otp?: string;
}

export interface GetAllCommissionParams {
  otp?: string;
  state?: string;
  market?: string;
  district?: string;
}

export interface CommissionUserContext {
  roleName?: string;
  email?: string;
  ntid?: string;
  portalAccess?: Array<{ portalName: string; roleName: string }>;
  states?: Array<{ name: string; id?: number }>;
  markets?: Array<{ name: string; id?: number }>;
  districts?: Array<{ name: string; id?: number }>;
}
