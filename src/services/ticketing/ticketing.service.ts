import { http } from "../http";
import type { Ticket } from "@/lib/types";
import type { TicketQueryParams, CreateTicketPayload, UpdateTicketPayload } from "./types";

/**
 * Ticketing Portal Service Class
 * Prepared for Ticketing portal backend endpoints.
 */
export class TicketingService {
  /**
   * Fetch all tickets with optional filtering and pagination.
   */
  async getTickets(params?: TicketQueryParams) {
    return http.get<Ticket[]>(
      "/api/tickets",
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  /**
   * Get single ticket by ID.
   */
  async getTicket(id: string | number) {
    return http.get<Ticket>(`/api/tickets/${id}`);
  }

  /**
   * Create a new ticket.
   */
  async createTicket(payload: CreateTicketPayload) {
    return http.post<Ticket>("/api/tickets", payload);
  }

  /**
   * Update an existing ticket.
   */
  async updateTicket(payload: UpdateTicketPayload) {
    return http.put<Ticket>(`/api/tickets/${payload.id}`, payload);
  }

  /**
   * Delete a ticket.
   */
  async deleteTicket(id: string | number) {
    return http.delete<null>(`/api/tickets/${id}`);
  }

  /**
   * Add a comment to a ticket.
   */
  async addComment(ticketId: string | number, content: string) {
    return http.post<{ id: string; content: string }>(`/api/tickets/${ticketId}/comments`, {
      content,
    });
  }
}

export const ticketingService = new TicketingService();
