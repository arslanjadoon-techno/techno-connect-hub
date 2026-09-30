import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShieldAlert, User, CheckCircle2 } from "lucide-react";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import AuthHero from "./AuthHero";

export default function Reset2FAPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const stateData = (location.state ?? null) as {
    email?: string;
    userName?: string;
    userId?: number;
    partialToken?: string;
  } | null;

  const initialEmail = stateData?.email ?? params.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = email.trim();
    if (!identifier) {
      toast.error("Please enter your Email or NTID.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.reset2Fa(identifier);
      toast.success(
        res.message ||
          "Two-Factor Authentication reset — the user will be asked to set it up again on next login.",
      );
      setDone(true);
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset Two-Factor Authentication. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (initialEmail) {
      navigate(`/verify-2fa?email=${encodeURIComponent(initialEmail)}`, {
        state: stateData,
      });
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AuthHero
        title="Reset your Two-Factor Authentication."
        subtitle="If you lost access or deleted your Google Authenticator account, confirm your Email or NTID to reset 2FA."
      />

      <div className="flex items-center justify-center bg-muted/40 p-6 lg:pl-16">
        <Card className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl animate-scale-in">
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          {done ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-semibold">2FA Reset Complete</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your Two-Factor Authentication has been reset. Redirecting you to the sign-in page
                to set up a new QR code…
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="font-display text-2xl font-semibold">Confirm 2FA Reset</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Confirm your Email or NTID below to reset your Google Authenticator configuration.
                On your next login, you will scan a fresh QR code.
              </p>

              <form onSubmit={handleConfirmReset} className="mt-6 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="emailOrNtid">Email or NTID</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="emailOrNtid"
                      type="text"
                      required
                      placeholder="e.g. IVQ44285 or you@techno.com"
                      className="h-11 pl-9 font-medium"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200/50 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  Resetting 2FA allows you to register your account again on Google Authenticator.
                  You will be prompted with a new QR code after entering your password.
                </div>

                <div className="space-y-2 pt-1">
                  <Button type="submit" className="h-11 w-full" disabled={loading || !email.trim()}>
                    {loading ? "Resetting 2FA..." : "Confirm & Reset 2FA"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
