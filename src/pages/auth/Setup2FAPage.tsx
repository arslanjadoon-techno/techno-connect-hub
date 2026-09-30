import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, ShieldCheck, Smartphone, Copy, CheckCircle2 } from "lucide-react";
import { authService } from "@/services/auth";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import AuthPageWrapper from "./AuthPageWrapper";
import ThemedQRCode from "./ThemedQRCode";

/**
 * Extracts the secret parameter from an otpauth:// URI if present.
 */
function extractSecretFromOtpauth(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const sec = u.searchParams.get("secret");
    if (sec) return sec;
  } catch {
    /* fallback to regex */
  }
  const match = url.match(/[?&]secret=([^&]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function Setup2FAPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const stateData = (location.state ?? null) as {
    email?: string;
    partialToken?: string;
    qrCode?: string;
    qrCodeUrl?: string;
    userName?: string;
    userId?: number;
    secretKey?: string;
  } | null;

  const email = stateData?.email ?? params.get("email") ?? "";
  const partialToken = stateData?.partialToken ?? "";
  const rawQrCodeUrl = stateData?.qrCodeUrl ?? "";
  const qrCodeBase64 = stateData?.qrCode ?? "";
  const userName = stateData?.userName ?? "";

  // Extract secret key if in otpauth:// or passed directly
  const secretKey = stateData?.secretKey || extractSecretFromOtpauth(rawQrCodeUrl);

  const { setSession } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;
    setLoading(true);
    try {
      if (!partialToken) {
        throw new Error("Missing verification token. Please sign in again.");
      }

      const res = await authService.totpVerify(partialToken, code.trim());
      if (res?.data?.token && res?.data?.user) {
        setSession(res.data.token, res.data.user);
        toast.success(res.message || "2FA verified — signed in successfully");
        setDone(true);
        navigate("/ai-chat");
        return;
      }

      throw new Error(res?.message || "Invalid verification code. Please try again.");
    } catch (err: any) {
      toast.error(err?.message || "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copySecret() {
    if (!secretKey) return;
    navigator.clipboard.writeText(secretKey);
    toast.success("Manual setup key copied to clipboard");
  }

  // Determine QR display format
  const isBase64Image =
    Boolean(qrCodeBase64) &&
    (qrCodeBase64.startsWith("data:image") ||
      (!qrCodeBase64.startsWith("http") && !qrCodeBase64.startsWith("otpauth:")));

  const qrImageSrc = isBase64Image
    ? qrCodeBase64.startsWith("data:image")
      ? qrCodeBase64
      : `data:image/png;base64,${qrCodeBase64}`
    : null;

  const otpauthUri = rawQrCodeUrl || (qrCodeBase64.startsWith("otpauth:") ? qrCodeBase64 : "");
  const hasQrAvailable = Boolean(qrImageSrc || otpauthUri || rawQrCodeUrl);

  return (
    <AuthPageWrapper
      title="Protect your account with Google Authenticator."
      subtitle="Add a second layer of security. Scan the QR code with Google Authenticator, then enter the 6-digit code to complete sign in."
      idPrefix="setup-2fa"
      cardMaxWidth="max-w-[390px] sm:max-w-[420px] xl:max-w-[440px]"
    >
      <Link
        to="/login"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>

      {done ? (
        <div className="space-y-4 text-center py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            2FA setup complete
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Redirecting to your dashboard…
          </p>
        </div>
      ) : !hasQrAvailable ? (
        <div className="animate-fade-in text-center py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Session Expired
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Two-factor authentication QR code is generated during sign in. Please sign in with your
            credentials to set up 2FA.
          </p>
          <div className="mt-6">
            <Button
              type="button"
              className="w-full h-11"
              onClick={() => navigate("/login", { replace: true })}
            >
              Return to Sign In
            </Button>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Scan with Authenticator
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Open Google Authenticator and scan the QR code below. Then enter the 6-digit code to
            continue.
          </p>

          {/* QR Code Display - responsive container */}
          <div className="mt-4 flex flex-col items-center">
            {qrImageSrc ? (
              <div className="p-3 bg-white rounded-2xl border shadow-xs flex items-center justify-center max-w-full">
                <img
                  src={qrImageSrc}
                  alt="Two-factor authentication QR code"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
              </div>
            ) : otpauthUri ? (
              <ThemedQRCode otpauthUrl={otpauthUri} size={205} />
            ) : (
              <ThemedQRCode qrCodeUrl={rawQrCodeUrl} size={205} />
            )}

            {userName && (
              <p className="mt-2 text-[11px] sm:text-xs text-muted-foreground text-center">
                Account: <span className="font-semibold text-foreground">{userName}</span>
                {email ? ` (${email})` : ""}
              </p>
            )}
          </div>

          {/* Manual setup key fallback */}
          {secretKey && (
            <div className="mt-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-muted/40 p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground">
                    <Smartphone className="h-3 w-3 shrink-0" /> Manual setup key
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs sm:text-sm font-medium select-all">
                    {secretKey}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copySecret}
                  title="Copy key"
                  className="h-8 px-2.5 shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="mt-4 sm:mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-center block text-xs sm:text-sm font-medium">
                Enter 6-digit code
              </Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                  <InputOTPGroup className="gap-1.5 sm:gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl border border-input text-base sm:text-lg font-semibold shadow-xs transition-all data-[active=true]:ring-2 data-[active=true]:ring-primary data-[active=true]:border-primary"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading || code.length < 6}>
              {loading ? "Verifying..." : "Verify & sign in"}
            </Button>
          </form>
        </div>
      )}
    </AuthPageWrapper>
  );
}
