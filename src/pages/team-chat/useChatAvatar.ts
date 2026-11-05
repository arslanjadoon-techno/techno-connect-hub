import { updateChatAvatarService } from "@/services/Team-chat/chat.service";
import { getImageUrl, normalizeChatError } from "./chatHealper";

export function useChatAvatar({
  avatarUploading,
  profileUser,
  setAvatarUploading,
  setLoadError,
  setProfileUser,
}: any) {
  const handleAvatarUpload = async (file: File) => {
    if (!file || avatarUploading) return;
    setAvatarUploading(true);
    setLoadError("");
    const localPreviewUrl = URL.createObjectURL(file);
    const previousAvatarUrl = getImageUrl(profileUser);
    setProfileUser((prev: any) => ({
      ...(prev || {}),
      avatarUrl: localPreviewUrl,
      imageUrl: localPreviewUrl,
    }));
    const applyUpdatedUser = (updatedUser: any) => {
      const nextAvatarUrl = getImageUrl(updatedUser);
      if (!nextAvatarUrl) {
        throw new Error("Profile picture was uploaded but no display URL was returned.");
      }
      setProfileUser((prev: any) => {
        const nextUser = {
          ...(prev || {}),
          ...(updatedUser || {}),
          avatarUrl: nextAvatarUrl,
          imageUrl: nextAvatarUrl,
        };
        localStorage.setItem("user", JSON.stringify(nextUser));
        return nextUser;
      });
    };
    try {
      const response: any = await updateChatAvatarService(file);
      applyUpdatedUser(
        response?.data?.data?.user || response?.data?.data || response?.data || response,
      );
    } catch (error) {
      setProfileUser((prev: any) => ({
        ...(prev || {}),
        avatarUrl: previousAvatarUrl,
        imageUrl: previousAvatarUrl,
      }));
      setLoadError(normalizeChatError(error));
    } finally {
      URL.revokeObjectURL(localPreviewUrl);
      setAvatarUploading(false);
    }
  };
  return { handleAvatarUpload };
}
