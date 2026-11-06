import { useCallback } from "react";
import { getBuddySendId, getImageUrl } from "./chatHealper";

export function useChatRealtimeAvatar({
  currentUserId,
  setBuddies,
  setChannels,
  setMessagesByChat,
  setProfileUser,
  setSelectedChat,
}: any) {
  return useCallback(
    ({ userId, user, profileImage, profile_image, avatarUrl, imageUrl }: any) => {
      if (!userId) return;

      // User Management broadcasts only the resolved profile fields. Older
      // deployments may still send a complete user object, so accept both
      // shapes while keeping User Management as the source of truth.
      const profile = user || {
        id: userId,
        profileImage: profileImage ?? profile_image ?? avatarUrl ?? imageUrl ?? null,
      };
      const nextAvatarUrl = getImageUrl(profile);
      const avatarFields = {
        profileImage: nextAvatarUrl || null,
        avatarUrl: nextAvatarUrl,
        imageUrl: nextAvatarUrl,
      };
      const matchesUser = (record: any) =>
        String(getBuddySendId(record) || "") === String(userId);
      const mergeAvatar = (record: any) => ({
        ...(record || {}),
        ...(profile || {}),
        ...avatarFields,
      });

      setBuddies((previous: any[]) =>
        previous.map((buddy) =>
          matchesUser(buddy) ? mergeAvatar(buddy) : buddy,
        ),
      );

      setChannels((previous: any[]) =>
        previous.map((channel) => {
          if (!Array.isArray(channel?.participants)) return channel;
          let changed = false;
          const participants = channel.participants.map((participant: any) => {
            if (!matchesUser(participant)) return participant;
            changed = true;
            return mergeAvatar(participant);
          });
          return changed ? { ...channel, participants } : channel;
        }),
      );

      setSelectedChat((previous: any) => {
        if (!previous) return previous;
        const selectedMatches = matchesUser(previous) || matchesUser(previous.raw);
        const raw = previous.raw && matchesUser(previous.raw)
          ? mergeAvatar(previous.raw)
          : previous.raw;
        const participants = Array.isArray(previous.participants)
          ? previous.participants.map((participant: any) =>
              matchesUser(participant) ? mergeAvatar(participant) : participant,
            )
          : previous.participants;
        const participantsChanged =
          Array.isArray(previous.participants) && participants.some((item: any, index: number) =>
            item !== previous.participants[index],
          );

        if (!selectedMatches && !participantsChanged) return previous;
        return {
          ...previous,
          ...(selectedMatches ? avatarFields : {}),
          ...(raw ? { raw } : {}),
          ...(participantsChanged ? { participants } : {}),
        };
      });

      setMessagesByChat((previous: Record<string, any[]>) => {
        const next = { ...previous };
        Object.entries(previous).forEach(([chatKey, messages]) => {
          next[chatKey] = messages.map((message: any) => {
            const sender = message?.sender;
            const senderMatches = matchesUser(sender) ||
              String(message?.authorId || message?.author_id || message?.senderId || "") ===
                String(userId);
            return senderMatches
              ? {
                  ...message,
                  authorAvatarUrl: nextAvatarUrl,
                  ...(sender ? { sender: mergeAvatar(sender) } : {}),
                }
              : message;
          });
        });
        return next;
      });

      if (String(userId) === String(currentUserId)) {
        setProfileUser((previous: any) => {
          const nextUser = {
            ...(previous || {}),
            ...(user || {}),
            avatarUrl: nextAvatarUrl,
            imageUrl: nextAvatarUrl,
          };
          localStorage.setItem("user", JSON.stringify(nextUser));
          return nextUser;
        });
      }
    },
    [currentUserId, setBuddies, setChannels, setMessagesByChat, setProfileUser, setSelectedChat],
  );
}
