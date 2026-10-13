import { useRef, useState, type ChangeEvent } from "react";
import { updateChatSettingsService } from "@/services/Team-chat/chat.service";

export function useChatComposer() {
  const [inputValue, setInputValue] = useState("");
  const [enterToSend, setEnterToSend] = useState(
    () => localStorage.getItem("chat_enter_to_send") === "true",
  );
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState("");
  const sendClickLockRef = useRef(false);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>, selectedChat: any) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || !selectedChat || uploading || sending) return;
    setPendingFiles((previous) => [...previous, ...files]);
    setSendError("");
  };

  const removePendingFile = (fileIndex: number) => {
    setPendingFiles((previous) => previous.filter((_, index) => index !== fileIndex));
  };

  const handleVoiceMessage = (file: File, selectedChat: any) => {
    if (!file || !selectedChat) return;
    setPendingFiles((previous) => [...previous, file]);
    setSendError("");
  };

  const handleEnterToSendChange = (enabled: boolean) => {
    setEnterToSend(enabled);
    localStorage.setItem("chat_enter_to_send", String(enabled));
    updateChatSettingsService({ enterToSend: enabled }).catch(() => {
      setSendError("Enter-to-send setting could not be saved.");
    });
  };

  const handleReplyToMessage = (message: any) => {
    setEditingMessage(null);
    setReplyToMessage(message);
  };

  const handleEditMessage = (message: any) => {
    if (message?.direction !== "outbound") return;
    const messageAge = Date.now() - new Date(message.sentAt).getTime();
    if (!Number.isFinite(messageAge) || messageAge < 0 || messageAge > 10 * 60 * 1000) {
      setSendError("Messages can only be edited within 10 minutes.");
      return;
    }
    setReplyToMessage(null);
    setEditingMessage(message);
    setInputValue(message.text || "");
  };

  const handleCancelComposerMode = () => {
    setReplyToMessage(null);
    setEditingMessage(null);
    setInputValue("");
  };

  return {
    inputValue,
    setInputValue,
    enterToSend,
    setEnterToSend,
    replyToMessage,
    setReplyToMessage,
    editingMessage,
    setEditingMessage,
    pendingFiles,
    setPendingFiles,
    sending,
    setSending,
    uploading,
    setUploading,
    sendError,
    setSendError,
    sendClickLockRef,
    handleFileUpload,
    removePendingFile,
    handleVoiceMessage,
    handleEnterToSendChange,
    handleReplyToMessage,
    handleEditMessage,
    handleCancelComposerMode,
  };
}
