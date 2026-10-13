import { useEffect, useMemo } from "react";
import {
  getArrayPayload,
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
  normalizeChatError,
} from "./chatHealper";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";
import {
  addGroupMembersService,
  createGroupChatService,
} from "@/services/Team-chat/group.service";
import { usersService } from "@/services/user-manager/users.service";

type ChatRecord = Record<string, any>;

type ChatGroupComposerOptions = {
  addMembersDialogOpen: boolean;
  addMemberUserIds: string[];
  allVisibleBuddies: ChatRecord[];
  currentUserId: string;
  creatingGroup: boolean;
  groupDialogOpen: boolean;
  groupPage: boolean;
  groupSearch: string;
  groupTitle: string;
  groupUserCacheRef: { current: Map<string, ChatRecord> };
  groupUserIds: string[];
  isCurrentUserRecord: (user: ChatRecord) => boolean;
  managedUsers: ChatRecord[];
  selectedChat: ChatRecord | null;
  selectedGroupParticipantIds?: Set<string>;
  uniqueUsersByIdentity: (users: ChatRecord[]) => ChatRecord[];
  visibleChannels: ChatRecord[];
  addingMembers: boolean;
  loadChannelHistory: (chat: ChatRecord) => Promise<unknown>;
  navigate: (path: string) => void;
  setAddMemberUserIds: (value: any) => void;
  setAddMembersDialogOpen: (value: any) => void;
  setAddMembersError: (value: any) => void;
  setAddingMembers: (value: any) => void;
  setChannels: (value: any) => void;
  setCreatingGroup: (value: any) => void;
  setGroupError: (value: any) => void;
  setGroupDialogOpen: (value: any) => void;
  setGroupSearch: (value: any) => void;
  setGroupTitle: (value: any) => void;
  setGroupUserIds: (value: any) => void;
  setManagedUsers: (value: any) => void;
  setManagedUsersLoading: (value: any) => void;
  setSelectedChat: (value: any) => void;
  setTab: (value: any) => void;
};

export function useChatGroupComposer({
  addMembersDialogOpen,
  addMemberUserIds,
  allVisibleBuddies,
  currentUserId,
  creatingGroup,
  groupDialogOpen,
  groupPage,
  groupSearch,
  groupTitle,
  groupUserCacheRef,
  groupUserIds,
  isCurrentUserRecord,
  managedUsers,
  selectedChat,
  uniqueUsersByIdentity,
  visibleChannels,
  addingMembers,
  loadChannelHistory,
  navigate,
  setAddMemberUserIds,
  setAddMembersDialogOpen,
  setAddMembersError,
  setAddingMembers,
  setChannels,
  setCreatingGroup,
  setGroupError,
  setGroupDialogOpen,
  setGroupSearch,
  setGroupTitle,
  setGroupUserIds,
  setManagedUsers,
  setManagedUsersLoading,
  setSelectedChat,
  setTab,
}: ChatGroupComposerOptions) {
  const toggleGroupUser = (userId: string) => {
    const selectedUser = managedUsers.find((user) => String(getBuddySendId(user)) === String(userId));
    if (selectedUser) groupUserCacheRef.current.set(String(userId), selectedUser);
    setGroupUserIds((prev: string[]) =>
      prev.some((selectedId: string) => String(selectedId) === String(userId))
        ? prev.filter((selectedId: string) => String(selectedId) !== String(userId))
        : [...prev, String(userId)],
    );
  };

  const handleCreateGroup = async () => {
    if (creatingGroup) return;
    if (!groupTitle.trim()) {
      setGroupError("Enter a group name.");
      return;
    }
    if (groupUserIds.length === 0) {
      setGroupError("Select at least one person.");
      return;
    }

    setCreatingGroup(true);
    setGroupError("");

    try {
      const response: any = await createGroupChatService(groupTitle.trim(), groupUserIds);
      const conversation = response?.data?.data ?? response?.data ?? response;
      const channelId = getChannelId(conversation);

      setChannels((prev: ChatRecord[]) => [conversation, ...prev]);
      setSelectedChat({
        type: "channel",
        source: "local",
        id: channelId,
        title: getChannelName(conversation),
        subtitle: channelId,
        raw: conversation,
        imageUrl: getImageUrl(conversation),
        currentUserId,
      });
      setTab("conversations");
      setGroupDialogOpen(false);

      if (channelId) {
        navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(channelId)}`);
      }
    } catch (error) {
      setGroupError(normalizeChatError(error));
    } finally {
      setCreatingGroup(false);
    }
  };

  const groupMembers = useMemo(
    () =>
      managedUsers.filter((buddy) => {
        const search = groupSearch.trim().toLowerCase();
        if (!search) return true;
        return `${getBuddyName(buddy)} ${getBuddyEmail(buddy)}`.toLowerCase().includes(search);
      }),
    [managedUsers, groupSearch],
  );

  useEffect(() => {
    if (!groupPage && !groupDialogOpen && !addMembersDialogOpen) return;

    const query = groupSearch.trim();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setManagedUsersLoading(true);
      // Search through User Management so users outside the first page, such
      // as Arslan, are included in the results.
      const request: Promise<any> = query
        ? usersService.search({ search: query })
        : Promise.all([
            usersService.getAll({ page: 1, size: 1000 }),
            usersService.getAll({ page: 2, size: 1000 }),
          ]);

      request
        .then(async (response: any) => {
          if (cancelled) return;
          let users;
          if (query) {
            users = getArrayPayload(response?.data?.data ?? response?.data ?? response) as ChatRecord[];
          } else {
            const pages = Array.isArray(response) ? response : [response];
            users = pages.flatMap((page: any) =>
              getArrayPayload(page?.data?.data ?? page?.data ?? page),
            );
          }
          setManagedUsers((users as ChatRecord[]).filter((user: ChatRecord) => !isCurrentUserRecord(user)));
        })
        .catch(() => {
          // Keep the last successful user list visible if loading fails.
        })
        .finally(() => {
          if (!cancelled) setManagedUsersLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [addMembersDialogOpen, groupDialogOpen, groupPage, groupSearch, isCurrentUserRecord]);

  const selectedGroupMembers = useMemo(
    () =>
      groupUserIds
        .map((id) =>
          managedUsers.find((buddy) => String(getBuddySendId(buddy)) === String(id)) ||
          groupUserCacheRef.current.get(String(id)),
        )
        .filter((value): value is ChatRecord => Boolean(value)),
    [managedUsers, groupUserIds],
  );

  const selectedGroupParticipantIds = useMemo(() => {
    const refreshedChannel = visibleChannels.find(
      (channel) => getChannelId(channel) === selectedChat?.id,
    );
    const participants = Array.isArray(refreshedChannel?.participants)
      ? refreshedChannel.participants
      : Array.isArray(selectedChat?.raw?.participants)
        ? selectedChat.raw.participants
        : [];

    return new Set(
      participants.map((participant: ChatRecord) => String(getBuddySendId(participant) || "")).filter(Boolean),
    );
  }, [selectedChat, visibleChannels]);

  const addableGroupMembers = useMemo(
    () =>
      managedUsers.filter(
        (buddy) => !selectedGroupParticipantIds.has(String(getBuddySendId(buddy))),
      ),
    [managedUsers, selectedGroupParticipantIds],
  );
  const selectedMentionableUsers = useMemo(() => {
    if (!selectedChat) return [];

    if (selectedChat.type !== "channel") {
      return selectedChat.raw ? [selectedChat.raw] : [];
    }

    const refreshedChannel = visibleChannels.find(
      (channel) => getChannelId(channel) === selectedChat.id,
    );
    const participants = Array.isArray(refreshedChannel?.participants)
      ? refreshedChannel.participants
      : Array.isArray(selectedChat.raw?.participants)
        ? selectedChat.raw.participants
      : [];
    const participantIds = new Set(
      participants.map((participant: ChatRecord) => String(getBuddySendId(participant) || "")).filter(Boolean),
    );

    return uniqueUsersByIdentity(
      allVisibleBuddies.filter((user) => participantIds.has(String(getBuddySendId(user)))),
    );
  }, [allVisibleBuddies, selectedChat, uniqueUsersByIdentity, visibleChannels]);

  const openAddMembersDialog = async () => {
    setAddMemberUserIds([]);
    setAddMembersError("");
    setAddMembersDialogOpen(true);
  };

  const toggleAddMemberUser = (userId: string) => {
    setAddMemberUserIds((prev: string[]) =>
      prev.includes(userId)
        ? prev.filter((selectedId) => selectedId !== userId)
        : [...prev, userId],
    );
  };

  const handleAddGroupMembers = async () => {
    if (!selectedChat || selectedChat.type !== "channel" || addingMembers) return;
    if (addMemberUserIds.length === 0) {
      setAddMembersError("Select at least one person.");
      return;
    }
    const alreadyInGroup = addMemberUserIds.some((userId) =>
      selectedGroupParticipantIds.has(String(userId)),
    );
    if (alreadyInGroup) {
      setAddMembersError("User is already in this group.");
      return;
    }

    setAddingMembers(true);
    setAddMembersError("");

    try {
      const response: any = await addGroupMembersService(selectedChat.id, addMemberUserIds);
      const updatedConversation =
        response.data?.data?.conversation || response.data?.data || selectedChat.raw;

      setChannels((prev: ChatRecord[]) =>
        prev.map((channel: ChatRecord) =>
          getChannelId(channel) === selectedChat.id ? updatedConversation : channel,
        ),
      );
      setSelectedChat((prev: ChatRecord | null) => {
        if (!prev || prev.id !== selectedChat.id) return prev;
        return {
          ...prev,
          title: getChannelName(updatedConversation),
          participants:
            updatedConversation?.participants ||
            updatedConversation?.members ||
            updatedConversation?.raw?.participants ||
            prev.participants,
          members: updatedConversation?.members || updatedConversation?.participants || prev.members,
          raw: updatedConversation,
          imageUrl: getImageUrl(updatedConversation),
        };
      });
      setAddMembersDialogOpen(false);
      await loadChannelHistory({ ...selectedChat, id: selectedChat.id, chatId: selectedChat.id });
    } catch (error) {
      setAddMembersError(normalizeChatError(error));
    } finally {
      setAddingMembers(false);
    }
  };


  return {
    addableGroupMembers,
    groupMembers,
    handleAddGroupMembers,
    handleCreateGroup,
    openAddMembersDialog,
    selectedGroupMembers,
    selectedGroupParticipantIds,
    selectedMentionableUsers,
    toggleAddMemberUser,
    toggleGroupUser,
  };
}

