import { useCallback } from "react";
import { getBuddyEmail, getBuddySendId, normalizePresence } from "./chatHealper";

export function useChatRealtimePresence({
  currentUserId,
  setCurrentStatus,
  setProfileUser,
  setBuddies,
  setChannels,
  setSelectedChat,
}: any) {
  return useCallback(
    ({ userId, presence, preferredStatus, preferred_status, lastSeenAt, last_seen_at, user }: any) => {
      if (!userId) return;
      const nextPresence = normalizePresence(presence || user?.presence || user?.status);
      let storedPreference = "";
      if (String(userId) === String(currentUserId) && nextPresence === "offline") {
        try {
          storedPreference = localStorage.getItem("chat_presence") || "";
        } catch {
          storedPreference = "";
        }
      }
      const nextPreferredStatus = normalizePresence(
        preferredStatus ||
          preferred_status ||
          user?.preferredStatus ||
          user?.preferred_status ||
          (nextPresence === "offline" ? storedPreference : nextPresence),
      );
      const selectedStatus = nextPresence === "offline" ? nextPreferredStatus : nextPresence;
      const eventEmail = String(
        user?.email || user?.email_id || user?.mailid || user?.providerEmail || "",
      )
        .trim()
        .toLowerCase();
      const matchesUser = (record: any) => {
        const recordId = String(getBuddySendId(record) || "");
        if (recordId && recordId === String(userId)) return true;
        if (!eventEmail) return false;
        const recordEmail = String(
          record?.email ||
            record?.email_id ||
            record?.mailid ||
            record?.providerEmail ||
            record?.provider_email ||
            "",
        )
          .trim()
          .toLowerCase();
        return Boolean(recordEmail && recordEmail === eventEmail);
      };
      const presencePatch = {
        ...(user || {}),
        presence: nextPresence,
        preferredStatus: nextPreferredStatus,
        preferred_status: nextPreferredStatus,
        status: nextPresence,
        ...(lastSeenAt || last_seen_at
          ? { lastSeenAt: lastSeenAt || last_seen_at, last_seen_at: lastSeenAt || last_seen_at }
          : {}),
      };

      if (String(userId) === String(currentUserId)) {
        setCurrentStatus(selectedStatus);
        setProfileUser((previous: any) => ({
          ...(previous || {}),
          ...(user || {}),
          presence: nextPresence,
          preferredStatus: nextPreferredStatus,
          status: selectedStatus,
          ...(lastSeenAt || last_seen_at
            ? { lastSeenAt: lastSeenAt || last_seen_at, last_seen_at: lastSeenAt || last_seen_at }
            : {}),
        }));
        localStorage.setItem("chat_presence", selectedStatus);
      }

      setBuddies((previous: any[]) =>
        previous.map((buddy) =>
          matchesUser(buddy) ? { ...buddy, ...presencePatch } : buddy,
        ),
      );

      // Some direct conversations are rendered from the conversation endpoint
      // instead of the contacts endpoint. Keep those participants and last
      // message senders in sync as well, especially for group member presence.
      setChannels((previous: any[]) =>
        previous.map((conversation) => ({
          ...conversation,
          ...(Array.isArray(conversation?.participants)
            ? {
                participants: conversation.participants.map((participant: any) =>
                  matchesUser(participant) ? { ...participant, ...presencePatch } : participant,
                ),
              }
            : {}),
          ...(conversation?.lastMessage?.sender && matchesUser(conversation.lastMessage.sender)
            ? {
                lastMessage: {
                  ...conversation.lastMessage,
                  sender: { ...conversation.lastMessage.sender, ...presencePatch },
                },
              }
            : {}),
          ...(conversation?.last_message?.sender && matchesUser(conversation.last_message.sender)
            ? {
                last_message: {
                  ...conversation.last_message,
                  sender: { ...conversation.last_message.sender, ...presencePatch },
                },
              }
            : {}),
        })),
      );

      setSelectedChat((previous: any) => {
        if (!previous || previous.type === "channel") return previous;
        const selectedUserId = String(getBuddySendId(previous.raw) || previous.id || "");
        const selectedEmail = String(
          getBuddyEmail(previous.raw) || previous.subtitle || "",
        ).toLowerCase();
        const eventEmail = String(
          user?.email || user?.email_id || user?.mailid || "",
        ).toLowerCase();
        if (selectedUserId !== String(userId) && (!eventEmail || selectedEmail !== eventEmail))
          return previous;
        return {
          ...previous,
          raw: {
            ...(previous.raw || {}),
            ...(user || {}),
            presence: nextPresence,
            preferredStatus: nextPreferredStatus,
            status: selectedStatus,
            ...(lastSeenAt || last_seen_at
              ? { lastSeenAt: lastSeenAt || last_seen_at, last_seen_at: lastSeenAt || last_seen_at }
              : {}),
          },
        };
      });
    },
    [currentUserId, setBuddies, setChannels, setCurrentStatus, setProfileUser, setSelectedChat],
  );
}
