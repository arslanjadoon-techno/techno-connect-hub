import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Camera, Eye, EyeOff, Check, Palette as PaletteIcon, Lock, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PALETTES, useTheme } from "@/lib/theme";
import { usersApi } from "@/lib/api/client";

interface StoredUser {
  id: number;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  profileImage?: string | null;
  department?: { id: number; name: string } | null;
  departmentName?: string | null;
  bypassTwoFactor?: boolean;
  [k: string]: any;
}

function readStoredUser(): StoredUser | null {
  try {
    const raw = window.localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch { return null; }
}
function writeStoredUser(u: StoredUser) {
  try { window.localStorage.setItem("user", JSON.stringify(u)); } catch { /* ignore */ }
}

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { palette, setPalette } = useTheme();

  const [storedUser, setStoredUser] = useState<StoredUser | null>(() => readStoredUser());

  const [fullName, setFullName] = useState(storedUser?.fullName ?? "");
  const [email, setEmail] = useState(storedUser?.email ?? "");
  const [phone, setPhone] = useState(storedUser?.phone ?? "");
  const [departmentName, setDepartmentName] = useState(
    storedUser?.department?.name ?? storedUser?.departmentName ?? "",
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(storedUser?.profileImage ?? "");

  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Bypass 2FA — backend sourced
  const [bypass2fa, setBypass2fa] = useState<boolean>(Boolean(storedUser?.bypassTwoFactor));
  const [togglingBypass, setTogglingBypass] = useState(false);

  useEffect(() => {
    setBypass2fa(Boolean(storedUser?.bypassTwoFactor));
  }, [storedUser?.bypassTwoFactor]);

  if (!storedUser) return null;

  const initials = (fullName || "U U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "U";

  const onPickImage = (file: File) => {
    if (file.size > 2_000_000) { toast.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Full name aur email zaroori hain");
      return;
    }
    try {
      setSavingProfile(true);
      const res = await usersApi.update({
        id: storedUser.id,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        departmentName: departmentName?.trim() || null,
        // profileImage isn't part of AddUserPayload typings yet — send via cast
        ...(avatarUrl ? { profileImage: avatarUrl } as any : {}),
      } as any);

      const merged: StoredUser = { ...storedUser, ...(res.data as any) };
      // Ensure these fields are persisted even if backend response is sparse
      merged.fullName = fullName.trim();
      merged.email = email.trim();
      merged.phone = phone?.trim() || null;
      if (avatarUrl) merged.profileImage = avatarUrl;
      writeStoredUser(merged);
      setStoredUser(merged);
      toast.success(res.message || "Profile updated");
    } catch (err: any) {
      toast.error(err?.message || "Profile update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) { toast.error("All password fields are required"); return; }
    if (newPwd.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPwd !== confirmPwd) { toast.error("Passwords do not match"); return; }
    if (newPwd === currentPwd) { toast.error("New password must differ from current"); return; }
    try {
      setSavingPwd(true);
      const res = await usersApi.updatePassword({
        email: storedUser.email,
        oldPassword: currentPwd,
        newPassword: newPwd,
      });
      toast.success(res.message || "Password updated successfully");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err: any) {
      toast.error(err?.message || "Password update failed");
    } finally {
      setSavingPwd(false);
    }
  };

  const onToggleBypass = async (next: boolean) => {
    setBypass2fa(next); // optimistic
    try {
      setTogglingBypass(true);
      const res = await usersApi.toggle2FaBypass({
        email: storedUser.email,
        bypassStatus: next,
      });
      const merged: StoredUser = { ...storedUser, bypassTwoFactor: next };
      writeStoredUser(merged);
      setStoredUser(merged);
      toast.success(res.message || (next ? "2FA bypass enabled" : "2FA bypass disabled"));
    } catch (err: any) {
      setBypass2fa(!next); // revert
      toast.error(err?.message || "Could not update 2FA preference");
    } finally {
      setTogglingBypass(false);
    }
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
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : "var(--gradient-primary)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!avatarUrl && initials}
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
            <div className="font-display text-lg font-semibold">{fullName || "Unnamed user"}</div>
            <div className="text-sm text-muted-foreground">{email}</div>
            <p className="text-xs text-muted-foreground">JPG or PNG. Max 2MB.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. John Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 555 5555" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Department</Label>
            <Input value={departmentName ?? ""} onChange={(e) => setDepartmentName(e.target.value)} placeholder="e.g. Operations" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveProfile} disabled={savingProfile} className="hover-lift">
            {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
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
          <Button onClick={changePassword} disabled={savingPwd} className="hover-lift">
            {savingPwd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </div>
      </Card>

      {/* Two-factor authentication */}
      <Card className="p-6 hover-lift">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundImage: "var(--gradient-primary)" }}>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Bypass 2FA on login</h2>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                When enabled, sign-in skips the Google Authenticator step. Recommended only for
                trusted devices.
              </p>
            </div>
          </div>
          <Switch
            checked={bypass2fa}
            disabled={togglingBypass}
            onCheckedChange={onToggleBypass}
            aria-label="Bypass 2FA on login"
          />
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
