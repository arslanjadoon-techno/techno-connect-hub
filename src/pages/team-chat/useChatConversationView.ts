import { useCallback, useEffect, useMemo } from "react";
import { buildConversationItems } from "./conversationListModal";
import {
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getImageUrl,
  getUnreadCount,
} from "./chatHealper";
import { getConversationId } from "./chatConversationKeys";
import { hasConversationHistory } from "./ChatSystemUtils";

type ChatRecord = Record<string, any>;

type ConversationViewOptions = {
  buddies: ChatRecord[];
  channels: ChatRecord[];
  currentUser: ChatRecord | null;
  currentUserEmail: string;
  currentUserId: string;
  managedUsers: ChatRecord[];
  messagesByChat: Record<string, ChatRecord[]>;
  searchTerm: string;
  selectedChat: ChatRecord | null;
  setUnreadCount?: (count: number) => void;
};

export function useChatConversationView({
  buddies,
  channels,
  currentUser,
  currentUserEmail,
  currentUserId,
  managedUsers,
  messagesByChat,
  searchTerm,
  selectedChat,
}: ConversationViewOptions) {
  const isCurrentUserRecord = useCallback(
    (item: ChatRecord) => {
      if (item?.isCurrentUser === true || item?.is_current_user === true) return true;
      if (item?.isCurrentUser === false || item?.is_current_user === false) return false;
      const itemIds = [
        item?.id,
        item?.userId,
        item?.user_id,
        item?.appUserId,
        item?.app_user_id,
        item?.identityId,
        item?.chatIdentityId,
        item?.chat_identity_id,
        item?.username,
        item?.userName,
        item?.user_name,
      ]
        .filter(Boolean)
        .map(String);
      const itemEmails = [
        item?.email,
        item?.email_id,
        item?.mailid,
        item?.providerEmail,
        item?.provider_email,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const currentUserAliases = [
        currentUser?.username,
        currentUser?.userName,
        currentUser?.user_name,
        currentUser?.login,
      ]
        .filter(Boolean)
        .map((value) => String(value));

      return (
        (currentUserId && itemIds.includes(currentUserId)) ||
        (currentUserEmail && itemEmails.includes(currentUserEmail)) ||
        currentUserAliases.some((alias) => itemIds.includes(alias))
      );
    },
    [currentUser, currentUserEmail, currentUserId],
  );

  const getUserIdentityKey = useCallback((user: ChatRecord) => {
    const email = String(
      user?.email || user?.email_id || user?.mailid || user?.primary_email || user?.emailid || "",
    )
      .trim()
      .toLowerCase();

    if (email && email.includes("@")) return `email:${email}`;

    const name = String(getBuddyName(user)).trim().toLowerCase();
    if (name && name !== "chat user") return `name:${name}`;

    return `id:${String(getBuddySendId(user) || "")
      .trim()
      .toLowerCase()}`;
  }, []);

  const getUserMergeScore = useCallback((user: ChatRecord) => {
    let score = 0;
    if (getImageUrl(user)) score += 8;
    if (user?.directConversationId || user?.chat_id || user?.chatId) score += 6;
    if (getUnreadCount(user) > 0) score += 4;
    if (String(getBuddyEmail(user)).includes("@")) score += 2;
    if (getBuddyName(user) && getBuddyName(user) !== "Chat User") score += 1;
    return score;
  }, []);

  const mergeUserRecords = useCallback(
    (first: ChatRecord | undefined, second: ChatRecord | undefined): ChatRecord => {
      if (!first) return second || {};
      if (!second) return first;

      const preferred = getUserMergeScore(second) >= getUserMergeScore(first) ? second : first;
      const fallback = preferred === second ? first : second;
      const preferredImage = getImageUrl(preferred);
      const fallbackImage = getImageUrl(fallback);

      return {
        ...fallback,
        ...preferred,
        id: getBuddySendId(preferred) || getBuddySendId(fallback),
        user_id: getBuddySendId(preferred) || getBuddySendId(fallback),
        email: String(getBuddyEmail(preferred)).includes("@")
          ? getBuddyEmail(preferred)
          : getBuddyEmail(fallback),
        name: getBuddyName(preferred) || getBuddyName(fallback),
        display_name:
          preferred.display_name || preferred.name || fallback.display_name || fallback.name,
        avatarUrl: preferredImage || fallbackImage,
        imageUrl: preferredImage || fallbackImage,
        unreadCount: Math.max(getUnreadCount(first), getUnreadCount(second)),
        unread_count: Math.max(getUnreadCount(first), getUnreadCount(second)),
      };
    },
    [getUserMergeScore],
  );

  const uniqueUsersByIdentity = useCallback(
    (users: ChatRecord[] = []): ChatRecord[] => {
      const usersByKey = new Map<string, ChatRecord>();

      users.forEach((user: ChatRecord) => {
        const key = getUserIdentityKey(user);
        if (!key || key === "id:") return;
        usersByKey.set(key, mergeUserRecords(usersByKey.get(key), user));
      });

      return Array.from(usersByKey.values());
    },
    [getUserIdentityKey, mergeUserRecords],
  );

  const isSelfConversation = useCallback(
    (conversation: ChatRecord) => {
      const participants = Array.isArray(conversation?.participants)
        ? conversation.participants
        : [];
      const isDirect =
        conversation?.isDirect ||
        conversation?.type === "direct" ||
        conversation?.conversationType === "direct";

      if (!isDirect) return false;
      if (participants.length > 0) {
        return participants.every((participant: ChatRecord) => isCurrentUserRecord(participant));
      }

      const title = String(
        conversation?.title || conversation?.name || conversation?.display_name || "",
      ).toLowerCase();

      return Boolean(
        title === "myself" ||
        title === "me" ||
        title === String(currentUser?.name || "").toLowerCase() ||
        (currentUserEmail && title === currentUserEmail),
      );
    },
    [currentUser?.name, currentUserEmail, isCurrentUserRecord],
  );

  const activeConversationId = getConversationId(selectedChat);

  const visibleBuddies = useMemo(() => {
    const getUserIds = (user: ChatRecord) =>
      [user?.id, user?.userId, user?.user_id, user?.appUserId, user?.app_user_id]
        .filter(Boolean)
        .map(String);
    const directParticipants = channels
      .filter(
        (conversation: ChatRecord) =>
          !isSelfConversation(conversation) &&
          hasConversationHistory(conversation) &&
          (conversation?.isDirect ||
            String(conversation?.type || "").toLowerCase() === "direct" ||
            String(conversation?.conversationType || "").toLowerCase() === "direct"),
      )
      .flatMap((conversation) =>
        Array.isArray(conversation?.participants) ? conversation.participants : [],
      );
    const hasPreviousDirectConversation = (buddy: ChatRecord) => {
      const buddyIds = getUserIds(buddy);
      const buddyEmail = String(getBuddyEmail(buddy) || "").toLowerCase();
      return directParticipants.some(
        (participant: ChatRecord) =>
          getUserIds(participant).some((participantId) => buddyIds.includes(participantId)) ||
          (buddyEmail && String(getBuddyEmail(participant)).toLowerCase() === buddyEmail),
      );
    };

    return uniqueUsersByIdentity(
      buddies.filter(
        (buddy: ChatRecord) => !isCurrentUserRecord(buddy) && hasPreviousDirectConversation(buddy),
      ),
    );
  }, [buddies, channels, isCurrentUserRecord, isSelfConversation, uniqueUsersByIdentity]);
  const allVisibleBuddies = useMemo(
    () =>
      uniqueUsersByIdentity([
        ...buddies.filter((buddy) => !isCurrentUserRecord(buddy)),
        ...managedUsers.filter((user) => !isCurrentUserRecord(user)),
      ]),
    [buddies, isCurrentUserRecord, managedUsers, uniqueUsersByIdentity],
  );
  const visibleChannels = useMemo(
    () => channels.filter((channel) => !isSelfConversation(channel)),
    [channels, isSelfConversation],
  );
  const visibleGroupChannels = useMemo(
    () =>
      visibleChannels.filter(
        (channel) =>
          !channel?.isDirect &&
          String(channel?.type || "").toLowerCase() !== "direct" &&
          String(channel?.conversationType || "").toLowerCase() !== "direct",
      ),
    [visibleChannels],
  );
  const visibleDirectChannels = useMemo(
    () =>
      visibleChannels.filter(
        (channel) =>
          channel?.isDirect ||
          String(channel?.type || "").toLowerCase() === "direct" ||
          String(channel?.conversationType || "").toLowerCase() === "direct",
      ),
    [visibleChannels],
  );
  const conversationItems = useMemo(() => {
    return buildConversationItems({
      allVisibleBuddies,
      visibleBuddies,
      visibleDirectChannels,
      visibleGroupChannels,
      searchTerm,
      selectedChat,
      messagesByChat,
      currentUser,
      currentUserEmail,
      isCurrentUserRecord,
      getUnreadCount,
    });
  }, [
    allVisibleBuddies,
    currentUser,
    currentUserEmail,
    isCurrentUserRecord,
    messagesByChat,
    searchTerm,
    selectedChat,
    visibleBuddies,
    visibleDirectChannels,
    visibleGroupChannels,
  ]);

  const totalUnreadCount = useMemo(() => {
    const countsByConversation = new Map();

    conversationItems.forEach((item) => {
      const conversationKey =
        item?.directConversationId ||
        item?.chat_id ||
        item?.chatId ||
        getChannelId(item) ||
        getBuddySendId(item) ||
        getBuddyEmail(item);

      if (!conversationKey) return;

      const key = String(conversationKey);
      countsByConversation.set(
        key,
        Math.max(countsByConversation.get(key) || 0, getUnreadCount(item)),
      );
    });

    return Array.from(countsByConversation.values()).reduce((total, count) => total + count, 0);
  }, [conversationItems]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("chat:unread-count", { detail: totalUnreadCount }));
  }, [totalUnreadCount]);

  return {
    allVisibleBuddies,
    activeConversationId,
    conversationItems,
    isCurrentUserRecord,
    isSelfConversation,
    uniqueUsersByIdentity,
    visibleBuddies,
    visibleChannels,
    visibleDirectChannels,
    visibleGroupChannels,
  };
}
