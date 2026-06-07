import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Bot, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_app/ai-chat")({
  head: () => ({ meta: [{ title: "AI Chat — Techno Ticket Portal" }] }),
  component: AIChatPage,
});

type Msg = { id: string; role: "user" | "assistant"; text: string };

const STATIC_REPLY =
  "We're still working on this feature — it'll be available to you soon. Thanks for your patience!";

const SUGGESTIONS = [
  "Summarize my open tickets",
  "Show pending approvals this week",
  "Draft a status update for my team",
  "What changed in the last 24 hours?",
];

function AIChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const started = messages.length > 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  const submit = (value: string) => {
    const v = value.trim();
    if (!v || disabled) return;
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: v }]);
    setText("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: STATIC_REPLY }]);
      setThinking(false);
      setDisabled(true);
    }, 700);
  };

  const send = (e: React.FormEvent) => { e.preventDefault(); submit(text); };

  const Composer = (
    <form onSubmit={send} className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? "AI chat is coming soon — stay tuned!" : "Ask anything..."}
        disabled={disabled || thinking}
        className="h-12 flex-1 rounded-xl"
        autoFocus
      />
      <Button type="submit" size="icon" className="h-12 w-12 rounded-xl hover-lift" disabled={!text.trim() || disabled || thinking}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );

  // ====== Pre-first-query (ChatGPT-like centered hero) ======
  if (!started) {
    return (
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col items-center justify-center animate-fade-in">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-elegant)]"
          style={{ backgroundImage: "var(--gradient-primary)" }}>
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">How can I help you today?</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your workspace AI assistant — preview</p>

        <div className="mt-8 w-full max-w-2xl">{Composer}</div>

        <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              className="rounded-xl border bg-card p-3 text-left text-sm text-foreground/80 transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground hover:shadow-sm"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ====== Post-first-query (composer pinned to bottom) ======
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col animate-fade-in">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-[var(--shadow-elegant)]"
          style={{ backgroundImage: "var(--gradient-primary)" }}>
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold">AI Chat</h1>
          <p className="text-sm text-muted-foreground">Your workspace AI assistant — preview</p>
        </div>
      </header>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--primary) 6%, transparent) 1px, transparent 0)",
            backgroundSize: "22px 22px",
            contain: "content",
          }}
        >
          {messages.map((m) => (
            <div key={m.id} className={`flex items-start gap-3 ${m.role === "user" ? "justify-end" : ""} animate-fade-in`}>
              {m.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow"
                  style={{ backgroundImage: "var(--gradient-primary)" }}>
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-card text-foreground border"
                }`}
              >
                {m.text}
              </div>
              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow"
                style={{ backgroundImage: "var(--gradient-primary)" }}>
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm shadow-sm">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-card p-3">
          {Composer}
          {disabled && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              ✨ AI Chat is in preview — full functionality coming soon.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
