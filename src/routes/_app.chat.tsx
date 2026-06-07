import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import { canManageChatGroups, visibleChatGroups } from "@/lib/permissions";
import { ALL_DEPARTMENTS, type Department } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Users as UsersIcon, Plus, MessageSquarePlus, Search, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/chat")({
  head: () => ({ meta: [{ title: "Team Chat — Techno Ticket Portal" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { user } = useAuth();
  const { data, set } = useData();
  const groups = useMemo(() => user ? visibleChatGroups(user, data.chatGroups) : [], [user, data.chatGroups]);
  const [activeId, setActiveId] = useState<string>(groups[0]?.id ?? "");
  const [text, setText] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId && groups[0]) setActiveId(groups[0].id);
  }, [groups, activeId]);

  const messages = useMemo(
    () => data.chatMessages.filter((m) => m.groupId === activeId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data.chatMessages, activeId],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, activeId]);

  if (!user) return null;
  const activeGroup = groups.find((g) => g.id === activeId);
  const canCreate = canManageChatGroups(user);

  const send = () => {
    if (!text.trim() || !activeGroup) return;
    set("chatMessages", [
      ...data.chatMessages,
      {
        id: `m-${Date.now()}`,
        groupId: activeGroup.id,
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName}`,
        message: text.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setText("");
  };

  const startDirectMessage = (otherId: string) => {
    const other = data.users.find((u) => u.id === otherId);
    if (!other) return;
    const dmName = `DM: ${other.firstName} ${other.lastName}`;
    const existing = data.chatGroups.find(
      (g) => g.name === dmName && g.memberIds.length === 2 &&
        g.memberIds.includes(user.id) && g.memberIds.includes(other.id),
    );
    if (existing) { setActiveId(existing.id); return; }
    const g = {
      id: `cg-dm-${Date.now()}`,
      name: dmName,
      memberIds: [user.id, other.id],
    };
    set("chatGroups", [...data.chatGroups, g]);
    setActiveId(g.id);
    toast.success(`Chat started with ${other.firstName}`);
  };

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[300px_1fr] animate-fade-in">
      <Card className="flex flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <div>
            <h2 className="font-display font-semibold">Groups</h2>
            <p className="text-xs text-muted-foreground">{groups.length} available</p>
          </div>
          <div className="flex items-center gap-1.5">
            <DirectMessagePicker onPick={startDirectMessage} />
            {canCreate && (
              <Dialog open={newOpen} onOpenChange={setNewOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="hover-lift"><Plus className="mr-1 h-4 w-4" /> New</Button>
                </DialogTrigger>
                <NewGroupDialog
                  onCreate={(g) => {
                    set("chatGroups", [...data.chatGroups, g]);
                    setActiveId(g.id);
                    setNewOpen(false);
                    toast.success("Group created");
                  }}
                />
              </Dialog>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {groups.map((g) => {
            const lastMsg = [...data.chatMessages].reverse().find((m) => m.groupId === g.id);
            const active = g.id === activeId;
            return (
              <button
                key={g.id}
                onClick={() => setActiveId(g.id)}
                className={`mb-1 flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                  active ? "bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundImage: "var(--gradient-primary)" }}
                >
                  <UsersIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{g.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {lastMsg ? `${lastMsg.authorName}: ${lastMsg.message}` : "No messages yet"}
                  </div>
                </div>
              </button>
            );
          })}
          {groups.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No chat groups available.
            </p>
          )}
        </div>
      </Card>

      <Card className="flex flex-col overflow-hidden p-0">
        {activeGroup ? (
          <>
            <div className="flex items-center gap-3 border-b p-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <UsersIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display font-semibold">{activeGroup.name}</div>
                <div className="text-xs text-muted-foreground">{activeGroup.memberIds.length} members</div>
              </div>
            </div>
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto p-4"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--primary) 6%, transparent) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            >
              {messages.map((m) => {
                const mine = m.authorId === user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-card text-foreground"
                    }`}>
                      {!mine && (
                        <div className="mb-0.5 text-[11px] font-semibold opacity-80">{m.authorName}</div>
                      )}
                      <div className="whitespace-pre-wrap">{m.message}</div>
                      <div className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Say hello to your team 👋
                </p>
              )}
            </div>
            <div className="border-t bg-card p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex items-center gap-2"
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!text.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a group to start chatting
          </div>
        )}
      </Card>
    </div>
  );
}

function NewGroupDialog({
  onCreate,
}: {
  onCreate: (g: { id: string; name: string; department?: Department; memberIds: string[] }) => void;
}) {
  const { user } = useAuth();
  const { data } = useData();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState<Department | "none">("none");
  const [memberIds, setMemberIds] = useState<string[]>(user ? [user.id] : []);

  const candidates = useMemo(
    () => department === "none" ? data.users : data.users.filter((u) => u.department === department),
    [data.users, department],
  );

  const toggle = (id: string) =>
    setMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Create new chat group</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Group name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AZ Field Ops" />
        </div>
        <div className="space-y-1.5">
          <Label>Department (optional)</Label>
          <Select value={department} onValueChange={(v) => setDepartment(v as typeof department)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific department</SelectItem>
              {ALL_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Members ({memberIds.length})</Label>
          <div className="max-h-60 overflow-y-auto rounded-md border p-2">
            {candidates.map((u) => (
              <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-muted">
                <Checkbox checked={memberIds.includes(u.id)} onCheckedChange={() => toggle(u.id)} />
                <span>{u.firstName} {u.lastName}</span>
                <span className="ml-auto text-xs text-muted-foreground">{u.department}</span>
              </label>
            ))}
            {candidates.length === 0 && (
              <p className="p-2 text-center text-xs text-muted-foreground">No users.</p>
            )}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!name.trim() || memberIds.length === 0}
          onClick={() => onCreate({
            id: `cg-${Date.now()}`,
            name: name.trim(),
            department: department === "none" ? undefined : department,
            memberIds,
          })}
        >
          Create group
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function DirectMessagePicker({ onPick }: { onPick: (userId: string) => void }) {
  const { user } = useAuth();
  const { data } = useData();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const candidates = useMemo(() => {
    const others = data.users.filter((u) => u.id !== user?.id);
    const query = q.trim().toLowerCase();
    if (!query) return others.slice(0, 30);
    return others.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.email} ${u.department}`.toLowerCase().includes(query),
    ).slice(0, 30);
  }, [data.users, q, user?.id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="hover-lift" title="Start direct message">
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search user..."
            className="h-9 pl-8"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {candidates.length === 0 && (
            <p className="p-3 text-center text-xs text-muted-foreground">No users found.</p>
          )}
          {candidates.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onPick(u.id); setOpen(false); setQ(""); }}
              className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm transition hover:bg-muted"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs"
                style={{ backgroundImage: "var(--gradient-primary)" }}>
                <UserIcon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{u.firstName} {u.lastName}</div>
                <div className="truncate text-xs text-muted-foreground">{u.department}</div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
