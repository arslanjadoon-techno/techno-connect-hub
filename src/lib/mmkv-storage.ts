export interface MMKVConfiguration {
  id?: string;
}

/**
 * Synchronous key-value MMKV storage engine for web runtime.
 * Persists entries immediately to localStorage with an in-memory fallback
 * so row-level draft data survives accidental navigation, refreshes, or power loss.
 */
export class MMKV {
  private readonly namespace: string;
  private readonly memoryFallback = new Map<string, string>();

  constructor(config?: MMKVConfiguration) {
    const instanceId = config?.id?.trim() || "default";
    this.namespace = `mmkv.${instanceId}.`;
  }

  private toStorageKey(key: string): string {
    return `${this.namespace}${key}`;
  }

  private getStorage(): Storage | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // Access to localStorage may be blocked in restricted browser contexts
    }
    return null;
  }

  set(key: string, value: boolean | string | number): void {
    const serialized = String(value);
    const fullKey = this.toStorageKey(key);
    this.memoryFallback.set(fullKey, serialized);

    const storage = this.getStorage();
    if (storage) {
      try {
        storage.setItem(fullKey, serialized);
      } catch {
        // Fallback remains safely in memory if storage quota is exceeded
      }
    }
  }

  getString(key: string): string | undefined {
    const fullKey = this.toStorageKey(key);
    const storage = this.getStorage();
    if (storage) {
      try {
        const val = storage.getItem(fullKey);
        if (val !== null) {
          return val;
        }
      } catch {
        // Fall through to in-memory store
      }
    }
    return this.memoryFallback.get(fullKey);
  }

  getBoolean(key: string): boolean | undefined {
    const raw = this.getString(key);
    if (raw === undefined) return undefined;
    return raw === "true";
  }

  getNumber(key: string): number | undefined {
    const raw = this.getString(key);
    if (raw === undefined) return undefined;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  setJSON<T>(key: string, value: T): void {
    this.set(key, JSON.stringify(value));
  }

  getJSON<T>(key: string): T | undefined {
    const raw = this.getString(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  contains(key: string): boolean {
    const fullKey = this.toStorageKey(key);
    const storage = this.getStorage();
    if (storage) {
      try {
        if (storage.getItem(fullKey) !== null) {
          return true;
        }
      } catch {
        // Fall through
      }
    }
    return this.memoryFallback.has(fullKey);
  }

  delete(key: string): void {
    const fullKey = this.toStorageKey(key);
    this.memoryFallback.delete(fullKey);

    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem(fullKey);
      } catch {
        // Ignore storage removal errors
      }
    }
  }

  getAllKeys(): string[] {
    const keys = new Set<string>();

    for (const fullKey of this.memoryFallback.keys()) {
      if (fullKey.startsWith(this.namespace)) {
        keys.add(fullKey.slice(this.namespace.length));
      }
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        for (let i = 0; i < storage.length; i++) {
          const fullKey = storage.key(i);
          if (fullKey && fullKey.startsWith(this.namespace)) {
            keys.add(fullKey.slice(this.namespace.length));
          }
        }
      } catch {
        // Ignore storage enumeration errors
      }
    }

    return Array.from(keys);
  }

  clearAll(): void {
    for (const key of this.getAllKeys()) {
      this.delete(key);
    }
  }
}
