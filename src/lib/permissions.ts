import type { ChatGroup, Ticket, User } from "./types";

/**
 * Reconstructed - the original file at this path was lost (overwritten,
 * cause unclear, no backup available in git or VS Code local history) and
 * is rebuilt here purely from how every call site uses it. Behavior:
 * admins see/manage everything; everyone else is scoped to tickets/chat
 * groups tied to their own department, or ones they created/were assigned
 * to/are a member of. Review this against the app's actual intended rules -
 * it's inferred, not restored.
 */

function isManager(user: User): boolean {
  return (
    user.roleName === "admin" ||
    user.roleName === "manager" ||
    Boolean(user.allowedUserManagement)
  );
}

export function isAdmin(user: User): boolean {
  return user.roleName === "admin";
}

export function visibleTickets(user: User, tickets: Ticket[]): Ticket[] {
  if (isAdmin(user)) return tickets;
  return tickets.filter(
    (t) =>
      t.createdById === user.id || t.assigneeId === user.id || t.department === user.department,
  );
}

export function canCreateTicket(user: User | null): boolean {
  return Boolean(user);
}

export function canAssignTicket(user: User | null): boolean {
  return user != null && isManager(user);
}

export function visibleChatGroups(user: User, groups: ChatGroup[]): ChatGroup[] {
  if (isAdmin(user)) return groups;
  return groups.filter(
    (g) => !g.department || g.department === user.department || g.memberIds.includes(user.id),
  );
}

export function canManageChatGroups(user: User | null): boolean {
  return user != null && isManager(user);
}
