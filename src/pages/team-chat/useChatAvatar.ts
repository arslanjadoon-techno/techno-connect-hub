import {
  updateChatAvatarService,
  updateChatAvatarUrlService,
} from "@/services/Team-chat/chat.service";
import { getImageUrl, normalizeChatError } from "./chatHealper";

export function useChatAvatar({
  avatarUploading,
  setAvatarUploading,
  setLoadError,
  setProfileUser,
}: any) {
  const handleAvatarUpload = async (file: File) => {
    if (!file || avatarUploading) return;
    setAvatarUploading(true);
    setLoadError("");
    const localPreviewUrl = URL.createObjectURL(file);
    setProfileUser((prev: any) => ({
      ...(prev || {}),
      avatarUrl: localPreviewUrl,
      imageUrl: localPreviewUrl,
    }));
    const applyUpdatedUser = (updatedUser: any, fallbackUrl: string) => {
      const nextAvatarUrl = getImageUrl(updatedUser) || fallbackUrl;
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
        localPreviewUrl,
      );
    } catch (error) {
      if (file.size <= 350_000) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const response: any = await updateChatAvatarUrlService(dataUrl);
          applyUpdatedUser(
            response?.data?.data?.user || response?.data?.data || response?.data || response,
            localPreviewUrl,
          );
          setLoadError("");
        } catch (fallbackError) {
          setLoadError(normalizeChatError(fallbackError));
        }
      } else setLoadError(normalizeChatError(error));
    } finally {
      setAvatarUploading(false);
    }
  };
  return { handleAvatarUpload };
}
