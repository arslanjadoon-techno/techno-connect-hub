import {
  addGroupMembersService as addMembers,
  createGroupChatService as createGroup,
  leaveGroupConversationService as leaveGroup,
  removeGroupMemberService as removeMember,
  transferGroupOwnershipService as transferOwner,
} from "./chat.service";

export const createGroupChatService = (title: string, userIds: Array<string | number>) =>
  createGroup({ title, userIds });

export const addGroupMembersService = (chatId: string | number, userIds: Array<string | number>) =>
  addMembers(chatId, userIds);

export const removeGroupMemberService = (chatId: string | number, userId: string | number) =>
  removeMember(chatId, userId);

export const leaveGroupConversationService = (chatId: string | number) => leaveGroup(chatId);

export const transferGroupOwnershipService = (chatId: string | number, userId: string | number) =>
  transferOwner(chatId, userId);
