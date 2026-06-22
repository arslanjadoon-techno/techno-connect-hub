import { Link, useNavigate } from "react-router-dom";import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShieldCheck, ArrowLeft, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

({
  head: () => ({ meta: [{ title: "Reset password — Techno Ticket Portal" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
});

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const tokenValid = !!token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setDone(true);
    toast.success("Password updated. You can now sign in.");
    setTimeout(() => navigate("/login"), 1500);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between p-10 text-white lg:flex"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundImage: "var(--gradient-gold)" }}
          >
            <ShieldCheck className="h-6 w-6 text-[oklch(0.25_0.05_80)]" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">Techno Communications</div>
            <div className="text-xs text-white/70">Internal Ticket Portal</div>
          </div>
        </div>
        <div className="relative z-10 max-w-md space-y-4">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Choose a new password.
          </h1>
          <p className="text-white/80">
            Use 8+ characters with a mix of letters, numbers, and symbols for the best
            protection.
          </p>
        </div>
        <div className="text-xs text-white/60">© Techno Communications LLC</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <Link
            to="/login"
            className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>

          {!tokenValid ? (
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-semibold">Invalid or expired link</h2>
              <p className="text-sm text-muted-foreground">
                This reset link is missing or has expired. Please request a new one.
              </p>
              <Button asChild className="w-full">
                <Link to="/forgot-password">Request new link</Link>
              </Button>
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-semibold">Password updated</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-semibold">Set new password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter and confirm your new password.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <PwdField label="New password" id="pwd" value={pwd} onChange={setPwd} show={showPwd} toggle={() => setShowPwd(v => !v)} />
                <PwdField label="Confirm password" id="confirm" value={confirm} onChange={setConfirm} show={showConfirm} toggle={() => setShowConfirm(v => !v)} />
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function PwdField({ label, id, value, onChange, show, toggle }:
  { label: string; id: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} type={show ? "text" : "password"} className="h-11 pl-9 pr-10"
          value={value} onChange={(e) => onChange(e.target.value)} required />
        <button type="button" onClick={toggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
