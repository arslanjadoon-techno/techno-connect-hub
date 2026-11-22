import type { ChatRecord } from "./chatHealper";

type ReceiptStatus = "delivered" | "seen";

type ReceiptState = {
  status: ReceiptStatus;
  updatedAt: number;
};

const receiptStates = new Map<string, ReceiptState>();
const MAX_RECEIPT_STATES = 10_000;

const statusRank = (status: unknown): number => {
  switch (String(status || "").toLowerCase()) {
    case "seen":
    case "read":
      return 2;
    case "delivered":
      return 1;
    default:
      return 0;
  }
};

const normalizeStatus = (status: unknown): ReceiptStatus | null => {
  const value = String(status || "").toLowerCase();
  if (value === "seen" || value === "read") return "seen";
  if (value === "delivered") return "delivered";
  return null;
};

const messageKeys = (message: ChatRecord | null | undefined): string[] =>
  [
    message?.id,
    message?.messageId,
    message?.message_id,
    message?.clientMessageId,
    message?.client_message_id,
    message?.metadata?.clientMessageId,
    message?.metadata?.client_message_id,
  ]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .map((value) => String(value));

export const rememberReceiptStatus = (
  identifiers: Array<string | number | null | undefined>,
  status: unknown,
): void => {
  const normalizedStatus = normalizeStatus(status);
  if (!normalizedStatus) return;

  const updatedAt = Date.now();
  identifiers
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .map((value) => String(value))
    .forEach((key) => {
      const current = receiptStates.get(key);
      if (!current || statusRank(normalizedStatus) >= statusRank(current.status)) {
        receiptStates.set(key, { status: normalizedStatus, updatedAt });
      }
    });

  if (receiptStates.size <= MAX_RECEIPT_STATES) return;

  const oldestKeys = [...receiptStates.entries()]
    .sort((first, second) => first[1].updatedAt - second[1].updatedAt)
    .slice(0, receiptStates.size - MAX_RECEIPT_STATES);
  oldestKeys.forEach(([key]) => receiptStates.delete(key));
};

export const applyRememberedReceiptStatus = <T extends ChatRecord>(message: T): T => {
  const currentStatus = String(message.deliveryStatus || message.sendState || "");
  let remembered: ReceiptStatus | null = null;

  messageKeys(message).forEach((key) => {
    const state = receiptStates.get(key);
    if (!state) return;
    if (!remembered || statusRank(state.status) > statusRank(remembered)) {
      remembered = state.status;
    }
  });

  if (!remembered || statusRank(remembered) <= statusRank(currentStatus)) return message;
  return { ...message, deliveryStatus: remembered } as T;
};
