import { http } from "../http";
import { PAYSLIP_API_PATHS } from "@/lib/config";

export interface PayslipItem {
  id: number;
  user_id: number;
  ntid?: string;
  market?: string;
  employee_name?: string;
  designation?: string;
  weekly_days?: number;
  payroll_days?: number;
  attendance_cycle?: string;
  pay_cycle?: string;
  total_working_days?: number;
  base_salary?: number;
  commission?: number;
  bonus?: number;
  additional_pay?: number;
  total_earnings?: number;
  hourly_rate?: number;
  regular_hours?: number;
  ot_rate?: number;
  ot_hours?: number;
  net_salary?: number;
  adp_amount?: number;
  check_amount?: number;
  token?: string;
  is_viewed?: boolean;
  viewed_at?: string | null;
  is_used?: boolean;
  signature_text?: string | null;
  signed_at?: string | null;
  created_at?: string;
}

/**
 * Payslip Service Class
 * Handles API operations for employee payslips and payroll hub.
 */
export class PayslipService {
  /**
   * Fetches unviewed payslip records for a given user ID.
   * Endpoint: /api/payslips/GetUnviewedPaySlipByUserId/{userId}
   */
  async getUnviewedByUserId(userId: string | number) {
    return http.get<PayslipItem[]>(PAYSLIP_API_PATHS.getUnviewedByUserId(userId));
  }
}

export const payslipService = new PayslipService();
