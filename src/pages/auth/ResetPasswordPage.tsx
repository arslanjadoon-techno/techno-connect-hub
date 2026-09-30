import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import AuthPageWrapper from "./AuthPageWrapper";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
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
    <AuthPageWrapper
      title="Choose a new password."
      subtitle="Use 8+ characters with a mix of letters, numbers, and symbols for the best protection."
      idPrefix="reset-pwd"
      cardMaxWidth="max-w-[390px] sm:max-w-[420px] xl:max-w-[440px]"
    >
      <Link
        to="/login"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>

      {!tokenValid ? (
        <div className="space-y-3">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Invalid or expired link
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            This reset link is missing or has expired. Please request a new one.
          </p>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Request new link</Link>
          </Button>
        </div>
      ) : done ? (
        <div className="space-y-4 text-center py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Password updated
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Redirecting you to sign in...
          </p>
        </div>
      ) : (
        <>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Set new password
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Enter and confirm your new password.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <PwdField
              label="New password"
              id="pwd"
              value={pwd}
              onChange={setPwd}
              show={showPwd}
              toggle={() => setShowPwd((v) => !v)}
            />
            <PwdField
              label="Confirm password"
              id="confirm"
              value={confirm}
              onChange={setConfirm}
              show={showConfirm}
              toggle={() => setShowConfirm((v) => !v)}
            />
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </>
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
