import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Camera, Eye, EyeOff, Check, Palette as PaletteIcon, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { roleSubLabel } from "@/lib/role-label";
import { PALETTES, useTheme } from "@/lib/theme";

const BYPASS_2FA_KEY = "techno-bypass-2fa";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data, set } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const { palette, setPalette } = useTheme();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");

  // Password change state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  if (!user) return null;

  const onPickImage = (file: File) => {
    if (file.size > 2_000_000) { toast.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Name and email are required"); return;
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
    try { window.localStorage.setItem("techno-ticket-auth-v1", JSON.stringify(next)); } catch { /* ignore */ }
    toast.success("Profile updated");
  };

  const changePassword = () => {
    if (!currentPwd || !newPwd || !confirmPwd) { toast.error("All password fields are required"); return; }
    if (newPwd.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPwd !== confirmPwd) { toast.error("Passwords do not match"); return; }
    if (newPwd === currentPwd) { toast.error("New password must differ from current"); return; }
    toast.success("Password updated successfully");
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
      <header>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Update your profile, password, and theme.</p>
      </header>

      {/* Profile */}
      <Card className="p-6 hover-lift">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white shadow-[var(--shadow-elegant)]"
              style={{
                backgroundColor: user.avatarColor ?? "#0d7a5f",
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : "var(--gradient-primary)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!avatarUrl && <>{firstName[0]}{lastName[0]}</>}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow transition hover:scale-110 hover:bg-accent"
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
            <div className="text-sm text-muted-foreground">{roleSubLabel(user)}</div>
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
          <Button onClick={save} className="hover-lift">Save changes</Button>
        </div>
      </Card>

      {/* Password */}
      <Card className="p-6 hover-lift">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundImage: "var(--gradient-primary)" }}>
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Change password</h2>
            <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField label="Current password" value={currentPwd} onChange={setCurrentPwd} show={showCur} toggle={() => setShowCur((s) => !s)} />
          <div className="sm:col-span-1" />
          <PasswordField label="New password" value={newPwd} onChange={setNewPwd} show={showNew} toggle={() => setShowNew((s) => !s)} />
          <PasswordField label="Confirm new password" value={confirmPwd} onChange={setConfirmPwd} show={showConf} toggle={() => setShowConf((s) => !s)} />
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={changePassword} className="hover-lift">Update password</Button>
        </div>
      </Card>

      {/* Theme palette */}
      <Card className="p-6 hover-lift">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundImage: "var(--gradient-primary)" }}>
            <PaletteIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Color palette</h2>
            <p className="text-xs text-muted-foreground">Pick the accent — sidebar and buttons match automatically. Saved to your device only.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PALETTES.map((p) => {
            const active = palette.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPalette(p.id); toast.success(`Theme set to ${p.name}`); }}
                className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] ${
                  active ? "border-primary ring-2 ring-primary/40" : "border-border"
                }`}
              >
                <span
                  className="h-10 w-10 shrink-0 rounded-lg shadow-inner"
                  style={{ backgroundImage: `linear-gradient(135deg, ${p.primary}, ${p.primaryGlow})` }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="mt-1 flex gap-1">
                    {p.swatches.map((s, i) => (
                      <span key={i} className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: s }} />
                    ))}
                  </span>
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function PasswordField({
  label, value, onChange, show, toggle,
}: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
