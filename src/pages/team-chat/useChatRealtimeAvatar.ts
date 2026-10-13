import { useCallback } from "react";
import { getBuddySendId, getImageUrl } from "./chatHealper";

export function useChatRealtimeAvatar({ currentUserId, setBuddies, setProfileUser }: any) {
  return useCallback(
    ({ userId, avatarUrl, user }: any) => {
      if (!userId) return;
      const nextAvatarUrl = avatarUrl || getImageUrl(user);

      setBuddies((previous: any[]) =>
        previous.map((buddy) =>
          String(getBuddySendId(buddy)) === String(userId)
            ? { ...buddy, ...user, avatarUrl: nextAvatarUrl, imageUrl: nextAvatarUrl }
            : buddy,
        ),
      );

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
    [currentUserId, setBuddies, setProfileUser],
  );
}
