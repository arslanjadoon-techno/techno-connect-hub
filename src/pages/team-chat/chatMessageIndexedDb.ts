const DB_NAME = "techno-chat-cache";
const DB_VERSION = 1;
const STORE_NAME = "chatMessages";

type CachedChat = {
  chatId: string;
  messages: any[];
  updatedAt: number;
};

function openChatDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "chatId",
        });
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
        resolve(request.result?.messages ?? []);
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
 * Save or replace the cached messages for a conversation.
 */
export async function saveCachedChatMessages(
  chatId: string | number,
  messages: any[],
): Promise<void> {
  let db: IDBDatabase | undefined;

  try {
    db = await openChatDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = db!.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).put({
        chatId: String(chatId),
        messages,
        updatedAt: Date.now(),
      } satisfies CachedChat);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch (error) {
    // A cache failure must not break chat messaging.
    console.warn("Could not save chat cache:", error);
  } finally {
    db?.close();
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
  let db: IDBDatabase | undefined;

  try {
    db = await openChatDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = db!.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(String(chatId));

      request.onsuccess = () => {
        const cached = request.result as CachedChat | undefined;

        if (!cached) return;

        const remainingMessages = cached.messages.filter(
          (message: any) => String(getMessageId(message)) !== String(messageId),
        );

        store.put({
          ...cached,
          messages: remainingMessages,
          updatedAt: Date.now(),
        } satisfies CachedChat);
      };

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn("Could not delete cached chat message:", error);
    throw error;
  } finally {
    db?.close();
  }
}

/**
 * Adapt this function to your actual message response shape.
 */
function getMessageId(message: any): string | number | undefined {
  return message.id ?? message.messageId ?? message.publicId;
}

/**
 * Clear all cached messages for one conversation.
 * Other conversations remain cached.
 */
export async function clearCachedChatMessages(chatId: string | number): Promise<void> {
  let db: IDBDatabase | undefined;

  try {
    db = await openChatDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = db!.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).delete(String(chatId));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn("Could not clear chat cache:", error);
    throw error;
  } finally {
    db?.close();
  }
}

/**
 * Remove every cached conversation.
 * Use only when the user explicitly requests a full cache reset.
 */
export async function clearAllCachedChatMessages(): Promise<void> {
  let db: IDBDatabase | undefined;

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
