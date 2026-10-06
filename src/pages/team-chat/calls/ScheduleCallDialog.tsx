import { useEffect, useMemo, useState } from "react";
import { Calendar, ExternalLink, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBuddyEmail, getImageUrl } from "../chatHealper";
import { createGoogleCalendarEvent } from "../googleCalendar";
import type { CurrentUser, SelectedChat } from "./callTypes";

const DURATIONS = [15, 30, 45, 60, 90];
const REMINDERS = [0, 5, 10, 15, 30, 60];
interface Props {
  currentUser?: CurrentUser | null;
  onClose: () => void;
  open: boolean;
  selectedChat?: SelectedChat | null;
}
interface CalendarEvent {
  htmlLink?: string;
}

function getDefaultStartTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30, 0, 0);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function getAttendeeEmails(
  chat: SelectedChat | null | undefined,
  user: CurrentUser | null | undefined,
): string[] {
  if (chat?.type !== "channel") return [getBuddyEmail(chat?.raw) || chat?.subtitle || ""];
  const current = [user?.id, user?.userId, user?.user_id, user?.email]
    .map((v) => String(v || "").toLowerCase())
    .filter(Boolean);
  return (chat.raw?.participants || [])
    .filter(
      (person) =>
        ![person.id, person.userId, person.user_id, getBuddyEmail(person)]
          .map((v) => String(v || "").toLowerCase())
          .some((v) => current.includes(v)),
    )
    .map((person) => getBuddyEmail(person) || "");
}

export default function ScheduleCallDialog({ currentUser, onClose, open, selectedChat }: Props) {
  const attendeeEmails = useMemo(
    () => getAttendeeEmails(selectedChat, currentUser),
    [currentUser, selectedChat],
  );
  const [title, setTitle] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdEvent, setCreatedEvent] = useState<CalendarEvent | null>(null);
  useEffect(() => {
    if (open) {
      setTitle(`Call with ${selectedChat?.title || "this chat"}`);
      setStartDateTime(getDefaultStartTime());
      setDurationMinutes(30);
      setReminderMinutes(10);
      setError("");
      setCreatedEvent(null);
    }
  }, [open, selectedChat]);
  const handleSchedule = async () => {
    setSaving(true);
    setError("");
    try {
      setCreatedEvent(
        await createGoogleCalendarEvent({
          attendeeEmails,
          durationMinutes,
          reminderMinutes,
          startDateTime,
          title,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to schedule the call.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(value) => !value && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Schedule a call
          </DialogTitle>
        </DialogHeader>
        {createdEvent ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>The call has been added to your Google Calendar.</AlertDescription>
            </Alert>
            {createdEvent.htmlLink && (
              <Button asChild variant="outline" className="w-full">
                <a href={createdEvent.htmlLink} target="_blank" rel="noreferrer">
                  Open in Google Calendar <ExternalLink />
                </a>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <Avatar>
                <AvatarImage src={getImageUrl(selectedChat?.raw)} />
                <AvatarFallback>{selectedChat?.title?.charAt(0) || "C"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Scheduling with</p>
                <p className="truncate font-medium">{selectedChat?.title || "this chat"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="call-title">Call title</Label>
              <Input id="call-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="call-start">Starts</Label>
              <Input
                id="call-start"
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Duration</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                >
                  {DURATIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} minutes
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Reminder</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                >
                  {REMINDERS.map((n) => (
                    <option key={n} value={n}>
                      {n ? `${n} minutes before` : "No reminder"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {createdEvent ? "Done" : "Cancel"}
          </Button>
          {!createdEvent && (
            <Button onClick={handleSchedule} disabled={saving || !title.trim() || !startDateTime}>
              {saving && <Loader2 className="animate-spin" />} Add to Google Calendar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
