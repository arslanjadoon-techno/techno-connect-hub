import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Mail, ShieldCheck, Smartphone, Copy, CheckCircle2 } from "lucide-react";
import { authApi, type TwoFaSetupData } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import AuthHero from "./AuthHero";
import ThemedQRCode from "./ThemedQRCode";

/**
 * Two-step 2FA setup. Two entry paths:
 *   A. Direct visit / settings — user types email, we call /auth/2fa/setup for a QR.
 *   B. Redirected from /auth/login when backend returned qrCodeUrl+secretKey directly
 *      (Case 3 of the auth doc). The QR is read from location.state, no extra call.
 * After scanning, POST /auth/2fa/verify-and-enable returns a JWT — store it and
 * navigate straight to the dashboard (Case 3 final step).
 */
export default function Setup2FAPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const stateData = (location.state ?? null) as
    | { email?: string; secretKey?: string; qrCodeUrl?: string }
    | null;
  const initialEmail = stateData?.email ?? params.get("email") ?? "";
  const { setSession } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [setup, setSetup] = useState<TwoFaSetupData | null>(
    stateData?.qrCodeUrl
      ? { qrCodeUrl: stateData.qrCodeUrl, secretKey: stateData.secretKey ?? "" }
      : null,
  );
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Auto-trigger setup only when arriving with an email but no pre-fetched QR.
  useEffect(() => {
    if (initialEmail && !setup) handleSetup(initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSetup(addr: string) {
    if (!addr.trim()) return toast.error("Email is required");
    setLoading(true);
    try {
      const res = await authApi.twoFaSetup(addr.trim());
      setSetup(res.data);
      toast.success("Scan the QR with Google Authenticator");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;
    setLoading(true);
    try {
      const res: any = await authApi.twoFaVerifyEnable(email.trim(), code.trim());
      // New backend returns token+user here; if present, log the user straight in.
      if (res?.data?.token && res?.data?.user) {
        setSession(res.data.token, res.data.user);
        toast.success("2FA enabled — signed in");
        navigate("/ai-chat");
        return;
      }
      toast.success("2FA enabled successfully");
      setDone(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function copySecret() {
    if (!setup?.secretKey) return;
    navigator.clipboard.writeText(setup.secretKey);
    toast.success("Secret copied");
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AuthHero
        title="Protect your account with Google Authenticator."
        subtitle="Add a second layer of security. Scan the QR with the Google Authenticator app, then enter the 6-digit code to enable 2FA."
      />

      <div className="flex items-center justify-center bg-muted/40 p-6 lg:pl-16">
        <Card className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl animate-scale-in">
          <Link to="/login" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>

          {done ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-semibold">2FA enabled</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
            </div>
          ) : !setup ? (
            <div className="animate-fade-in">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="font-display text-2xl font-semibold">Enable 2FA</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your account email to generate a Google Authenticator setup.
              </p>
              <form
                onSubmit={(e) => { e.preventDefault(); handleSetup(email); }}
                className="mt-6 space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email" type="email" required placeholder="you@techno.com"
                      className="h-11 pl-9"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading || !email}>
                  {loading ? "Generating..." : "Generate QR code"}
                </Button>
              </form>
            </div>
          ) : (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-semibold">Scan with Authenticator</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open Google Authenticator and scan the code below. Then enter the 6-digit code it shows.
              </p>

              <div className="mt-5 flex flex-col items-center">
                <ThemedQRCode qrCodeUrl={setup.qrCodeUrl} size={220} />
              </div>

              <div className="mt-4 rounded-xl border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <Smartphone className="h-3 w-3" /> Manual setup key
                    </div>
                    <div className="mt-1 truncate font-mono text-sm font-medium">
                      {setup.secretKey}
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={copySecret}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <form onSubmit={handleVerify} className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-center block">Enter 6-digit code</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
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
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading || code.length < 6}>
                  {loading ? "Verifying..." : "Verify & enable 2FA"}
                </Button>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
