import {
  getMessageClientId,
  getMessageServerId,
  mergeChatMessages,
} from "./chatMessageState";

const DB_NAME = "techno-chat-cache";
const DB_VERSION = 5;
const STORE_NAME = "chatMessages";
const PENDING_SEND_STORE_NAME = "pendingChatSends";

export type PendingChatSendStatus = "pending" | "retrying" | "accepted" | "failed" | "cancelled";

export type PendingChatAttachment = {
  key: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  blob: Blob;
  attachmentId?: string;
};

export type PendingChatSend = {
  clientMessageId: string;
  ownerUserId: string;
  localChatKey: string;
  chatId?: string;
  targetType: "channel" | "direct";
  targetId: string;
  text: string;
  metadata: Record<string, unknown>;
  replyTo?: string;
  clientSequence: number;
  createdAt: string;
  updatedAt: number;
  attempts: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  status: PendingChatSendStatus;
  error?: string;
  unknownOutcome?: boolean;
  serverMessageId?: string;
  attachments: PendingChatAttachment[];
};

export type CachedChatState = {
  chatId: string;
  messages: any[];
  syncCursor?: string;
  updatedAt: number;
};

/**
 * Local chat data is a reload/reconnect accelerator, not the history source of
 * truth. Automatic eviction is bounded and never removes a send that still
 * needs reconciliation with the server.
 */
export const CHAT_CACHE_RETENTION = Object.freeze({
  maxMessagesPerConversation: 2_000,
  maxCachedConversations: 40,
  maxConversationAgeMs: 30 * 24 * 60 * 60 * 1_000,
  terminalPendingSendAgeMs: 7 * 24 * 60 * 60 * 1_000,
});

const UNSYNCED_PENDING_STATUSES = new Set<PendingChatSendStatus>([
  "pending",
  "retrying",
  "failed",
]);

const isUnsyncedPendingSend = (pending: PendingChatSend): boolean =>
  UNSYNCED_PENDING_STATUSES.has(pending.status) || pending.unknownOutcome === true;

const isTerminalPendingSend = (pending: PendingChatSend): boolean =>
  pending.status === "accepted" || pending.status === "cancelled";

const cacheWriteQueues = new Map<string, Promise<void>>();
const pendingWriteQueues = new Map<string, Promise<void>>();
const cacheGenerations = new Map<string, number>();
let cacheClearAllGeneration = 0;
let lastCachePruneAt = 0;
const CACHE_PRUNE_INTERVAL_MS = 5 * 60 * 1_000;

const enqueueCacheWrite = (chatId: string, operation: () => Promise<void>): Promise<void> => {
  const previous = cacheWriteQueues.get(chatId) || Promise.resolve();
  const queued = previous.catch(() => undefined).then(operation);
  cacheWriteQueues.set(chatId, queued);
  void queued.then(
    () => {
      if (cacheWriteQueues.get(chatId) === queued) cacheWriteQueues.delete(chatId);
    },
    () => {
      if (cacheWriteQueues.get(chatId) === queued) cacheWriteQueues.delete(chatId);
    },
  );
  return queued;
};

const enqueuePendingWrite = (
  clientMessageId: string,
  operation: () => Promise<void>,
): Promise<void> => {
  const previous = pendingWriteQueues.get(clientMessageId) || Promise.resolve();
  const queued = previous.catch(() => undefined).then(operation);
  pendingWriteQueues.set(clientMessageId, queued);
  void queued.then(
    () => {
      if (pendingWriteQueues.get(clientMessageId) === queued) {
        pendingWriteQueues.delete(clientMessageId);
      }
    },
    () => {
      if (pendingWriteQueues.get(clientMessageId) === queued) {
        pendingWriteQueues.delete(clientMessageId);
      }
    },
  );
  return queued;
};

function openChatDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      let store: IDBObjectStore;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, {
          keyPath: "chatId",
        });
      } else {
        store = request.transaction!.objectStore(STORE_NAME);
      }

      if (!store.indexNames.contains("byUpdatedAt")) {
        store.createIndex("byUpdatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(PENDING_SEND_STORE_NAME)) {
        const pendingStore = db.createObjectStore(PENDING_SEND_STORE_NAME, {
          keyPath: "clientMessageId",
        });
        pendingStore.createIndex("byStatus", "status", { unique: false });
        pendingStore.createIndex("byUpdatedAt", "updatedAt", { unique: false });
      }

      // Version 2 canonicalizes rows written by older builds. Older builds
      // could persist the API's DESC history order, so migration prevents a
      // stale browser cache from reintroducing that order after a reload.
      if ((event as IDBVersionChangeEvent).oldVersion < 2) {
        const rowsRequest = store.getAll();
        rowsRequest.onsuccess = () => {
          rowsRequest.result.forEach((row: CachedChatState) => {
            store.put({
              ...row,
              messages: mergeChatMessages(row.messages || []),
            });
          });
        };
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => db.close();

      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

function pendingChatKeys(pending: PendingChatSend): Set<string> {
  return new Set(
    [pending.localChatKey, pending.chatId]
      .filter((value): value is string => Boolean(value))
      .map(String),
  );
}

function messageIsUnsynced(message: any, pendingSends: PendingChatSend[]): boolean {
  const sendState = String(message?.sendState ?? message?.send_state ?? "").toLowerCase();
  if (["pending", "sending", "retrying", "failed"].includes(sendState)) return true;

  const clientId = getMessageClientId(message);
  const serverId = getMessageServerId(message);
  return pendingSends.some(
    (pending) =>
      isUnsyncedPendingSend(pending) &&
      ((clientId && pending.clientMessageId === clientId) ||
        (serverId && pending.serverMessageId === serverId)),
  );
}

function retainConversationMessages(
  chatId: string,
  messages: any[],
  pendingSends: PendingChatSend[],
): any[] {
  const canonical = mergeChatMessages(messages || []);
  if (canonical.length <= CHAT_CACHE_RETENTION.maxMessagesPerConversation) return canonical;

  const protectedPending = pendingSends.filter(
    (pending) => isUnsyncedPendingSend(pending) && pendingChatKeys(pending).has(chatId),
  );
  const protectedMessages = canonical.filter((message) =>
    messageIsUnsynced(message, protectedPending),
  );
  const protectedSet = new Set(protectedMessages);
  const evictableMessages = canonical.filter((message) => !protectedSet.has(message));
  const availableSlots = Math.max(
    0,
    CHAT_CACHE_RETENTION.maxMessagesPerConversation - protectedMessages.length,
  );

  // Keep the newest history plus every message that still needs send
  // reconciliation. The protected set may exceed the nominal cap; losing an
  // unsynced send is never an acceptable eviction trade-off.
  return mergeChatMessages(protectedMessages, evictableMessages.slice(-availableSlots));
}

function rowContainsUnsyncedMessage(row: CachedChatState, pendingSends: PendingChatSend[]): boolean {
  return (row.messages || []).some((message) => messageIsUnsynced(message, pendingSends));
}

function keepCachedRows(
  rows: CachedChatState[],
  pendingSends: PendingChatSend[],
  now: number,
): Set<string> {
  const protectedChatIds = new Set(
    pendingSends
      .filter(isUnsyncedPendingSend)
      .flatMap((pending) => Array.from(pendingChatKeys(pending))),
  );
  rows.forEach((row) => {
    if (rowContainsUnsyncedMessage(row, pendingSends)) protectedChatIds.add(row.chatId);
  });

  const freshRows = rows.filter(
    (row) =>
      protectedChatIds.has(row.chatId) ||
      now - Number(row.updatedAt || 0) <= CHAT_CACHE_RETENTION.maxConversationAgeMs,
  );
  freshRows.sort((first, second) => Number(second.updatedAt || 0) - Number(first.updatedAt || 0));

  const keep = new Set<string>(protectedChatIds);
  for (const row of freshRows) {
    if (keep.size >= CHAT_CACHE_RETENTION.maxCachedConversations) break;
    keep.add(row.chatId);
  }

  return keep;
}

function persistCachedChatState(
  db: IDBDatabase,
  chatId: string,
  messages: any[],
  syncCursor?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORE_NAME, PENDING_SEND_STORE_NAME],
      "readwrite",
    );
    const cacheStore = transaction.objectStore(STORE_NAME);
    const pendingStore = transaction.objectStore(PENDING_SEND_STORE_NAME);
    const cachedRequest = cacheStore.get(chatId);
    const rowsRequest = cacheStore.getAll();
    const pendingRequest = pendingStore.getAll();
    let cached: CachedChatState | undefined;
    let rows: CachedChatState[] = [];
    let pendingSends: PendingChatSend[] = [];
    let requestsCompleted = 0;
    let failed = false;

    const fail = (error: unknown) => {
      if (failed) return;
      failed = true;
      reject(error);
      try {
        transaction.abort();
      } catch {
        // The transaction may already be completing.
      }
    };

    const maybePersist = () => {
      if (failed || requestsCompleted !== 3) return;

      const now = Date.now();
      const nextRow: CachedChatState = {
        chatId,
        messages: retainConversationMessages(
          chatId,
          mergeChatMessages(cached?.messages || [], messages || []),
          pendingSends,
        ),
        syncCursor: syncCursor || cached?.syncCursor,
        updatedAt: now,
      };

      cacheStore.put(nextRow);

      const allRows = rows.filter((row) => row.chatId !== chatId);
      allRows.push(nextRow);
      const keep = keepCachedRows(allRows, pendingSends, now);
      allRows.forEach((row) => {
        if (!keep.has(row.chatId)) {
          cacheStore.delete(row.chatId);
          return;
        }

        if (row.chatId !== chatId) {
          const retainedMessages = retainConversationMessages(
            row.chatId,
            row.messages,
            pendingSends,
          );
          if (retainedMessages.length !== row.messages.length) {
            cacheStore.put({
              ...row,
              messages: retainedMessages,
              updatedAt: now,
            } satisfies CachedChatState);
          }
        }
      });

      pendingSends.forEach((pending) => {
        if (
          isTerminalPendingSend(pending) &&
          now - Number(pending.updatedAt || 0) > CHAT_CACHE_RETENTION.terminalPendingSendAgeMs
        ) {
          pendingStore.delete(pending.clientMessageId);
        }
      });
    };

    cachedRequest.onsuccess = () => {
      cached = cachedRequest.result as CachedChatState | undefined;
      requestsCompleted += 1;
      maybePersist();
    };
    rowsRequest.onsuccess = () => {
      rows = (rowsRequest.result as CachedChatState[]) || [];
      requestsCompleted += 1;
      maybePersist();
    };
    pendingRequest.onsuccess = () => {
      pendingSends = (pendingRequest.result as PendingChatSend[]) || [];
      requestsCompleted += 1;
      maybePersist();
    };
    cachedRequest.onerror = () => fail(cachedRequest.error);
    rowsRequest.onerror = () => fail(rowsRequest.error);
    pendingRequest.onerror = () => fail(pendingRequest.error);
    transaction.oncomplete = () => {
      lastCachePruneAt = Date.now();
      resolve();
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => {
      if (!failed) reject(transaction.error || new Error("Chat cache transaction aborted."));
    };
  });
}

function pruneCachedChatStorage(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORE_NAME, PENDING_SEND_STORE_NAME],
      "readwrite",
    );
    const cacheStore = transaction.objectStore(STORE_NAME);
    const pendingStore = transaction.objectStore(PENDING_SEND_STORE_NAME);
    const rowsRequest = cacheStore.getAll();
    const pendingRequest = pendingStore.getAll();
    let rows: CachedChatState[] = [];
    let pendingSends: PendingChatSend[] = [];
    let completed = 0;

    const pruneWhenReady = () => {
      if (completed !== 2) return;
      const now = Date.now();
      const keep = keepCachedRows(rows, pendingSends, now);

      rows.forEach((row) => {
        if (!keep.has(row.chatId)) {
          cacheStore.delete(row.chatId);
          return;
        }

        const retainedMessages = retainConversationMessages(
          row.chatId,
          row.messages,
          pendingSends,
        );
        if (retainedMessages.length !== row.messages.length) {
          cacheStore.put({
            ...row,
            messages: retainedMessages,
            updatedAt: now,
          } satisfies CachedChatState);
        }
      });
      pendingSends.forEach((pending) => {
        if (
          isTerminalPendingSend(pending) &&
          now - Number(pending.updatedAt || 0) > CHAT_CACHE_RETENTION.terminalPendingSendAgeMs
        ) {
          pendingStore.delete(pending.clientMessageId);
        }
      });
    };

    rowsRequest.onsuccess = () => {
      rows = (rowsRequest.result as CachedChatState[]) || [];
      completed += 1;
      pruneWhenReady();
    };
    pendingRequest.onsuccess = () => {
      pendingSends = (pendingRequest.result as PendingChatSend[]) || [];
      completed += 1;
      pruneWhenReady();
    };
    rowsRequest.onerror = () => reject(rowsRequest.error);
    pendingRequest.onerror = () => reject(pendingRequest.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function pruneChatCacheIfDue(db: IDBDatabase): Promise<void> {
  if (Date.now() - lastCachePruneAt < CACHE_PRUNE_INTERVAL_MS) return;
  await pruneCachedChatStorage(db);
  lastCachePruneAt = Date.now();
}

/**
 * Read cached messages for one conversation.
 */
export async function getCachedChatMessages(chatId: string | number): Promise<any[]> {
  const cached = await getCachedChatState(chatId);
  return cached.messages;
}

/**
 * Read cached messages and the durable reconnect watermark together.
 */
export async function getCachedChatState(
  chatId: string | number,
): Promise<{ messages: any[]; syncCursor?: string }> {
  let db: IDBDatabase | undefined;

  try {
    db = await openChatDatabase();
    await pruneChatCacheIfDue(db);

    return await new Promise<{ messages: any[]; syncCursor?: string }>((resolve, reject) => {
      const transaction = db!.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(String(chatId));

      request.onsuccess = () => {
        // Cache reads are a canonicalization boundary. Every caller receives
        // ASC messages even if a legacy row or an external write was DESC.
        resolve({
          messages: mergeChatMessages(request.result?.messages ?? []),
          syncCursor: request.result?.syncCursor,
        });
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Could not read chat cache:", error);
    return { messages: [] };
  } finally {
    db?.close();
  }
}

/**
 * Merge messages into the cached conversation in ASC order.
 *
 * A full replacement is unsafe because history, realtime, and message-update
 * callers can all finish after a stale read. Serializing writes and merging
 * against the row currently in IndexedDB prevents one caller from dropping
 * messages written by another caller.
 */
export async function saveCachedChatMessages(
  chatId: string | number,
  messages: any[],
  syncCursor?: string,
): Promise<void> {
  const key = String(chatId);
  const generation = cacheGenerations.get(key) || 0;
  const clearAllGeneration = cacheClearAllGeneration;

  try {
    await enqueueCacheWrite(key, async () => {
      // A clear requested after this save was scheduled makes this snapshot
      // stale. Let the clear win instead of restoring deleted history.
      if (
        (cacheGenerations.get(key) || 0) !== generation ||
        cacheClearAllGeneration !== clearAllGeneration
      )
        return;

      let db: IDBDatabase | undefined;
      try {
        db = await openChatDatabase();

        await persistCachedChatState(db!, key, messages, syncCursor);
      } finally {
        db?.close();
      }
    });
  } catch (error) {
    // A cache failure must not break chat messaging.
    console.warn("Could not save chat cache:", error);
  }
}

/**
 * Apply one reconnect page and its watermark in the same IndexedDB transaction.
 * This operation intentionally propagates failures so callers do not advance
 * the in-memory cursor when the page was not durably cached.
 */
export async function saveCachedChatMessagesAndCursor(
  chatId: string | number,
  messages: any[],
  syncCursor: string,
): Promise<void> {
  const key = String(chatId);
  const generation = cacheGenerations.get(key) || 0;
  const clearAllGeneration = cacheClearAllGeneration;

  await enqueueCacheWrite(key, async () => {
    if (
      (cacheGenerations.get(key) || 0) !== generation ||
      cacheClearAllGeneration !== clearAllGeneration
    ) {
      throw new Error("Chat cache changed while reconnect synchronization was running.");
    }

    let db: IDBDatabase | undefined;
    try {
      db = await openChatDatabase();

      await persistCachedChatState(db!, key, messages, syncCursor);
    } finally {
      db?.close();
    }
  });
}

/**
 * Persist the complete retry input before a send starts. Attachments are stored
 * as blobs plus metadata; auth headers, object URLs, and expiring URLs are
 * intentionally never stored here.
 */
export async function savePendingChatSend(pending: PendingChatSend): Promise<void> {
  const value = {
    ...pending,
    updatedAt: pending.updatedAt || Date.now(),
  } satisfies PendingChatSend;

  await enqueuePendingWrite(value.clientMessageId, async () => {
    let db: IDBDatabase | undefined;
    try {
      db = await openChatDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = db!.transaction(PENDING_SEND_STORE_NAME, "readwrite");
        transaction.objectStore(PENDING_SEND_STORE_NAME).put(value);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      db?.close();
    }
  });
}

export async function getPendingChatSend(
  clientMessageId: string,
): Promise<PendingChatSend | undefined> {
  let db: IDBDatabase | undefined;
  try {
    db = await openChatDatabase();
    return await new Promise<PendingChatSend | undefined>((resolve, reject) => {
      const transaction = db!.transaction(PENDING_SEND_STORE_NAME, "readonly");
      const request = transaction.objectStore(PENDING_SEND_STORE_NAME).get(clientMessageId);
      request.onsuccess = () => resolve(request.result as PendingChatSend | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db?.close();
  }
}

export async function getPendingChatSends(ownerUserId?: string): Promise<PendingChatSend[]> {
  let db: IDBDatabase | undefined;
  try {
    db = await openChatDatabase();
    return await new Promise<PendingChatSend[]>((resolve, reject) => {
      const transaction = db!.transaction(PENDING_SEND_STORE_NAME, "readonly");
      const request = transaction.objectStore(PENDING_SEND_STORE_NAME).getAll();
      request.onsuccess = () => {
        const rows = (request.result as PendingChatSend[]).filter(
          (row) => !ownerUserId || row.ownerUserId === ownerUserId,
        );
        resolve(rows.sort((a, b) => a.updatedAt - b.updatedAt));
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db?.close();
  }
}

export async function updatePendingChatSend(
  clientMessageId: string,
  update: Partial<PendingChatSend> | ((current: PendingChatSend) => PendingChatSend),
): Promise<PendingChatSend | undefined> {
  let updated: PendingChatSend | undefined;
  await enqueuePendingWrite(clientMessageId, async () => {
    let db: IDBDatabase | undefined;
    try {
      db = await openChatDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = db!.transaction(PENDING_SEND_STORE_NAME, "readwrite");
        const store = transaction.objectStore(PENDING_SEND_STORE_NAME);
        const request = store.get(clientMessageId);
        request.onsuccess = () => {
          const current = request.result as PendingChatSend | undefined;
          if (!current) return;
          updated = {
            ...(typeof update === "function" ? update(current) : { ...current, ...update }),
            updatedAt: Date.now(),
          };
          store.put(updated);
        };
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      db?.close();
    }
  });
  return updated;
}

export async function deletePendingChatSend(clientMessageId: string): Promise<void> {
  await enqueuePendingWrite(clientMessageId, async () => {
    let db: IDBDatabase | undefined;
    try {
      db = await openChatDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = db!.transaction(PENDING_SEND_STORE_NAME, "readwrite");
        transaction.objectStore(PENDING_SEND_STORE_NAME).delete(clientMessageId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      db?.close();
    }
  });
}

export async function cancelPendingChatSend(clientMessageId: string): Promise<void> {
  await updatePendingChatSend(clientMessageId, {
    status: "cancelled",
    error: "Cancelled by user",
    unknownOutcome: false,
    nextRetryAt: undefined,
  });
}

/**
 * Delete one message from a conversation's cached history.
 *
 * IMPORTANT: Update getMessageId() if your API uses a different
 * message identifier property.
 */
export async function deleteCachedChatMessage(
  chatId: string | number,
  messageId: string | number,
): Promise<void> {
  const key = String(chatId);

  try {
    await enqueueCacheWrite(key, async () => {
      let db: IDBDatabase | undefined;
      try {
        db = await openChatDatabase();

        await new Promise<void>((resolve, reject) => {
          const transaction = db!.transaction(
            [STORE_NAME, PENDING_SEND_STORE_NAME],
            "readwrite",
          );
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(key);
          const pendingRequest = transaction.objectStore(PENDING_SEND_STORE_NAME).getAll();
          let cached: CachedChatState | undefined;
          let pendingSends: PendingChatSend[] = [];
          let completed = 0;

          const removeWhenReady = () => {
            if (completed !== 2 || !cached) return;

            const remainingMessages = cached.messages.filter((message: any) => {
              if (String(getMessageId(message)) !== String(messageId)) return true;
              return messageIsUnsynced(message, pendingSends);
            });

            store.put({
              ...cached,
              messages: mergeChatMessages(remainingMessages),
              updatedAt: Date.now(),
            } satisfies CachedChatState);
          };

          request.onsuccess = () => {
            cached = request.result as CachedChatState | undefined;
            completed += 1;
            removeWhenReady();
          };
          pendingRequest.onsuccess = () => {
            pendingSends = (pendingRequest.result as PendingChatSend[]) || [];
            completed += 1;
            removeWhenReady();
          };
          request.onerror = () => reject(request.error);
          pendingRequest.onerror = () => reject(pendingRequest.error);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        db?.close();
      }
    });
  } catch (error) {
    console.warn("Could not delete cached chat message:", error);
    throw error;
  }
}

/**
 * Adapt this function to your actual message response shape.
 */
function getMessageId(message: any): string | number | undefined {
  return (
    message.id ?? message.messageId ?? message.message_id ?? message.publicId ?? message.public_id
  );
}

/**
 * Clear all cached messages for one conversation.
 * Other conversations remain cached.
 */
export async function clearCachedChatMessages(chatId: string | number): Promise<void> {
  const key = String(chatId);
  cacheGenerations.set(key, (cacheGenerations.get(key) || 0) + 1);

  try {
    await enqueueCacheWrite(key, async () => {
      let db: IDBDatabase | undefined;
      try {
        db = await openChatDatabase();

        await new Promise<void>((resolve, reject) => {
          const transaction = db!.transaction(
            [STORE_NAME, PENDING_SEND_STORE_NAME],
            "readwrite",
          );
          const cacheStore = transaction.objectStore(STORE_NAME);
          const cachedRequest = cacheStore.get(key);
          const pendingRequest = transaction.objectStore(PENDING_SEND_STORE_NAME).getAll();

          let cached: CachedChatState | undefined;
          let pendingSends: PendingChatSend[] = [];
          let completed = 0;

          const clearWhenReady = () => {
            if (completed !== 2 || !cached) return;
            const protectedMessages = cached.messages.filter((message) =>
              messageIsUnsynced(message, pendingSends),
            );

            if (protectedMessages.length > 0) {
              cacheStore.put({
                ...cached,
                messages: mergeChatMessages(protectedMessages),
                syncCursor: undefined,
                updatedAt: Date.now(),
              } satisfies CachedChatState);
            } else {
              cacheStore.delete(key);
            }
          };

          cachedRequest.onsuccess = () => {
            cached = cachedRequest.result as CachedChatState | undefined;
            completed += 1;
            clearWhenReady();
          };
          pendingRequest.onsuccess = () => {
            pendingSends = (pendingRequest.result as PendingChatSend[]) || [];
            completed += 1;
            clearWhenReady();
          };
          cachedRequest.onerror = () => reject(cachedRequest.error);
          pendingRequest.onerror = () => reject(pendingRequest.error);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        db?.close();
      }
    });
  } catch (error) {
    console.warn("Could not clear chat cache:", error);
    throw error;
  }
}

/**
 * Remove every cached conversation.
 * Use only when the user explicitly requests a full cache reset.
 */
export async function clearAllCachedChatMessages(): Promise<void> {
  let db: IDBDatabase | undefined;
  cacheClearAllGeneration += 1;

  try {
    db = await openChatDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = db!.transaction(
        [STORE_NAME, PENDING_SEND_STORE_NAME],
        "readwrite",
      );
      const cacheStore = transaction.objectStore(STORE_NAME);
      const rowsRequest = cacheStore.getAll();
      const pendingRequest = transaction.objectStore(PENDING_SEND_STORE_NAME).getAll();
      let rows: CachedChatState[] = [];
      let pendingSends: PendingChatSend[] = [];
      let completed = 0;

      const clearWhenReady = () => {
        if (completed !== 2) return;

        rows.forEach((row) => {
          const protectedMessages = row.messages.filter((message) =>
            messageIsUnsynced(message, pendingSends),
          );
          if (protectedMessages.length > 0) {
            cacheStore.put({
              ...row,
              messages: mergeChatMessages(protectedMessages),
              syncCursor: undefined,
              updatedAt: Date.now(),
            } satisfies CachedChatState);
          } else {
            cacheStore.delete(row.chatId);
          }
        });
      };

      rowsRequest.onsuccess = () => {
        rows = (rowsRequest.result as CachedChatState[]) || [];
        completed += 1;
        clearWhenReady();
      };
      pendingRequest.onsuccess = () => {
        pendingSends = (pendingRequest.result as PendingChatSend[]) || [];
        completed += 1;
        clearWhenReady();
      };
      rowsRequest.onerror = () => reject(rowsRequest.error);
      pendingRequest.onerror = () => reject(pendingRequest.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn("Could not clear all chat caches:", error);
    throw error;
  } finally {
    db?.close();
  }
}

/**
 * Remove the chat cache database and all of its data.
 */
export async function deleteChatDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      reject(new Error(`IndexedDB deletion was blocked for ${DB_NAME}`));
    };
  });
}
