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

const STORAGE_KEY = "techno_ai_chat_sessions_v1";

export class AiChatService {
  /**
   * Retrieves all chat sessions from storage.
   */
  getSessions(): ChatSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to load AI chat sessions from storage:", e);
      return [];
    }
  }

  /**
   * Saves all chat sessions to storage.
   */
  private saveSessions(sessions: ChatSession[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to persist AI chat sessions to storage:", e);
    }
  }

  /**
   * Retrieves a single chat session by ID.
   */
  getSession(id: string): ChatSession | undefined {
    const sessions = this.getSessions();
    return sessions.find((s) => s.id === id);
  }

  /**
   * Creates a new chat session initiated with the user's first query as the title.
   */
  createSession(firstQuery: string): ChatSession {
    const sessions = this.getSessions();
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

    const updated = [newSession, ...sessions];
    this.saveSessions(updated);
    return newSession;
  }

  /**
   * Adds a message to an existing chat session.
   */
  addMessage(
    sessionId: string,
    message: { role: "user" | "assistant"; text: string },
  ): ChatMessage | null {
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) return null;

    const now = Date.now();
    const newMessage: ChatMessage = {
      id: `${message.role === "user" ? "u" : "a"}-${now}`,
      role: message.role,
      text: message.text,
      createdAt: now,
    };

    const targetSession = sessions[index];
    const updatedSession: ChatSession = {
      ...targetSession,
      messages: [...targetSession.messages, newMessage],
      updatedAt: now,
    };

    sessions[index] = updatedSession;
    this.saveSessions(sessions);
    return newMessage;
  }

  /**
   * Deletes a chat session by ID.
   */
  deleteSession(id: string): boolean {
    const sessions = this.getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    if (filtered.length === sessions.length) return false;
    this.saveSessions(filtered);
    return true;
  }

  /**
   * Clears all stored chat sessions.
   */
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear AI chat sessions:", e);
    }
  }
}

export const aiChatService = new AiChatService();
