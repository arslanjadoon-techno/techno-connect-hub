import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShieldCheck, ArrowLeft, MailCheck, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — Techno Ticket Portal" }] }),
  component: ForgotPasswordPage,
});

type Step = "email" | "otp" | "reset" | "done";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      toast.success("OTP sent to your email");
      setStep("otp");
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.verifyOtp(email.trim(), otp.trim());
      toast.success("OTP verified");
      setStep("reset");
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  };

  const resetPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), otp.trim(), pwd, confirm);
      toast.success("Password has been reset");
      setStep("done");
      setTimeout(() => navigate({ to: "/login" }), 1500);
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between p-10 text-white lg:flex"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundImage: "var(--gradient-gold)" }}>
            <ShieldCheck className="h-6 w-6 text-[oklch(0.25_0.05_80)]" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">Techno Communications</div>
            <div className="text-xs text-white/70">Internal Ticket Portal</div>
          </div>
        </div>
        <div className="relative z-10 max-w-md space-y-4">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Recover your account in 3 quick steps.
          </h1>
          <p className="text-white/80">
            We'll email you a one-time code to verify it's really you, then you can set a
            new password.
          </p>
        </div>
        <div className="text-xs text-white/60">© Techno Communications LLC</div>
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-30 blur-3xl" style={{ backgroundImage: "var(--gradient-gold)" }} />
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <Link to="/login" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>

          {/* Step indicator */}
          <div className="mb-5 flex items-center gap-2 text-xs">
            <StepDot active={step === "email"} done={step !== "email"} label="Email" />
            <div className="h-px flex-1 bg-border" />
            <StepDot active={step === "otp"} done={step === "reset" || step === "done"} label="OTP" />
            <div className="h-px flex-1 bg-border" />
            <StepDot active={step === "reset"} done={step === "done"} label="Reset" />
          </div>

          {step === "email" && (
            <>
              <h2 className="font-display text-2xl font-semibold">Reset your password</h2>
              <p className="mt-1 text-sm text-muted-foreground">Enter the email on your account.</p>
              <form onSubmit={sendOtp} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@techno.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !email}>
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MailCheck className="h-6 w-6" />
              </div>
              <h2 className="font-display text-center text-2xl font-semibold">Enter verification code</h2>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                We sent a 6-digit OTP to <span className="font-medium text-foreground">{email}</span>.
              </p>
              <form onSubmit={verifyOtp} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="otp">OTP</Label>
                  <Input id="otp" inputMode="numeric" maxLength={6} placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading || otp.length < 4}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
                <button type="button" onClick={() => setStep("email")} className="block w-full text-center text-xs text-muted-foreground hover:underline">
                  Use a different email
                </button>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <h2 className="font-display text-2xl font-semibold">Set new password</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>
              <form onSubmit={resetPwd} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pwd">New password</Label>
                  <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-semibold">Password updated</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
          done ? "bg-primary text-primary-foreground" :
          active ? "bg-primary/15 text-primary ring-2 ring-primary/30" :
          "bg-muted text-muted-foreground"
        }`}
      >
        {done ? "✓" : label[0]}
      </span>
      <span className={`text-[11px] ${active || done ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}
