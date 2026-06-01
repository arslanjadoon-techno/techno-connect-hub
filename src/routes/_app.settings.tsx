import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Techno Ticket Portal" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { data, set } = useData();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");

  if (!user) return null;

  const onPickImage = (file: File) => {
    if (file.size > 2_000_000) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    const next = {
      ...user,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
    };
    set("users", data.users.map((u) => (u.id === user.id ? next : u)));
    try {
      window.localStorage.setItem("techno-ticket-auth-v1", JSON.stringify(next));
    } catch { /* ignore */ }
    toast.success("Profile updated");
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Update your profile information.</p>
      </header>

      <Card className="p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{
                backgroundColor: user.avatarColor ?? "#0d7a5f",
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!avatarUrl && <>{firstName[0]}{lastName[0]}</>}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow hover:bg-accent"
              title="Change photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); }}
            />
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-display text-lg font-semibold">{firstName} {lastName}</div>
            <div className="text-sm text-muted-foreground">{user.department} • {user.role.replace("_", " ")}</div>
            <p className="text-xs text-muted-foreground">JPG or PNG. Max 2MB.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>First name</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Last name</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 555 5555" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={save}>Save changes</Button>
        </div>
      </Card>
    </div>
  );
}
