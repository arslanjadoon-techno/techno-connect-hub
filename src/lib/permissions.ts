import type { ChatGroup, Ticket, User } from "./types";

/** Tickets the user is allowed to see, based on role + department + geography. */
export function visibleTickets(user: User, tickets: Ticket[]): Ticket[] {
  switch (user.roleName) {
    case "admin":
      return tickets;
    case "manager":
      return tickets.filter((t) => t.department === user.department);
    case "state_manager":
      return tickets.filter((t) => t.stateId === user.stateId);
    case "market_manager":
      return tickets.filter((t) => t.marketId === user.marketId);
    case "district_manager":
      return tickets.filter((t) => t.districtId === user.districtId);
    case "store_manager":
      return tickets.filter((t) => t.category === "store" && t.locationId === user.storeId);
    case "user":
    default:
      return tickets.filter((t) => t.assigneeId === user.id);
  }
}

/** Can this user create + assign tickets? */
export function canCreateTicket(user: User): boolean {
  return user.roleName !== "user";
}

export function canAssignTicket(user: User): boolean {
  return user.roleName !== "user";
}

export function isAdmin(user: User): boolean {
  return user.roleName === "admin";
}

/** Admin + any manager-level role can manage chat groups. */
export function canManageChatGroups(user: User): boolean {
  return user.roleName === "admin" || user.roleName.endsWith("manager");
}

/** Chat groups visible to user. */
export function visibleChatGroups(user: User, groups: ChatGroup[]): ChatGroup[] {
  if (user.roleName === "admin") return groups;
  return groups.filter(
    (g) => g.department === user.department || g.memberIds.includes(user.id),
  );
}
