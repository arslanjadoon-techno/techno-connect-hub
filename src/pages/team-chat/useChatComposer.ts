import { useRef, useState, type ChangeEvent, type SetStateAction } from "react";
import { parseChatDate } from "./chatHealper";

export function useChatComposer() {
  const [inputValue, setInputValue] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [editingSaving, setEditingSaving] = useState(false);
  const [sendError, setSendError] = useState("");
  const inputValueRef = useRef("");
  const pendingFilesRef = useRef<File[]>([]);

  // Keep the refs in sync synchronously. A second click can otherwise run
  // against the previous render before React commits the cleared composer.
  const setComposerInputValue = (value: SetStateAction<string>) => {
    if (typeof value === "function") {
      inputValueRef.current = value(inputValueRef.current);
      setInputValue(value);
      return;
    }

    inputValueRef.current = value;
    setInputValue(value);
  };

  const setComposerPendingFiles = (value: SetStateAction<File[]>) => {
    if (typeof value === "function") {
      pendingFilesRef.current = value(pendingFilesRef.current);
      setPendingFiles(value);
      return;
    }

    pendingFilesRef.current = value;
    setPendingFiles(value);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>, selectedChat: any) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || !selectedChat) return;
    setComposerPendingFiles((previous) => [...previous, ...files]);
    setSendError("");
  };

  const removePendingFile = (fileIndex: number) => {
    setComposerPendingFiles((previous) => previous.filter((_, index) => index !== fileIndex));
  };

  const handleVoiceMessage = (file: File, selectedChat: any) => {
    if (!file || !selectedChat) return;
    setComposerPendingFiles((previous) => [...previous, file]);
    setSendError("");
  };

  const handleReplyToMessage = (message: any) => {
    setEditingMessage(null);
    setReplyToMessage(message);
    setSendError("");
  };

  const handleEditMessage = (message: any) => {
    if (message?.direction !== "outbound") return;
    const messageAge =
      Date.now() -
      parseChatDate(message.sentAt || message.createdAt || message.created_at).getTime();
    if (!Number.isFinite(messageAge) || messageAge < 0 || messageAge > 10 * 60 * 1000) {
      setSendError("Messages can only be edited within 10 minutes.");
      return;
    }
    setReplyToMessage(null);
    setEditingMessage(message);
    setComposerPendingFiles([]);
    setSendError("");
    setComposerInputValue(message.text || "");
  };

  const handleCancelComposerMode = () => {
    setReplyToMessage(null);
    setEditingMessage(null);
    setComposerInputValue("");
  };

  return {
    inputValue,
    setInputValue: setComposerInputValue,
    inputValueRef,
    replyToMessage,
    setReplyToMessage,
    editingMessage,
    setEditingMessage,
    pendingFiles,
    setPendingFiles: setComposerPendingFiles,
    pendingFilesRef,
    editingSaving,
    setEditingSaving,
    sendError,
    setSendError,
    handleFileUpload,
    removePendingFile,
    handleVoiceMessage,
    handleReplyToMessage,
    handleEditMessage,
    handleCancelComposerMode,
  };
}
