import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, ShieldCheck, CheckCircle2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import AuthPageWrapper from "./AuthPageWrapper";

type Step = "email" | "otp" | "reset" | "done";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [partialToken, setPartialToken] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [otp, setOtp] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email or NTID.");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      if (res && res.success) {
        setPartialToken(res.data?.partialToken || "");
        setUserName(res.data?.userName || "");
        setUserId(res.data?.userId || (res.data as any)?.userID);
        toast.success(res.message || "Enter your two-factor authentication code to continue.");
        setStep("otp");
      } else {
        toast.error(res?.message || "Failed to process request");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.resetPasswordVerify(partialToken, otp.trim());
      if (res && res.success) {
        if (res.data?.partialToken) {
          setPartialToken(res.data.partialToken);
        }
        toast.success(res.message || "Code verified. Enter your new password.");
        setStep("reset");
      } else {
        toast.error(res?.message || "Invalid verification code.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const resetPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (pwd !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.resetPassword(partialToken, pwd);
      if (res && res.success) {
        toast.success(res.message || "Password reset successfully.");
        setStep("done");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        toast.error(res?.message || "Password reset failed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const isPasswordLengthOk = pwd.length >= 8;
  const isPasswordMatch = pwd.length > 0 && confirm.length > 0 && pwd === confirm;
  const isMismatch = confirm.length > 0 && pwd !== confirm;

  return (
    <AuthPageWrapper
      title="Recover your account in 3 quick steps."
      subtitle="Enter your email or NTID to verify your identity with two-factor authentication and reset your password."
      idPrefix="forgot-pwd"
      cardMaxWidth="max-w-[390px] sm:max-w-[420px] xl:max-w-[440px]"
    >
      <Link
        to="/login"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>

      <div className="mb-5 flex items-center gap-2 text-xs">
        <StepDot active={step === "email"} done={step !== "email"} label="Account" />
        <div className="h-px flex-1 bg-border" />
        <StepDot active={step === "otp"} done={step === "reset" || step === "done"} label="2FA" />
        <div className="h-px flex-1 bg-border" />
        <StepDot active={step === "reset"} done={step === "done"} label="Reset" />
      </div>

      {step === "email" && (
        <div className="animate-fade-in">
          <h2 className="font-display text-2xl font-semibold">Reset your password</h2>
          <p className="mt-1 text-sm text-muted-foreground">Enter the email or NTID on your account.</p>
          <form onSubmit={sendOtp} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email / NTID</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  placeholder="admin@techno.com or NTID"
                  className="h-11 pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full cursor-pointer" disabled={loading || !email.trim()}>
              {loading ? "Sending..." : "Continue"}
            </Button>
          </form>
        </div>
      )}

      {step === "otp" && (
        <div className="animate-fade-in">
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
            style={{ animation: "pulse-ring 2s infinite" }}
          >
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="font-display text-center text-2xl font-semibold">
            Two-Factor Verification
          </h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Enter the 6-digit code from Google Authenticator for{" "}
            <span className="font-medium text-foreground">
              {userName ? `${userName} (${email})` : email}
            </span>
            .
          </p>
          <form onSubmit={verifyOtp} className="mt-6 space-y-5">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={(v) => setOtp(v)} autoFocus>
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-12 w-12 rounded-lg border border-input text-lg font-semibold shadow-xs transition-all data-[active=true]:ring-2 data-[active=true]:ring-primary data-[active=true]:border-primary"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" className="h-11 w-full cursor-pointer" disabled={loading || otp.length < 6}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
              }}
              className="block w-full text-center text-xs text-muted-foreground hover:underline cursor-pointer"
            >
              Use a different email
            </button>
          </form>
        </div>
      )}

      {step === "reset" && (
        <div className="animate-fade-in">
          <h2 className="font-display text-2xl font-semibold">Set new password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a strong password with at least 8 characters.
          </p>
          <form onSubmit={resetPwd} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pwd">New password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pwd"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  className={`h-11 pl-9 pr-10 transition-colors ${
                    pwd.length > 0 && isPasswordLengthOk
                      ? "border-emerald-500/50 focus-visible:ring-emerald-500/30"
                      : ""
                  }`}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwd.length > 0 && !isPasswordLengthOk && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Password must be at least 8 characters ({pwd.length}/8)
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="confirm">Confirm password</Label>
                {isPasswordMatch && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 fade-in duration-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Passwords match
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  className={`h-11 pl-9 pr-16 transition-all duration-300 ${
                    isPasswordMatch
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-950 dark:text-emerald-100"
                      : isMismatch
                        ? "border-rose-300 focus-visible:ring-rose-500/20"
                        : ""
                  }`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {/* Animated Green Tick on Password Match */}
                  {isPasswordMatch && (
                    <div
                      className="flex items-center justify-center h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-xs animate-in zoom-in-50 fade-in duration-300"
                      title="Passwords match successfully"
                    >
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {isMismatch && (
                <p className="text-[11px] text-rose-500 animate-in fade-in duration-200">
                  Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full cursor-pointer transition-all duration-300"
              disabled={loading || !isPasswordLengthOk || !isPasswordMatch}
            >
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center animate-fade-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-semibold">Password updated</h2>
          <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
        </div>
      )}
    </AuthPageWrapper>
  );
}

function PwdField({
  label,
  id,
  value,
  onChange,
  show,
  toggle,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          className="h-11 pl-9 pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
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
          done
            ? "bg-primary text-primary-foreground"
            : active
              ? "bg-primary/15 text-primary ring-2 ring-primary/30"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? "✓" : label[0]}
      </span>
      <span
        className={`text-[11px] ${active || done ? "font-medium text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </div>
  );
}
