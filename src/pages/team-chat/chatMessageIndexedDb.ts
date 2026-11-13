import { mergeChatMessages } from "./chatMessageState";

const DB_NAME = "techno-chat-cache";
const DB_VERSION = 2;
const STORE_NAME = "chatMessages";

type CachedChat = {
  chatId: string;
  messages: any[];
  updatedAt: number;
};

const cacheWriteQueues = new Map<string, Promise<void>>();
const cacheGenerations = new Map<string, number>();
let cacheClearAllGeneration = 0;

const enqueueCacheWrite = (
  chatId: string,
  operation: () => Promise<void>,
): Promise<void> => {
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

      // Version 2 canonicalizes rows written by older builds. Older builds
      // could persist the API's DESC history order, so migration prevents a
      // stale browser cache from reintroducing that order after a reload.
      if ((event as IDBVersionChangeEvent).oldVersion < 2) {
        const rowsRequest = store.getAll();
        rowsRequest.onsuccess = () => {
          rowsRequest.result.forEach((row: CachedChat) => {
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

/**
 * Read cached messages for one conversation.
 */
export async function getCachedChatMessages(chatId: string | number): Promise<any[]> {
  let db: IDBDatabase | undefined;

  try {
    db = await openChatDatabase();

    return await new Promise<any[]>((resolve, reject) => {
      const transaction = db!.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(String(chatId));

      request.onsuccess = () => {
        // Cache reads are a canonicalization boundary. Every caller receives
        // ASC messages even if a legacy row or an external write was DESC.
        resolve(mergeChatMessages(request.result?.messages ?? []));
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Could not read chat cache:", error);
    return [];
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

        await new Promise<void>((resolve, reject) => {
          const transaction = db!.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(key);

          request.onsuccess = () => {
            const cached = request.result as CachedChat | undefined;
            store.put({
              chatId: key,
              messages: mergeChatMessages(cached?.messages || [], messages || []),
              updatedAt: Date.now(),
            } satisfies CachedChat);
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
  } catch (error) {
    // A cache failure must not break chat messaging.
    console.warn("Could not save chat cache:", error);
  }
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
          const transaction = db!.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(key);

          request.onsuccess = () => {
            const cached = request.result as CachedChat | undefined;

            if (!cached) return;

            const remainingMessages = cached.messages.filter(
              (message: any) => String(getMessageId(message)) !== String(messageId),
            );

            store.put({
              ...cached,
              messages: mergeChatMessages(remainingMessages),
              updatedAt: Date.now(),
            } satisfies CachedChat);
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
    message.id ??
    message.messageId ??
    message.message_id ??
    message.publicId ??
    message.public_id
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
          const transaction = db!.transaction(STORE_NAME, "readwrite");

          transaction.objectStore(STORE_NAME).delete(key);

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
      const transaction = db!.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).clear();

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
