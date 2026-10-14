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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedChatMessages(chatId: string | number): Promise<any[]> {
  let db: IDBDatabase | undefined;

  try {
    db = await openChatDatabase();

    return await new Promise((resolve, reject) => {
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
