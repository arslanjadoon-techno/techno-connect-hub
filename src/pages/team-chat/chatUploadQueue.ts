import {
  shareConversationFileService,
  type ChatFileUploadOptions,
} from "@/services/Team-chat/chat.service";
import type { PendingChatAttachment } from "./chatMessageIndexedDb";

export const DEFAULT_CHAT_UPLOAD_CONCURRENCY = 3;
const MAX_CHAT_UPLOAD_CONCURRENCY = 6;

const configuredConcurrency = Number(import.meta.env.VITE_CHAT_UPLOAD_CONCURRENCY);
export const CHAT_UPLOAD_CONCURRENCY = Number.isFinite(configuredConcurrency)
  ? Math.min(MAX_CHAT_UPLOAD_CONCURRENCY, Math.max(1, Math.floor(configuredConcurrency)))
  : DEFAULT_CHAT_UPLOAD_CONCURRENCY;

export type ChatUploadFileStatus = "queued" | "uploading" | "completed" | "failed" | "cancelled";

export type ChatUploadFileState = {
  key: string;
  name: string;
  size: number;
  status: ChatUploadFileStatus;
  loaded: number;
  total: number;
  percent: number;
  attachmentId?: string;
  error?: string;
};

export class ChatUploadBatchError extends Error {
  readonly states: ChatUploadFileState[];
  readonly causeError: unknown;

  constructor(message: string, states: ChatUploadFileState[], causeError?: unknown) {
    super(message);
    this.name = "ChatUploadBatchError";
    this.states = states;
    this.causeError = causeError;
  }
}

export class ChatUploadCancelledError extends ChatUploadBatchError {
  constructor(states: ChatUploadFileState[]) {
    super("File upload cancelled.", states);
    this.name = "ChatUploadCancelledError";
  }
}

type UploadOptions = {
  chatId: string | number;
  attachments: PendingChatAttachment[];
  concurrency?: number;
  signal?: AbortSignal;
  onStateChange?: (states: ChatUploadFileState[]) => void;
  onAttachmentUploaded?: (attachmentKey: string, attachmentId: string) => void | Promise<void>;
};

const getAttachmentId = (response: any): string | undefined => {
  const value =
    response?.attachmentId ??
    response?.data?.attachmentId ??
    response?.data?.data?.attachmentId;
  return value == null || String(value).trim() === "" ? undefined : String(value);
};

const errorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "File upload failed.";

const isAbortError = (error: unknown) =>
  error instanceof Error && (error.name === "AbortError" || error.name === "CanceledError");

export const uploadChatAttachments = async ({
  chatId,
  attachments,
  concurrency = CHAT_UPLOAD_CONCURRENCY,
  signal,
  onStateChange,
  onAttachmentUploaded,
}: UploadOptions): Promise<{ attachmentIds: string[]; states: ChatUploadFileState[] }> => {
  const states = new Map<string, ChatUploadFileState>();
  attachments.forEach((attachment) => {
    const hasExistingId = Boolean(attachment.attachmentId);
    states.set(attachment.key, {
      key: attachment.key,
      name: attachment.name,
      size: attachment.size,
      status: hasExistingId ? "completed" : "queued",
      loaded: hasExistingId ? attachment.size : 0,
      total: attachment.size,
      percent: hasExistingId ? 100 : 0,
      attachmentId: attachment.attachmentId,
    });
  });

  const emit = () => onStateChange?.(attachments.map((attachment) => states.get(attachment.key)!));
  emit();

  const pending = attachments.filter((attachment) => !attachment.attachmentId);
  if (!pending.length) {
    return { attachmentIds: attachments.map((attachment) => attachment.attachmentId!), states: [...states.values()] };
  }

  const workerCount = Math.min(
    pending.length,
    Math.min(MAX_CHAT_UPLOAD_CONCURRENCY, Math.max(1, Math.floor(concurrency))),
  );
  let nextIndex = 0;
  let firstFailure: unknown;

  const update = (key: string, updateState: Partial<ChatUploadFileState>) => {
    const current = states.get(key);
    if (!current) return;
    states.set(key, { ...current, ...updateState });
    emit();
  };

  const uploadOne = async (attachment: PendingChatAttachment) => {
    update(attachment.key, { status: "uploading", loaded: 0, percent: 0, error: undefined });
    const uploadOptions: ChatFileUploadOptions = {
      signal,
      onProgress: (loaded, total) => {
        const safeTotal = total || attachment.size || 1;
        update(attachment.key, {
          loaded,
          total: total || attachment.size,
          percent: Math.min(100, Math.round((loaded / safeTotal) * 100)),
        });
      },
    };

    try {
      const response = await shareConversationFileService(
        chatId,
        new File([attachment.blob], attachment.name, {
          type: attachment.type,
          lastModified: attachment.lastModified,
        }),
        uploadOptions,
      );
      const attachmentId = getAttachmentId(response);
      if (!attachmentId) throw new Error("The attachment could not be uploaded.");

      await onAttachmentUploaded?.(attachment.key, attachmentId);
      update(attachment.key, {
        status: "completed",
        loaded: attachment.size,
        total: attachment.size,
        percent: 100,
        attachmentId,
      });
    } catch (error) {
      const cancelled = signal?.aborted || isAbortError(error);
      update(attachment.key, {
        status: cancelled ? "cancelled" : "failed",
        error: cancelled ? "Upload cancelled." : errorMessage(error),
      });
      if (!cancelled && firstFailure === undefined) firstFailure = error;
    }
  };

  const worker = async () => {
    while (true) {
      if (signal?.aborted || firstFailure !== undefined) return;
      const index = nextIndex++;
      if (index >= pending.length) return;
      await uploadOne(pending[index]);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));

  const finalStates = attachments.map((attachment) => states.get(attachment.key)!);
  if (signal?.aborted) {
    finalStates.forEach((state) => {
      if (state.status === "queued" || state.status === "uploading") {
        update(state.key, { status: "cancelled", error: "Upload cancelled." });
      }
    });
    throw new ChatUploadCancelledError(attachments.map((attachment) => states.get(attachment.key)!));
  }

  if (firstFailure !== undefined) {
    finalStates.forEach((state) => {
      if (state.status === "queued") {
        update(state.key, { status: "failed", error: "Not uploaded because another file failed." });
      }
    });
    throw new ChatUploadBatchError(
      "One or more files could not be uploaded.",
      attachments.map((attachment) => states.get(attachment.key)!),
      firstFailure,
    );
  }

  return {
    attachmentIds: attachments
      .map((attachment) => states.get(attachment.key)?.attachmentId)
      .filter((attachmentId): attachmentId is string => Boolean(attachmentId)),
    states: attachments.map((attachment) => states.get(attachment.key)!),
  };
};
