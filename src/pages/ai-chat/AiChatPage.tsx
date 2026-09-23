import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  Plus,
  ChevronRight,
  ChevronLeft,
  Trash2,
  MessageSquare,
} from "lucide-react";
import {
  aiChatService,
  type ChatSession,
  type ChatMessage,
} from "@/services/ai-chat/ai-chat.service";

const STATIC_REPLY =
  "This functionality is currently not available in this preview version. Stay tuned for upcoming updates!";

const SUGGESTIONS = [
  "Summarize my open tickets",
  "Show pending approvals this week",
  "Draft a status update for my team",
  "What changed in the last 24 hours?",
];

export default function AIChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing sessions on initial mount
  useEffect(() => {
    const loadedSessions = aiChatService.getSessions();
    setSessions(loadedSessions);
    // Keep sidebar closed on initial fresh state unless there is already an active session
    if (loadedSessions.length > 0) {
      // If user had sessions, default to new chat initially so hero is shown,
      // but user can open sidebar or click any chat.
      setActiveSessionId(null);
      setIsSidebarOpen(false);
    }
  }, []);

  // Current active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages: ChatMessage[] = activeSession ? activeSession.messages : [];
  const hasStarted = activeSession !== null && messages.length > 0;

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  // Handle "New chat" click:
  // Requirement: Hide the sidebar immediately, reset to new chat hero, and show the attached arrow button.
  const handleNewChat = () => {
    setActiveSessionId(null);
    setText("");
    setThinking(false);
    setIsSidebarOpen(false);
  };

  // Submit query
  const submit = (value: string) => {
    const v = value.trim();
    if (!v || thinking) return;

    setText("");

    if (!activeSessionId) {
      // Create a brand new session with user query as the title
      const newSession = aiChatService.createSession(v);
      const updatedSessions = aiChatService.getSessions();
      setSessions(updatedSessions);
      setActiveSessionId(newSession.id);

      // Open the chat history sidebar so user sees the new chat title appear in the sidebar
      setIsSidebarOpen(true);

      // Simulate AI response
      setThinking(true);
      setTimeout(() => {
        aiChatService.addMessage(newSession.id, {
          role: "assistant",
          text: STATIC_REPLY,
        });
        setSessions(aiChatService.getSessions());
        setThinking(false);
      }, 650);
    } else {
      // Append user message to existing active session
      aiChatService.addMessage(activeSessionId, {
        role: "user",
        text: v,
      });
      setSessions(aiChatService.getSessions());

      // Simulate AI response
      setThinking(true);
      setTimeout(() => {
        aiChatService.addMessage(activeSessionId, {
          role: "assistant",
          text: STATIC_REPLY,
        });
        setSessions(aiChatService.getSessions());
        setThinking(false);
      }, 650);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    submit(text);
  };

  // Delete a chat session
  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    aiChatService.deleteSession(sessionId);
    const updated = aiChatService.getSessions();
    setSessions(updated);

    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      // If deleted session was active, close sidebar and go back to hero
      setIsSidebarOpen(false);
    }
  };

  // Select an existing session from sidebar
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setText("");
    setThinking(false);
  };

  // Reusable Composer Component
  const Composer = (
    <form onSubmit={handleSend} className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask anything..."
        disabled={thinking}
        className="h-10 sm:h-10.5 flex-1 rounded-xl text-xs sm:text-sm bg-card"
        autoFocus
      />
      <Button
        type="submit"
        size="icon"
        className="h-10 w-10 sm:h-10.5 sm:w-10.5 rounded-xl hover-lift shrink-0"
        disabled={!text.trim() || thinking}
        title="Send message"
      >
        <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>
    </form>
  );

  return (
    <div className="relative flex h-[calc(100vh-5.5rem)] w-full overflow-hidden rounded-2xl border border-border bg-card/60 shadow-xs backdrop-blur-xs">
      {/* ========================================================
          ATTACHED ARROW BUTTON (Visible when sidebar is closed)
          Attaches directly to the application sidebar edge
          ======================================================== */}
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          title="Open chat history"
          className="absolute left-0 top-3 z-30 flex h-9 w-6 items-center justify-center rounded-r-md border border-l-0 border-border bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground transition-all duration-200 group"
        >
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}

      {/* ========================================================
          AI CHAT HISTORY SIDEBAR
          ======================================================== */}
      <aside
        className={`relative z-20 flex h-full flex-col border-r border-border bg-card/95 backdrop-blur-md transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isSidebarOpen
            ? "w-64 sm:w-72 opacity-100"
            : "w-0 opacity-0 pointer-events-none border-r-0"
        }`}
      >
        {/* Sidebar Header: "New chat" button and Collapse arrow */}
        <div className="flex items-center justify-between gap-1.5 border-b border-border/80 p-2.5 sm:p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="flex-1 gap-2 rounded-xl text-xs font-semibold justify-start h-9 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
            title="Start a new chat and collapse sidebar"
          >
            <Plus className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">New chat</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
            title="Close sidebar"
            className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Sidebar Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Conversations
          </div>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-3 text-center text-muted-foreground">
              <MessageSquare className="h-7 w-7 stroke-[1.5] mb-2 opacity-40" />
              <p className="text-xs font-medium">No previous chats</p>
              <p className="text-[11px] opacity-75 mt-0.5">Your inquiries will appear here</p>
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`group relative flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium shadow-2xs border border-primary/20"
                      : "text-foreground/80 hover:bg-accent hover:text-foreground border border-transparent"
                  }`}
                >
                  <MessageSquare
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span className="flex-1 truncate pr-5" title={s.title}>
                    {s.title}
                  </span>

                  {/* Delete button on hover */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    title="Delete conversation"
                    className="absolute right-2 opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground p-1 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ========================================================
          MAIN CHAT CONTENT AREA
          ======================================================== */}
      <main className="relative flex flex-1 flex-col overflow-hidden min-w-0 bg-background/50">
        {/* Top Header of the Chat Window */}
        <header className="flex h-12 items-center justify-between border-b border-border/80 px-4 bg-card/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* If sidebar is closed, show small indicator icon */}
            {!isSidebarOpen && (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-xs ml-3"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-semibold truncate leading-tight">
                {activeSession ? activeSession.title : "Workspace AI Assistant"}
              </h2>
              <p className="text-[10px] text-muted-foreground truncate">
                {activeSession
                  ? "Ongoing session"
                  : "Ask questions, summarize, or query system data"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasStarted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="gap-1.5 rounded-lg text-xs h-8 text-muted-foreground hover:text-foreground"
                title="Start a new chat"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New chat</span>
              </Button>
            )}
          </div>
        </header>

        {/* Dynamic View: Hero state vs Message stream */}
        {!hasStarted ? (
          /* ========================================================
             PRE-FIRST-QUERY: Clean centered hero view
             ======================================================== */
          <div className="flex flex-1 flex-col items-center justify-center p-4 animate-fade-in overflow-y-auto">
            <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center text-center">
              <div
                className="mb-4 flex h-13 w-13 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-elegant)]"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <Sparkles className="h-6.5 w-6.5" />
              </div>

              <h1 className="font-display text-2xl sm:text-[26px] font-semibold tracking-tight">
                How can I help you today?
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Your workspace AI assistant is ready to help
              </p>

              <div className="mt-6 w-full">{Composer}</div>

              <div className="mt-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="rounded-xl border border-border/80 bg-card p-2.5 text-left text-xs text-foreground/85 transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground hover:shadow-xs"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             POST-QUERY: Active Conversation Stream
             ======================================================== */
          <div className="flex flex-1 flex-col overflow-hidden animate-fade-in">
            <div
              ref={scrollRef}
              className="flex-1 space-y-3.5 overflow-y-auto p-3.5 sm:p-5"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--primary) 6%, transparent) 1px, transparent 0)",
                backgroundSize: "20px 20px",
                contain: "content",
              }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${m.role === "user" ? "justify-end" : ""} animate-fade-in`}
                >
                  {m.role === "assistant" && (
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
                      style={{ backgroundImage: "var(--gradient-primary)" }}
                    >
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      m.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground font-normal"
                        : "rounded-bl-sm bg-card text-foreground border border-border"
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.role === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <UserIcon className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing / Thinking indicator */}
              {thinking && (
                <div className="flex items-start gap-2.5 animate-fade-in">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
                    style={{ backgroundImage: "var(--gradient-primary)" }}
                  >
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 text-xs sm:text-sm shadow-xs">
                    <span className="inline-flex gap-1 items-center">
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
                        style={{ animationDelay: "300ms" }}
                      />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Pinned Composer */}
            <div className="border-t border-border bg-card/90 p-2.5 sm:p-3 backdrop-blur-xs">
              <div className="mx-auto max-w-3xl">
                {Composer}
                <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                  AI Chat preview — responses are generated via system simulation.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
