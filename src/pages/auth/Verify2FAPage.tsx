import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api/client";
import { authService } from "@/services/auth";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import AuthPageWrapper from "./AuthPageWrapper";

export default function Verify2FAPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const stateData = (location.state ?? null) as {
    email?: string;
    partialToken?: string;
    userName?: string;
    userId?: number;
  } | null;

  const email = stateData?.email ?? params.get("email") ?? "";
  const partialToken = stateData?.partialToken ?? "";
  const userName = stateData?.userName ?? "";

  const { setSession } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setLoading(true);
    try {
      if (partialToken) {
        const res = await authService.totpVerify(partialToken, code.trim());
        if (res?.data?.token && res?.data?.user) {
          setSession(res.data.token, res.data.user);
          toast.success(res.message || "Signed in successfully");
          navigate("/ai-chat");
          return;
        }
      } else if (email) {
        const res = await authApi.twoFaLoginVerify(email, code.trim());
        setSession(res.data.token, res.data.user);
        toast.success(res.message || "Signed in successfully");
        navigate("/ai-chat");
        return;
      } else {
        toast.error("Session expired. Please sign in again.");
        navigate("/login");
        return;
      }
    } catch (err: any) {
      toast.error(err?.message || "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReset2Fa = () => {
    const userIdentifier = email.trim();
    navigate(`/reset-2fa${userIdentifier ? `?email=${encodeURIComponent(userIdentifier)}` : ""}`, {
      state: {
        email: userIdentifier,
        userName,
        userId: stateData?.userId,
        partialToken,
      },
    });
  };

  return (
    <AuthPageWrapper
      title="One more step to keep your account safe."
      subtitle="Open Google Authenticator and enter the 6-digit code to complete sign in."
      idPrefix="verify-2fa"
      cardMaxWidth="max-w-[380px] sm:max-w-[400px] xl:max-w-[420px]"
    >
      <Link
        to="/login"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>

      <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Two-factor verification
      </h2>
      <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        Enter the 6-digit verification code for{" "}
        <span className="font-medium text-foreground">
          {userName ? `${userName} (${email || "your account"})` : email || "your account"}
        </span>
        .
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label className="text-center block text-xs sm:text-sm font-medium">
            Authenticator code
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
        <button
          type="button"
          onClick={handleOpenReset2Fa}
          disabled={loading}
          className="block w-full text-center text-xs text-muted-foreground transition hover:text-foreground hover:underline disabled:opacity-50 cursor-pointer pt-1"
        >
          Need to set up Google Authenticator?
        </button>
      </form>
    </AuthPageWrapper>
  );
}
