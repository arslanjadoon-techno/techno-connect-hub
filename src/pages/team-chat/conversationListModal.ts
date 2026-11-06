import {
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getImageUrl,
  getUnreadCount,
} from "./chatHealper";

type ChatRecord = Record<string, any>;
type MessageMap = Record<string, ChatRecord[]>;

const GENERIC_NAME = /^(chat\s*user|chatuser)$/i;

const valuesFor = (item: ChatRecord) =>
  [
    getBuddySendId(item),
    getBuddyEmail(item),
    getBuddyName(item),
    item?.id,
    item?.userId,
    item?.user_id,
    item?.appUserId,
    item?.app_user_id,
    item?.username,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

const conversationId = (conversation: ChatRecord | null | undefined) =>
  conversation?.chat_id || conversation?.chatId || conversation?.id || "";

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
  const parsed = new Date(value).getTime();
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
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeIdentityText = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/**
 * Direct rows can be assembled from both the contacts endpoint and the
 * conversation endpoint. Those endpoints do not always use the same user-id
 * alias, so an id-only key can render the same person twice. A current profile
 * image plus display name is a stronger cross-endpoint identity than the
 * transport-specific id and also handles legacy rows with different ids.
 */
const directListKey = (item: ChatRecord): string => {
  const name = normalizeIdentityText(getBuddyName(item));
  const image = normalizeIdentityText(getImageUrl(item));
  if (name && name !== "chat user" && image) return `profile:${name}:${image}`;

  const email = normalizeIdentityText(
    item?.email ||
      item?.email_id ||
      item?.provider_email ||
      item?.providerEmail ||
      item?.primary_email ||
      item?.emailid ||
      "",
  );
  if (email) return `email:${email}`;

  const identity = normalizeIdentityText(getBuddySendId(item));
  return identity ? `id:${identity}` : `name:${name}`;
};

const toDirectRow = ({
  buddy,
  conversation,
  isCurrentUserRecord,
  getUnreadCount: unread,
  messagesByChat = {},
}: {
  buddy: ChatRecord;
  conversation?: ChatRecord;
  isCurrentUserRecord: (item: ChatRecord) => boolean;
  getUnreadCount: (item: ChatRecord) => number;
  messagesByChat?: MessageMap;
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
  const cachedMessages = cacheKeys.flatMap((key) => messagesByChat[key] || []);
  const storedLastMessages = [
    conversation?.lastMessage,
    conversation?.last_message,
    buddy?.lastMessage,
    buddy?.last_message,
  ].filter(Boolean);
  const cachedLastMessage = [...cachedMessages].sort(
    (first, second) => messageTime(second) - messageTime(first),
  )[0];
  const latestMessage = [...storedLastMessages, cachedLastMessage]
    .filter(Boolean)
    .sort((first, second) => messageTime(second) - messageTime(first))[0];
  const peer = (conversation?.participants as ChatRecord[] | undefined)?.find(
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
    directConversationId:
      conversationId(conversation) ||
      buddy?.directConversationId ||
      buddy?.chat_id ||
      buddy?.chatId ||
      "",
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
  currentUser: ChatRecord | null;
  currentUserEmail: string;
  isCurrentUserRecord: (item: ChatRecord) => boolean;
  getUnreadCount?: (item: ChatRecord) => number;
}): ChatRecord[] {
  const buddiesForList = searchTerm.trim() ? allVisibleBuddies : visibleBuddies;
  const directRows = buddiesForList.map((buddy) => {
    const buddyValues = valuesFor(buddy);
    const conversation = visibleDirectChannels.find((candidate) =>
      (candidate?.participants || []).some((participant: ChatRecord) =>
        valuesFor(participant).some((value) => buddyValues.includes(value)),
      ),
    );
    return toDirectRow({
      buddy,
      conversation,
      isCurrentUserRecord,
      getUnreadCount: unread,
      messagesByChat,
    });
  });

  if (!searchTerm.trim()) {
    visibleDirectChannels.forEach((channel) => {
      const peer = (channel.participants || []).find(
        (participant: ChatRecord) => !isCurrentUserRecord(participant),
      );
      if (!peer) return;
      const peerValues = valuesFor(peer);
      const exists = directRows.some((row) =>
        valuesFor(row).some((value) => peerValues.includes(value)),
      );
      if (exists) return;
      const buddy =
        allVisibleBuddies.find((candidate) =>
          valuesFor(candidate).some((value) => peerValues.includes(value)),
        ) || peer;
      directRows.push(
        toDirectRow({
          buddy,
          conversation: channel,
          isCurrentUserRecord,
          getUnreadCount: unread,
          messagesByChat,
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
      const selectedMessages = messagesByChat[selectedChat.id] || [];
      const selectedLastMessage =
        selectedMessages[selectedMessages.length - 1] ||
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

  const unique = Array.from(
    new Map(
      filtered.map((item) => [
        item.__conversationType === "channel"
          ? `group:${getChannelId(item)}`
          : `chat:${directListKey(item)}`,
        item,
      ]),
    ).values(),
  );

  return unique
    .map((item, index) => ({ item, index }))
    .sort(
      (first, second) =>
        activityTime(second.item) - activityTime(first.item) || first.index - second.index,
    )
    .map(({ item }) => item);
}
