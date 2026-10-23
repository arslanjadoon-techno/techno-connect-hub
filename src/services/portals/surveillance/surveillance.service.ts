import { http } from "../../http";
import type {
  SurveillanceRequest,
  SurveillanceReport,
  CreateSurveillanceRequestPayload,
  CreateSurveillanceReportPayload,
} from "./types";

/**
 * Surveillance Portal Service Class
 * Prepared for Surveillance portal backend endpoints.
 */
export class SurveillanceService {
  /**
   * Fetch all surveillance report requests.
   */
  async getRequests() {
    return http.get<SurveillanceRequest[]>("/api/surveillance/requests");
  }

  /**
   * Get single request by ID.
   */
  async getRequest(id: string | number) {
    return http.get<SurveillanceRequest>(`/api/surveillance/requests/${id}`);
  }

  /**
   * Create a new surveillance report request (by Admin, State Manager, Market Manager, District Manager).
   */
  async createRequest(payload: CreateSurveillanceRequestPayload) {
    return http.post<SurveillanceRequest>("/api/surveillance/requests", payload);
  }

  /**
   * Approve a request (Admin, State Manager, Market Manager only).
   */
  async approveRequest(id: string | number, notes?: string) {
    return http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/approve`, { notes });
  }

  /**
   * Reject a request (Admin, State Manager, Market Manager only).
   */
  async rejectRequest(id: string | number, reason: string) {
    return http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/reject`, { reason });
  }

  /**
   * Fetch all submitted surveillance reports.
   */
  async getReports() {
    return http.get<SurveillanceReport[]>("/api/surveillance/reports");
  }

  /**
   * Get single surveillance report by ID.
   */
  async getReport(id: string | number) {
    return http.get<SurveillanceReport>(`/api/surveillance/reports/${id}`);
  }

  /**
   * Submit a surveillance report against a request (User role).
   */
  async submitReport(payload: CreateSurveillanceReportPayload) {
    return http.post<SurveillanceReport>("/api/surveillance/reports", payload);
  }

  /**
   * Review submitted report (Approve or Reject with comments and optional 5-star rating)
   */
  async reviewReport(
    id: string | number,
    payload: {
      action: "approve" | "reject";
      comments?: string;
      rating?: number;
    },
  ) {
    return http.post<SurveillanceReport>(`/api/surveillance/reports/${id}/review`, payload);
  }
}

export const surveillanceService = new SurveillanceService();
