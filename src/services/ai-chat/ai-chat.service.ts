export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/**
 * AI Chat Service
 * In-memory transient state for UI demonstration.
 * Does not persist conversations to local storage as per frontend preview specifications.
 */
export class AiChatService {
  private inMemorySessions: ChatSession[] = [];

  constructor() {
    // Clean up any previously stored sessions from localStorage if present
    try {
      localStorage.removeItem("techno_ai_chat_sessions_v1");
    } catch {
      // Ignore if localStorage is inaccessible
    }
  }

  /**
   * Retrieves all active in-memory chat sessions.
   */
  getSessions(): ChatSession[] {
    return [...this.inMemorySessions];
  }

  /**
   * Retrieves a single chat session by ID.
   */
  getSession(id: string): ChatSession | undefined {
    return this.inMemorySessions.find((s) => s.id === id);
  }

  /**
   * Creates a new chat session in-memory initiated with the user's first query as the title.
   */
  createSession(firstQuery: string): ChatSession {
    const cleanTitle = firstQuery.trim().slice(0, 60) || "New Conversation";
    const now = Date.now();

    const userMessage: ChatMessage = {
      id: `u-${now}`,
      role: "user",
      text: firstQuery.trim(),
      createdAt: now,
    };

    const newSession: ChatSession = {
      id: `chat-${now}-${Math.random().toString(36).substring(2, 7)}`,
      title: cleanTitle,
      messages: [userMessage],
      createdAt: now,
      updatedAt: now,
    };

    this.inMemorySessions = [newSession, ...this.inMemorySessions];
    return newSession;
  }

  /**
   * Adds a message to an existing in-memory chat session.
   */
  addMessage(
    sessionId: string,
    message: { role: "user" | "assistant"; text: string },
  ): ChatMessage | null {
    const index = this.inMemorySessions.findIndex((s) => s.id === sessionId);
    if (index === -1) return null;

    const now = Date.now();
    const newMessage: ChatMessage = {
      id: `${message.role === "user" ? "u" : "a"}-${now}`,
      role: message.role,
      text: message.text,
      createdAt: now,
    };

    const targetSession = this.inMemorySessions[index];
    const updatedSession: ChatSession = {
      ...targetSession,
      messages: [...targetSession.messages, newMessage],
      updatedAt: now,
    };

    this.inMemorySessions[index] = updatedSession;
    return newMessage;
  }

  /**
   * Deletes an in-memory chat session by ID.
   */
  deleteSession(id: string): boolean {
    const beforeCount = this.inMemorySessions.length;
    this.inMemorySessions = this.inMemorySessions.filter((s) => s.id !== id);
    return this.inMemorySessions.length !== beforeCount;
  }

  /**
   * Clears all in-memory chat sessions.
   */
  clearAll(): void {
    this.inMemorySessions = [];
  }
}

export const aiChatService = new AiChatService();
