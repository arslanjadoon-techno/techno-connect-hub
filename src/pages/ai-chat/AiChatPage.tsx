import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Bot, User as UserIcon } from "lucide-react";

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

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    submit(text);
  };

  const Composer = (
    <form onSubmit={send} className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? "AI chat is coming soon — stay tuned!" : "Ask anything..."}
        disabled={disabled || thinking}
        className="h-10 sm:h-10.5 flex-1 rounded-xl text-xs sm:text-sm"
        autoFocus
      />
      <Button
        type="submit"
        size="icon"
        className="h-10 w-10 sm:h-10.5 sm:w-10.5 rounded-xl hover-lift shrink-0"
        disabled={!text.trim() || disabled || thinking}
      >
        <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>
    </form>
  );

  // ====== Pre-first-query (ChatGPT-like centered hero) ======
  if (!started) {
    return (
      <div className="mx-auto flex h-[calc(100vh-6.5rem)] max-w-2xl flex-col items-center justify-center animate-fade-in px-2">
        <div
          className="mb-4 flex h-13 w-13 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-elegant)]"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          <Sparkles className="h-6.5 w-6.5" />
        </div>
        <h1 className="font-display text-2xl sm:text-[26px] font-semibold tracking-tight text-center">
          How can I help you today?
        </h1>
        <p className="mt-1 text-xs text-muted-foreground text-center">
          Your workspace AI assistant
        </p>

        <div className="mt-6 w-full max-w-xl">{Composer}</div>

        <div className="mt-4 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              className="rounded-xl border bg-card p-2.5 text-left text-xs text-foreground/80 transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground hover:shadow-xs"
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
    <div className="mx-auto flex h-[calc(100vh-6.5rem)] max-w-2xl flex-col animate-fade-in">
      <header className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-xs"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold leading-tight">AI Chat</h1>
          <p className="text-[11px] text-muted-foreground">Your workspace AI assistant</p>
        </div>
      </header>

      <Card className="flex flex-1 flex-col overflow-hidden p-0 rounded-xl">
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto p-3.5 sm:p-5"
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
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-card text-foreground border"
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
          {thinking && (
            <div className="flex items-start gap-2.5 animate-fade-in">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-xl rounded-bl-sm border bg-card px-3.5 py-2.5 text-xs sm:text-sm shadow-xs">
                <span className="inline-flex gap-1">
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-card p-2.5">
          {Composer}
          {disabled && (
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              ✨ AI Chat is in preview — full functionality coming soon.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default AIChatPage;
