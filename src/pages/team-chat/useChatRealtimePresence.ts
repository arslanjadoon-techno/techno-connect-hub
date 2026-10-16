import { useCallback } from "react";
import { getBuddyEmail, getBuddySendId, normalizePresence } from "./chatHealper";

export function useChatRealtimePresence({
  currentUserId,
  setCurrentStatus,
  setProfileUser,
  setBuddies,
  setSelectedChat,
}: any) {
  return useCallback(
    ({ userId, presence, user }: any) => {
      if (!userId) return;
      const nextPresence = normalizePresence(presence || user?.presence || user?.status);

      if (String(userId) === String(currentUserId)) {
        setCurrentStatus(nextPresence);
        setProfileUser((previous: any) => ({
          ...(previous || {}),
          ...(user || {}),
          presence: nextPresence,
          status: nextPresence,
        }));
        localStorage.setItem("chat_presence", nextPresence);
      }

      setBuddies((previous: any[]) =>
        previous.map((buddy) =>
          String(getBuddySendId(buddy)) === String(userId)
            ? { ...buddy, ...user, presence: nextPresence, status: nextPresence }
            : buddy,
        ),
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
            status: nextPresence,
          },
        };
      });
    },
    [currentUserId, setBuddies, setCurrentStatus, setProfileUser, setSelectedChat],
  );
}
