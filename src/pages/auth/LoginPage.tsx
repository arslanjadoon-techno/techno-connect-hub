import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuthThemeReset } from "./useAuthThemeReset";

export default function LoginPage() {
  useAuthThemeReset();
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate("/ai-chat");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      const msg = "Email and password are required";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const baseUrl =
        import.meta.env.VITE_API_LOCAL_URL ||
        import.meta.env.VITE_API_DEV_URL ||
        "http://localhost:4570";

      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      let result: any;
      try {
        result = await response.json();
      } catch {
        throw new Error(`Server returned status ${response.status}`);
      }

      // 1. CASE: Login Failure (e.g. {"success": false, "message": "Invalid Password", "data": null})
      // Stay on login page, do NOT navigate, show backend error message in red and toast
      if (result.success === false || (!result.success && !result.data && !result.token)) {
        const errorMsg = result.message || "Invalid Email or Password";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const data = result.data || {};
      const token = data.token || result.token;
      const userData = data.user || result.user;

      // 2. CASE: Direct Login Successful (Token and User present - bypass 2FA / Login successful)
      // Land directly on home page without asking for Google Authenticator code
      if (token && userData) {
        setSession(token, userData);
        toast.success(result.message || "Login successful.");
        navigate("/ai-chat");
        return;
      }

      // 3. CASE: Initial Login - Setup 2FA Required (QR Code scan screen)
      if (data.qrCodeUrl || data.secretKey) {
        toast.message(
          result.message ||
            "Please scan the QR code using Google Authenticator to complete 2FA registration.",
        );
        navigate("/setup-2fa", {
          state: {
            email: email.trim(),
            secretKey: data.secretKey,
            qrCodeUrl: data.qrCodeUrl,
          },
        });
        return;
      }

      // 4. CASE: 2FA Verification Required (Existing user - only 6-digit verification code screen)
      const userEmail = email.trim();
      toast.message(
        result.message ||
          "Two-Factor Authentication required. Enter the 6-digit code from Google Authenticator.",
      );
      navigate(`/verify-2fa?email=${encodeURIComponent(userEmail)}`);
    } catch (err) {
      const msg = (err as Error).message || "An unexpected error occurred. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Hero side with curved right edge */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex clip-wave-right lg:-mr-16 lg:z-10"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        {/* Floating big blobs */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl animate-float-blob" />
        <div
          className="pointer-events-none absolute -bottom-10 right-0 h-[32rem] w-[32rem] rounded-full bg-white/10 blur-3xl animate-float-blob"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="pointer-events-none absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-white/15 blur-2xl animate-float-blob"
          style={{ animationDelay: "4s" }}
        />

        {/* Decorative bubbles (crisp circles) */}
        <span className="pointer-events-none absolute left-[12%] top-[18%] h-8 w-8 rounded-full bg-white/40 animate-float-blob" />
        <span
          className="pointer-events-none absolute left-[28%] top-[60%] h-6 w-6 rounded-full bg-white/30 animate-float-blob"
          style={{ animationDelay: "1.5s" }}
        />
        <span
          className="pointer-events-none absolute right-[18%] top-[22%] h-12 w-12 rounded-full bg-white/25 animate-float-blob"
          style={{ animationDelay: "2.5s" }}
        />
        <span
          className="pointer-events-none absolute right-[30%] bottom-[18%] h-9 w-9 rounded-full bg-white/35 animate-float-blob"
          style={{ animationDelay: "3.2s" }}
        />
        <span
          className="pointer-events-none absolute left-[45%] bottom-[30%] h-20 w-20 rounded-full border-2 border-white/30 animate-float-blob"
          style={{ animationDelay: "1s" }}
        />
        <span
          className="pointer-events-none absolute left-[55%] top-[14%] h-24 w-24 rounded-full border-2 border-white/20 animate-float-blob"
          style={{ animationDelay: "4.5s" }}
        />
        <span
          className="pointer-events-none absolute right-[10%] bottom-[40%] h-10 w-10 rounded-full bg-white/45 animate-float-blob"
          style={{ animationDelay: "0.8s" }}
        />

        <div className="relative z-10 flex items-center gap-3 animate-fade-in">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">MIS</div>
            <div className="text-xs text-white/70">Management Information System</div>
          </div>
        </div>

        <div
          className="relative z-10 max-w-md space-y-4 animate-fade-in"
          style={{ animationDelay: ".1s" }}
        >
          <h1 className="font-display text-4xl font-semibold leading-tight">
            One platform for every portal, every team, every decision.
          </h1>
          <p className="text-white/80">
            Commission, Leasing, Ranker and more — unified inside a single MIS workspace with
            role-aware visibility and real-time collaboration.
          </p>
        </div>
        <div className="relative z-10 text-xs text-white/60">© Techno Communications LLC</div>
      </div>

      {/* Form side — soft grey backdrop with crisp white card on top */}
      <div className="relative flex items-center justify-center overflow-hidden bg-muted/40 p-6 lg:pl-16">
        {/* Fixed decorative bubble on the top-right of the form side */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full opacity-20 blur-2xl"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        />
        <div className="pointer-events-none absolute right-16 top-16 h-40 w-40 rounded-full border border-primary/20" />
        <Card className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl animate-scale-in">
          <h2 className="font-display text-2xl font-semibold">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account.</p>

          {/* Inline Red Error Alert if backend returns failure */}
          {errorMessage && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-700 animate-fade-in shadow-xs">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email or NTID</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  placeholder="you@techno.com or NTID"
                  className="h-11 pl-9"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 pl-9 pr-10"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
