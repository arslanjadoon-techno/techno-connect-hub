import {
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getUnreadCount,
  parseChatDate,
} from "./chatHealper";
import { dedupeConversationRecords, getConversationRecordId } from "./chatConversationKeys";

type ChatRecord = Record<string, any>;
type MessageMap = Record<string, ChatRecord[]>;

export type ConversationIndexes = {
  buddyByIdentity: ReadonlyMap<string, ChatRecord>;
  buddyOrderByIdentity: ReadonlyMap<string, number>;
  directConversationByIdentity: ReadonlyMap<string, ChatRecord>;
  latestMessageByChatKey: ReadonlyMap<string, ChatRecord>;
  peerByConversation: ReadonlyMap<ChatRecord, ChatRecord>;
};

const GENERIC_NAME = /^(chat\s*user|chatuser)$/i;

export const getConversationIdentityValues = (item: ChatRecord) =>
  [
    getBuddySendId(item),
    getBuddyEmail(item),
    item?.appUserId,
    item?.app_user_id,
    item?.userId,
    item?.user_id,
    item?.email,
    item?.email_id,
    item?.providerEmail,
    item?.provider_email,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

export function buildConversationIndexes({
  allVisibleBuddies,
  messagesByChat,
  isCurrentUserRecord,
  visibleDirectChannels,
}: {
  allVisibleBuddies: ChatRecord[];
  messagesByChat: MessageMap;
  isCurrentUserRecord: (item: ChatRecord) => boolean;
  visibleDirectChannels: ChatRecord[];
}): ConversationIndexes {
  const buddyByIdentity = new Map<string, ChatRecord>();
  const buddyOrderByIdentity = new Map<string, number>();
  allVisibleBuddies.forEach((buddy, index) => {
    getConversationIdentityValues(buddy).forEach((value) => {
      if (!buddyByIdentity.has(value)) {
        buddyByIdentity.set(value, buddy);
        buddyOrderByIdentity.set(value, index);
      }
    });
  });

  const directConversationByIdentity = new Map<string, ChatRecord>();
  const peerByConversation = new Map<ChatRecord, ChatRecord>();
  visibleDirectChannels.forEach((channel) => {
    const participants = Array.isArray(channel?.participants) ? channel.participants : [];
    const peer = participants.find((participant: ChatRecord) => !isCurrentUserRecord(participant));
    if (peer) peerByConversation.set(channel, peer);
    participants.forEach((participant: ChatRecord) => {
      if (isCurrentUserRecord(participant)) return;
      getConversationIdentityValues(participant).forEach((value) => {
        if (!directConversationByIdentity.has(value)) {
          directConversationByIdentity.set(value, channel);
        }
      });
    });
  });

  const latestMessageByChatKey = new Map<string, ChatRecord>();
  const setLatestMessage = (key: string, message: ChatRecord) => {
    const current = latestMessageByChatKey.get(key);
    if (!current || messageTime(message) > messageTime(current)) {
      latestMessageByChatKey.set(key, message);
    }
  };
  Object.entries(messagesByChat).forEach(([key, messages]) => {
    const normalizedKey = key.toLowerCase();
    (Array.isArray(messages) ? messages : []).forEach((message) => {
      setLatestMessage(key, message);
      if (normalizedKey !== key) setLatestMessage(normalizedKey, message);
    });
  });

  return {
    buddyByIdentity,
    buddyOrderByIdentity,
    directConversationByIdentity,
    latestMessageByChatKey,
    peerByConversation,
  };
}

const conversationId = (conversation: ChatRecord | null | undefined) =>
  getConversationRecordId(conversation);

const messageTime = (message: ChatRecord | null | undefined) => {
  const value =
    message?.createdAt ||
    message?.created_at ||
    message?.sentAt ||
    message?.sent_at ||
    message?.timestamp ||
    message?.time;
  if (value == null || value === "") return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = parseChatDate(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const activityTime = (conversation: ChatRecord | null | undefined) => {
  const value =
    conversation?.lastMessage?.createdAt ||
    conversation?.lastMessage?.created_at ||
    conversation?.last_message?.createdAt ||
    conversation?.last_message?.created_at ||
    conversation?.lastMessageAt ||
    conversation?.last_message_at ||
    conversation?.lastMessageTime ||
    conversation?.last_message_time ||
    conversation?.lastMessage?.sentAt ||
    conversation?.lastMessage?.sent_at ||
    conversation?.lastMessage?.timestamp ||
    conversation?.last_message?.sentAt ||
    conversation?.last_message?.sent_at ||
    conversation?.last_message?.timestamp ||
    conversation?.updatedAt ||
    conversation?.updated_at;

  if (value == null || value === "") return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = parseChatDate(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDirectRow = ({
  buddy,
  conversation,
  isCurrentUserRecord,
  getUnreadCount: unread,
  conversationIndexes,
}: {
  buddy: ChatRecord;
  conversation?: ChatRecord;
  isCurrentUserRecord: (item: ChatRecord) => boolean;
  getUnreadCount: (item: ChatRecord) => number;
  conversationIndexes: ConversationIndexes;
}): ChatRecord => {
  const directId = conversationId(conversation) || buddy?.directConversationId || buddy?.chatId;
  const cacheKeys = Array.from(
    new Set(
      [
        directId,
        buddy?.directConversationId,
        buddy?.chatId,
        buddy?.chat_id,
        getBuddySendId(buddy),
        buddy?.id,
      ]
        .filter(Boolean)
        .map(String),
    ),
  );
  const storedLastMessages = [
    conversation?.lastMessage,
    conversation?.last_message,
    buddy?.lastMessage,
    buddy?.last_message,
  ].filter(Boolean);
  const cachedLastMessage = cacheKeys.reduce<ChatRecord | undefined>((latest, key) => {
    const candidate =
      conversationIndexes.latestMessageByChatKey.get(key) ||
      conversationIndexes.latestMessageByChatKey.get(key.toLowerCase());
    if (!candidate || (latest && messageTime(latest) >= messageTime(candidate))) return latest;
    return candidate;
  }, undefined);
  const latestMessage = [...storedLastMessages, cachedLastMessage]
    .filter(Boolean)
    .sort((first, second) => messageTime(second) - messageTime(first))[0];
  const peer =
    (conversation ? conversationIndexes.peerByConversation.get(conversation) : undefined) ||
    (conversation?.participants as ChatRecord[] | undefined)?.find(
      (participant: ChatRecord) => !isCurrentUserRecord(participant),
    );
  const sender = conversation?.lastMessage?.sender || conversation?.last_message?.sender;
  const displayName =
    [peer, sender, buddy]
      .map((candidate) => getBuddyName(candidate))
      .find((name) => name && !GENERIC_NAME.test(name)) || getBuddyName(buddy);

  return {
    ...(conversation || {}),
    ...buddy,
    id: getBuddySendId(buddy) || getBuddySendId(peer),
    name: displayName,
    display_name: displayName,
    userId: buddy?.userId || buddy?.appUserId || getBuddySendId(buddy) || getBuddySendId(peer),
    user_id: buddy?.user_id || getBuddySendId(buddy) || getBuddySendId(peer),
    // A buddy id is a participant id, not a persisted conversation id. Keep
    // it as the placeholder identity only until the API returns a conversation.
    // Keep a conversation ID already present on the buddy row when the
    // paginated directory result is not joined to the conversation list yet.
    // Falling back to an empty value makes read ACKs use the peer user ID,
    // which the backend correctly rejects as a conversation ID.
    directConversationId: directId || "",
    unreadCount: conversation ? unread(conversation) : unread(buddy),
    lastMessage: latestMessage,
    last_message: latestMessage,
    lastMessageTime:
      latestMessage?.sentAt ||
      latestMessage?.createdAt ||
      latestMessage?.created_at ||
      conversation?.lastMessageAt ||
      buddy?.lastMessageAt,
    lastMessageAt:
      latestMessage?.sentAt ||
      latestMessage?.createdAt ||
      latestMessage?.created_at ||
      conversation?.lastMessageAt ||
      conversation?.last_message_at ||
      buddy?.lastMessageAt ||
      buddy?.last_message_at,
    isDirect: true,
    type: "direct",
    __conversationType: "person",
  };
};

export function buildConversationItems({
  allVisibleBuddies,
  visibleBuddies,
  visibleDirectChannels,
  visibleGroupChannels,
  searchTerm,
  selectedChat,
  messagesByChat,
  conversationIndexes,
  currentUser,
  currentUserEmail,
  isCurrentUserRecord,
  getUnreadCount: unread = getUnreadCount,
}: {
  allVisibleBuddies: ChatRecord[];
  visibleBuddies: ChatRecord[];
  visibleDirectChannels: ChatRecord[];
  visibleGroupChannels: ChatRecord[];
  searchTerm: string;
  selectedChat: ChatRecord | null;
  messagesByChat: MessageMap;
  conversationIndexes?: ConversationIndexes;
  currentUser: ChatRecord | null;
  currentUserEmail: string;
  isCurrentUserRecord: (item: ChatRecord) => boolean;
  getUnreadCount?: (item: ChatRecord) => number;
}): ChatRecord[] {
  const indexes =
    conversationIndexes ||
    buildConversationIndexes({
      allVisibleBuddies,
      isCurrentUserRecord,
      messagesByChat,
      visibleDirectChannels,
    });
  const buddiesForList = searchTerm.trim() ? allVisibleBuddies : visibleBuddies;
  const directRows = buddiesForList.map((buddy) => {
    const conversation = getConversationIdentityValues(buddy)
      .map((value) => indexes.directConversationByIdentity.get(value))
      .find(Boolean);
    return toDirectRow({
      buddy,
      conversation,
      isCurrentUserRecord,
      getUnreadCount: unread,
      conversationIndexes: indexes,
    });
  });

  if (!searchTerm.trim()) {
    visibleDirectChannels.forEach((channel) => {
      const peer =
        indexes.peerByConversation.get(channel) ||
        (channel.participants || []).find(
          (participant: ChatRecord) => !isCurrentUserRecord(participant),
        );
      if (!peer) return;
      const channelConversationId = conversationId(channel);
      const exists = directRows.some(
        (row) => conversationId(row) === channelConversationId && Boolean(channelConversationId),
      );
      if (exists) return;
      const peerValues = getConversationIdentityValues(peer);
      const buddy =
        peerValues
          .map((value) => indexes.buddyByIdentity.get(value))
          .filter((candidate): candidate is ChatRecord => Boolean(candidate))
          .sort(
            (first, second) =>
              (indexes.buddyOrderByIdentity.get(getConversationIdentityValues(first)[0] || "") ??
                Number.MAX_SAFE_INTEGER) -
              (indexes.buddyOrderByIdentity.get(getConversationIdentityValues(second)[0] || "") ??
                Number.MAX_SAFE_INTEGER),
          )[0] || peer;
      directRows.push(
        toDirectRow({
          buddy,
          conversation: channel,
          isCurrentUserRecord,
          getUnreadCount: unread,
          conversationIndexes: indexes,
        }),
      );
    });
  }

  if (selectedChat?.type === "person" && selectedChat?.chatId) {
    const selectedConversationId = String(selectedChat.chatId);
    const selectedUserId = String(getBuddySendId(selectedChat) || "");
    const alreadyListed = directRows.some((row) => {
      const rowConversationId = String(
        row?.directConversationId || row?.chat_id || row?.chatId || "",
      );
      const rowUserId = String(getBuddySendId(row) || "");
      return (
        rowConversationId === selectedConversationId ||
        (selectedUserId && rowUserId === selectedUserId)
      );
    });

    // A selected direct chat can be new and absent from the server list until
    // its first message. Add it only in that case; never invent a current-time
    // activity timestamp, because that changes sidebar order merely by opening it.
    if (!alreadyListed) {
      const selectedLastMessage =
        indexes.latestMessageByChatKey.get(String(selectedChat.id)) ||
        indexes.latestMessageByChatKey.get(String(selectedChat.id).toLowerCase()) ||
        selectedChat.lastMessage ||
        selectedChat.last_message;
      const selectedLastMessageAt =
        selectedLastMessage?.sentAt ||
        selectedLastMessage?.createdAt ||
        selectedLastMessage?.created_at ||
        selectedChat.lastMessageAt ||
        selectedChat.last_message_at ||
        selectedChat.raw?.lastMessageAt ||
        selectedChat.raw?.last_message_at ||
        "";

      directRows.push({
        ...selectedChat.raw,
        ...selectedChat,
        id: selectedChat.id,
        directConversationId: selectedChat.chatId,
        type: "direct",
        isDirect: true,
        lastMessage: selectedLastMessage,
        last_message: selectedLastMessage,
        lastMessageAt: selectedLastMessageAt,
        last_message_at: selectedLastMessageAt,
        __conversationType: "person",
      });
    }
  }

  const items: ChatRecord[] = [
    ...directRows,
    ...visibleGroupChannels.map((channel) => ({ ...channel, __conversationType: "channel" })),
  ];
  const currentName = String(
    currentUser?.name || currentUser?.displayName || currentUser?.display_name || "",
  )
    .trim()
    .toLowerCase();
  const currentEmail = String(currentUserEmail || "")
    .trim()
    .toLowerCase();
  const filtered = items.filter((item) => {
    if (item.__conversationType === "channel") return true;
    if (isCurrentUserRecord(item)) return false;
    const itemName = String(getBuddyName(item) || "")
      .trim()
      .toLowerCase();
    const itemEmail = String(getBuddyEmail(item) || "")
      .trim()
      .toLowerCase();
    return (
      !(currentName && itemName === currentName) && !(currentEmail && itemEmail === currentEmail)
    );
  });

  const unique = dedupeConversationRecords(filtered);

  return unique
    .map((item, index) => ({ item, index }))
    .sort(
      (first, second) =>
        activityTime(second.item) - activityTime(first.item) || first.index - second.index,
    )
    .map(({ item }) => item);
}
