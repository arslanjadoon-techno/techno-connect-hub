import { useEffect, useRef, useState } from "react";
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
  Lock,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize transient in-memory sessions on mount
  useEffect(() => {
    const loadedSessions = aiChatService.getSessions();
    setSessions(loadedSessions);
    setActiveSessionId(null);
    setIsSidebarOpen(false);
  }, []);

  // Active session and conversation messages
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages: ChatMessage[] = activeSession ? activeSession.messages : [];
  const hasStarted = activeSession !== null && messages.length > 0;

  // Has the first answer been received? If yes, disable further inputs for this conversation
  const hasReceivedAnswer = Boolean(
    activeSession && activeSession.messages.some((m) => m.role === "assistant"),
  );
  const isInputDisabled = thinking || hasReceivedAnswer;

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  // Handle "New chat" click:
  // Hides the sidebar immediately, resets to new chat hero, and attaches the toggle arrow button.
  const handleNewChat = () => {
    setActiveSessionId(null);
    setText("");
    setThinking(false);
    setIsSidebarOpen(false);
  };

  // Submit query
  const submit = (value: string) => {
    const v = value.trim();
    if (!v || isInputDisabled) return;

    setText("");

    if (!activeSessionId) {
      // Create a new session in-memory with user query as the title
      const newSession = aiChatService.createSession(v);
      setSessions(aiChatService.getSessions());
      setActiveSessionId(newSession.id);

      // Open the chat history sidebar so user sees the newly created chat title in the sidebar
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
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    submit(text);
  };

  // Open confirmation modal for deleting a session
  const promptDeleteSession = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setSessionToDelete(session);
  };

  // Confirm delete session
  const confirmDeleteSession = () => {
    if (!sessionToDelete) return;
    const deletedId = sessionToDelete.id;
    aiChatService.deleteSession(deletedId);
    setSessions(aiChatService.getSessions());

    if (activeSessionId === deletedId) {
      setActiveSessionId(null);
      setIsSidebarOpen(false);
    }
    setSessionToDelete(null);
  };

  // Select an existing session from sidebar
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setText("");
    setThinking(false);
  };

  // Reusable Composer Component
  const Composer = (
    <form onSubmit={handleSend} className="w-full">
      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            hasReceivedAnswer
              ? "Preview mode: query limit reached. Click 'New chat' to ask another question."
              : "Ask anything..."
          }
          disabled={isInputDisabled}
          className="h-9 sm:h-10 flex-1 rounded-xl text-xs sm:text-sm bg-card transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
          autoFocus={!hasReceivedAnswer}
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover-lift shrink-0 disabled:opacity-50"
          disabled={!text.trim() || isInputDisabled}
          title={hasReceivedAnswer ? "Input disabled in preview mode" : "Send query"}
        >
          {hasReceivedAnswer ? (
            <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </Button>
      </div>

      {/* Helper text when input is disabled after the first answer */}
      {hasReceivedAnswer && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground px-1 animate-fade-in">
          <span>✨ In this preview version, conversations are limited to one query.</span>
          <button
            type="button"
            onClick={handleNewChat}
            className="text-xs font-medium text-primary hover:underline transition-colors"
          >
            Start new chat →
          </button>
        </div>
      )}
    </form>
  );

  return (
    <div className="relative flex h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-7rem)] w-full overflow-hidden rounded-2xl border border-border bg-card/60 shadow-xs backdrop-blur-xs">
      {/* ========================================================
          ATTACHED ARROW BUTTON (Visible when sidebar is closed)
          Attaches directly to the application sidebar edge
          ======================================================== */}
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          title="Open chat history"
          className="absolute left-0 top-3 z-30 flex h-8 w-6 items-center justify-center rounded-r-md border border-l-0 border-border bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground transition-all duration-200 group"
        >
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}

      {/* ========================================================
          AI CHAT HISTORY SIDEBAR
          ======================================================== */}
      <aside
        className={`relative z-20 flex h-full flex-col border-r border-border bg-card/95 backdrop-blur-md transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isSidebarOpen
            ? "w-60 sm:w-68 opacity-100"
            : "w-0 opacity-0 pointer-events-none border-r-0"
        }`}
      >
        {/* Sidebar Header: "New chat" button and Collapse arrow */}
        <div className="flex items-center justify-between gap-1.5 border-b border-border/80 p-2 sm:p-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="flex-1 gap-2 rounded-xl text-xs font-semibold justify-start h-8.5 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
            title="Start a new chat and collapse sidebar"
          >
            <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
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
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Conversations
          </div>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-3 text-center text-muted-foreground">
              <MessageSquare className="h-6 w-6 stroke-[1.5] mb-2 opacity-40" />
              <p className="text-xs font-medium">No previous chats</p>
              <p className="text-[10px] opacity-75 mt-0.5">Your inquiries will appear here</p>
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`group relative flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-all cursor-pointer ${
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

                  {/* Delete button with confirmation modal */}
                  <button
                    type="button"
                    onClick={(e) => promptDeleteSession(e, s)}
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
        <header className="flex h-11 items-center justify-between border-b border-border/80 px-3.5 bg-card/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {!isSidebarOpen && (
              <div
                className="flex h-6.5 w-6.5 items-center justify-center rounded-lg text-white shadow-xs ml-2"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <Sparkles className="h-3 w-3" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-semibold truncate leading-tight">
                {activeSession ? activeSession.title : "Workspace AI Assistant"}
              </h2>
              <p className="text-[10px] text-muted-foreground truncate">
                {activeSession ? "Ongoing session" : "Ask questions or query workspace information"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasStarted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="gap-1.5 rounded-lg text-xs h-7.5 text-muted-foreground hover:text-foreground"
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
             PRE-FIRST-QUERY: Clean centered hero view (tightened zoom)
             ======================================================== */
          <div className="flex flex-1 flex-col items-center justify-center p-3 sm:p-4 animate-fade-in overflow-hidden">
            <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center text-center">
              <div
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-elegant)]"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <Sparkles className="h-5.5 w-5.5" />
              </div>

              <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">
                How can I help you today?
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Your workspace AI assistant is ready to help
              </p>

              <div className="mt-5 w-full">{Composer}</div>

              <div className="mt-3.5 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="rounded-xl border border-border/80 bg-card p-2 text-left text-xs text-foreground/85 transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground hover:shadow-xs"
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
              className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4"
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
                      className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
                      style={{ backgroundImage: "var(--gradient-primary)" }}
                    >
                      <Bot className="h-3 w-3" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      m.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground font-normal"
                        : "rounded-bl-sm bg-card text-foreground border border-border"
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.role === "user" && (
                    <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <UserIcon className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing / Thinking indicator */}
              {thinking && (
                <div className="flex items-start gap-2.5 animate-fade-in">
                  <div
                    className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
                    style={{ backgroundImage: "var(--gradient-primary)" }}
                  >
                    <Bot className="h-3 w-3" />
                  </div>
                  <div className="rounded-xl rounded-bl-sm border border-border bg-card px-3 py-2 text-xs sm:text-sm shadow-xs">
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
              <div className="mx-auto max-w-2xl">{Composer}</div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================
          DELETE CONVERSATION CONFIRMATION MODAL (Yes / No)
          ======================================================== */}
      <AlertDialog
        open={Boolean(sessionToDelete)}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{sessionToDelete?.title}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSessionToDelete(null)}>
              No, keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
