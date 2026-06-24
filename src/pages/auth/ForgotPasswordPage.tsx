import { Link, useNavigate } from "react-router-dom";import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, ArrowLeft, MailCheck, CheckCircle2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api/client";
import { toast } from "sonner";

type Step = "email" | "otp" | "reset" | "done";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      toast.success("OTP sent to your email");
      setStep("otp");
    } catch (err) { toast.error((err as Error).message); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.verifyOtp(email.trim(), otp.trim());
      toast.success("OTP verified");
      setStep("reset");
    } catch (err) { toast.error((err as Error).message); }
    finally { setLoading(false); }
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
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) { toast.error((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float-blob" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl animate-float-blob" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 flex items-center gap-3 animate-fade-in">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">Techno Communications</div>
            <div className="text-xs text-white/70">Internal Ticket Portal</div>
          </div>
        </div>
        <div className="relative z-10 max-w-md space-y-4 animate-fade-in" style={{ animationDelay: ".1s" }}>
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Recover your account in 3 quick steps.
          </h1>
          <p className="text-white/80">
            We'll email a one-time code to verify it's you, then you can set a new password.
          </p>
        </div>
        <div className="relative z-10 text-xs text-white/60">© Techno Communications LLC</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-[var(--shadow-elegant)] animate-scale-in">
          <Link to="/login" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>

          <div className="mb-5 flex items-center gap-2 text-xs">
            <StepDot active={step === "email"} done={step !== "email"} label="Email" />
            <div className="h-px flex-1 bg-border" />
            <StepDot active={step === "otp"} done={step === "reset" || step === "done"} label="OTP" />
            <div className="h-px flex-1 bg-border" />
            <StepDot active={step === "reset"} done={step === "done"} label="Reset" />
          </div>

          {step === "email" && (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-semibold">Reset your password</h2>
              <p className="mt-1 text-sm text-muted-foreground">Enter the email on your account.</p>
              <form onSubmit={sendOtp} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@techno.com" className="h-11 pl-9"
                      value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading || !email}>
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
              </form>
            </div>
          )}

          {step === "otp" && (
            <div className="animate-fade-in">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
                style={{ animation: "pulse-ring 2s infinite" }}>
                <MailCheck className="h-7 w-7" />
              </div>
              <h2 className="font-display text-center text-2xl font-semibold">Enter verification code</h2>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                We sent a 6-digit OTP to <span className="font-medium text-foreground">{email}</span>.
              </p>
              <form onSubmit={verifyOtp} className="mt-6 space-y-5">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={(v) => setOtp(v)}>
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="h-12 w-12 rounded-lg border border-input text-lg font-semibold shadow-sm transition-all data-[active=true]:ring-2 data-[active=true]:ring-primary data-[active=true]:border-primary"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading || otp.length < 6}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
                <button type="button" onClick={() => setStep("email")} className="block w-full text-center text-xs text-muted-foreground hover:underline">
                  Use a different email
                </button>
              </form>
            </div>
          )}

          {step === "reset" && (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-semibold">Set new password</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>
              <form onSubmit={resetPwd} className="mt-6 space-y-4">
                <PwdField label="New password" id="pwd" value={pwd} onChange={setPwd} show={showPwd} toggle={() => setShowPwd(v => !v)} />
                <PwdField label="Confirm password" id="confirm" value={confirm} onChange={setConfirm} show={showConfirm} toggle={() => setShowConfirm(v => !v)} />
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center animate-fade-in">
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

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
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
