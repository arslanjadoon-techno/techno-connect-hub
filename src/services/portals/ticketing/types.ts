import type { Ticket, TicketStatus, TicketPriority, Department } from "@/lib/types";

export interface TicketQueryParams {
  status?: TicketStatus | "all";
  priority?: TicketPriority | "all";
  department?: Department | "all";
  page?: number;
  size?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  department: Department;
  priority: TicketPriority;
  category?: string;
  assignedTo?: string;
  attachments?: string[];
}

export interface UpdateTicketPayload extends Partial<CreateTicketPayload> {
  id: string;
  status?: TicketStatus;
}
