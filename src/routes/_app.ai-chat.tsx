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

function AIChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I'm your AI assistant. Ask me anything about your workspace.",
    },
  ]);
  const [text, setText] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setText("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: STATIC_REPLY }]);
      setThinking(false);
      setDisabled(true);
    }, 900);
  };

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
          <form onSubmit={send} className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={disabled ? "AI chat is coming soon — stay tuned!" : "Ask anything..."}
              disabled={disabled || thinking}
              className="h-11 flex-1"
            />
            <Button type="submit" size="icon" className="h-11 w-11" disabled={!text.trim() || disabled || thinking}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
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
