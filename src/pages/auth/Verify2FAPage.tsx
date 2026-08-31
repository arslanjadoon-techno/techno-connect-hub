import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import AuthHero from "./AuthHero";

/**
 * Step 2 of login when 2FA is enabled. Reached automatically after
 * /auth/login returns requires2FA. Submits to /auth/login/verify-2fa
 * and stores the returned session.
 */
export default function Verify2FAPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const { setSession } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Missing email. Sign in again.");
      navigate("/login");
      return;
    }
    if (code.length < 6) return;
    setLoading(true);
    try {
      // --- ORIGINAL API CALL COMMENTED FOR TESTING --- //
      //  const res = await authApi.twoFaLoginVerify(email, code.trim());

      console.log("Email in verify 2fa page: ", email);

      // --- LOCAL TESTING URL direct call --- //
      const response = await fetch("http://localhost:4570/auth/login/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const res = await response.json();
      // ------------------------------------ //

      setSession(res.data.token, res.data.user);
      toast.success("Signed in successfully");
      navigate("/ai-chat");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AuthHero
        title="One more step to keep your account safe."
        subtitle="Open Google Authenticator and enter the 6-digit code generated for Techno MIS."
      />

      <div className="flex items-center justify-center bg-muted/40 p-6 lg:pl-16">
        <Card className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl animate-scale-in">
          <Link
            to="/login"
            className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>

          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-semibold">Two-factor verification</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the 6-digit code for{" "}
            <span className="font-medium text-foreground">{email || "your account"}</span>.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-center block">Authenticator code</Label>
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
              {loading ? "Verifying..." : "Verify & sign in"}
            </Button>
            <Link
              to={`/setup-2fa${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="block text-center text-xs text-muted-foreground hover:underline"
            >
              Need to set up Google Authenticator?
            </Link>
          </form>
        </Card>
      </div>
    </div>
  );
}
