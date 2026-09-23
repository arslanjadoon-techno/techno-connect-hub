import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuthThemeReset } from "./useAuthThemeReset";
import { AuthHeroCarousel } from "./AuthHeroCarousel";

export default function LoginPage() {
  useAuthThemeReset();
  const { user, setSession } = useAuth();
  const { palette } = useTheme();
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
      const baseUrl = import.meta.env.VITE_API_DEV_URL;

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
    <div className="relative grid min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden lg:grid-cols-[1.05fr_1fr] bg-slate-50 dark:bg-slate-950">
      {/* Hero side with curved right edge — perfectly fits 100vh on desktop */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-6 lg:p-8 xl:p-12 text-white lg:flex clip-wave-right lg:-mr-16 lg:z-10 h-full"
        style={{ backgroundImage: palette.heroGradient || "var(--gradient-hero)" }}
      >
        {/* Ambient background corner glow - pinned to outer edges, never covering text */}
        <div className="pointer-events-none absolute -top-36 -left-36 h-[26rem] w-[26rem] rounded-full bg-white/10 blur-3xl animate-float-blob" />
        <div
          className="pointer-events-none absolute -bottom-24 -right-12 h-[30rem] w-[30rem] rounded-full bg-white/10 blur-3xl animate-float-blob"
          style={{ animationDelay: "2s" }}
        />

        {/* Decorative bubbles placed exclusively in empty negative space (margins & outer curve) */}
        {/* 1. Far Top-Right empty zone */}
        <span className="pointer-events-none absolute right-[7%] top-[8%] h-8 w-8 rounded-full bg-white/30 animate-float-blob" />
        <span
          className="pointer-events-none absolute right-[15%] top-[14%] h-12 w-12 rounded-full border-2 border-white/20 animate-float-blob"
          style={{ animationDelay: "3s" }}
        />

        {/* 2. Top-Center margin (well above main text) */}
        <span
          className="pointer-events-none absolute left-[44%] top-[3.5%] h-5 w-5 rounded-full bg-white/25 animate-float-blob"
          style={{ animationDelay: "1.2s" }}
        />

        {/* 3. Outer Curve boundary (middle-right empty zone) */}
        <span
          className="pointer-events-none absolute right-[5%] top-[38%] h-6 w-6 rounded-full bg-white/25 animate-float-blob"
          style={{ animationDelay: "2s" }}
        />
        <span
          className="pointer-events-none absolute right-[8%] bottom-[30%] h-10 w-10 rounded-full bg-white/30 animate-float-blob"
          style={{ animationDelay: "4.2s" }}
        />

        {/* 4. Lower-Right empty sweep */}
        <span
          className="pointer-events-none absolute right-[14%] bottom-[12%] h-14 w-14 rounded-full border-2 border-white/25 animate-float-blob"
          style={{ animationDelay: "1.8s" }}
        />
        <span
          className="pointer-events-none absolute right-[4%] bottom-[20%] h-7 w-7 rounded-full bg-white/35 animate-float-blob"
          style={{ animationDelay: "0.8s" }}
        />

        {/* Top Branding */}
        <div className="relative z-20 flex items-center gap-2.5 sm:gap-3 animate-fade-in">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur shadow-sm">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-display text-base sm:text-lg font-semibold tracking-tight">MIS</div>
            <div className="text-[11px] sm:text-xs text-white/70">Management Information System</div>
          </div>
        </div>

        {/* Sliding Center Section: Slide 1 Text / Slide 2 Network Hub Graph (elevated z-20 so text is always crystal clear) */}
        <div className="relative z-20 my-auto py-2">
          <AuthHeroCarousel />
        </div>

        {/* Bottom Footer */}
        <div className="relative z-20 text-[11px] sm:text-xs text-white/60">
          &copy; Techno Communications LLC
        </div>
      </div>

      {/* Form side — clean backdrop with ambient glow, dot grid, corner swoosh & refined card (dynamically styled per active palette) */}
      <div className="relative flex min-h-screen lg:min-h-0 h-full w-full items-center justify-center overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#f1f5fb] to-[#e8effc] p-4 sm:p-6 lg:p-8 xl:pl-16">
        {/* Ambient soft glow on top-right of form side */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 sm:h-80 sm:w-80 rounded-full blur-3xl opacity-30 transition-all duration-500"
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${palette.primaryGlow} 40%, transparent) 0%, color-mix(in srgb, ${palette.primary} 25%, transparent) 50%, transparent 75%)`,
          }}
        />

        {/* Subtle decorative concentric ring at top right */}
        <div
          className="pointer-events-none absolute right-8 sm:right-12 top-6 sm:top-8 h-40 w-40 sm:h-48 sm:w-48 rounded-full transition-all duration-500"
          style={{
            borderColor: `color-mix(in srgb, ${palette.primary} 18%, transparent)`,
            borderWidth: 1,
          }}
        />

        {/* Decorative Dot Grid Matrix (Top-Right of screen) */}
        <div className="pointer-events-none absolute right-4 sm:right-7 top-4 sm:top-7 grid grid-cols-6 gap-2 sm:gap-2.5 opacity-35">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full transition-colors duration-500"
              style={{
                backgroundColor: `color-mix(in srgb, ${palette.primary} 60%, transparent)`,
              }}
            />
          ))}
        </div>

        {/* Bottom-right decorative corner layered swoosh */}
        <div className="pointer-events-none absolute bottom-0 right-0 w-48 h-48 sm:w-64 sm:h-64 xl:w-72 xl:h-72 overflow-hidden z-0">
          <svg
            viewBox="0 0 320 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0 right-0 w-full h-full transition-all duration-500"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="br-wave-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.primary} stopOpacity={0.35} />
                <stop offset="60%" stopColor={palette.primaryGlow} stopOpacity={0.45} />
                <stop offset="100%" stopColor={palette.primaryGlow} stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="br-wave-fg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.primary} stopOpacity={0.95} />
                <stop offset="55%" stopColor={palette.primary} stopOpacity={0.9} />
                <stop offset="100%" stopColor={palette.primaryGlow} stopOpacity={1} />
              </linearGradient>
            </defs>
            {/* Soft background wave */}
            <path
              d="M320 110 C230 135 160 210 120 320 L320 320 Z"
              fill="url(#br-wave-bg)"
            />
            {/* Vibrant primary foreground wave */}
            <path
              d="M320 165 C240 185 185 245 155 320 L320 320 Z"
              fill="url(#br-wave-fg)"
            />
          </svg>
        </div>

        {/* Login Card with refined elevation & top-right corner theme layers */}
        <Card
          className="relative z-10 w-full max-w-[380px] sm:max-w-[400px] xl:max-w-[420px] rounded-[24px] sm:rounded-[28px] border border-white/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-7 xl:p-8 backdrop-blur-sm overflow-hidden animate-scale-in transition-shadow duration-500"
          style={{
            boxShadow: `0 18px 50px -12px color-mix(in srgb, ${palette.primary} 18%, transparent), 0 8px 20px -4px rgba(0,0,0,0.05)`,
          }}
        >
          {/* Top-right card decorative corner swoosh layers (matching image design, dynamically themed) */}
          <div className="pointer-events-none absolute top-0 right-0 w-28 h-28 sm:w-36 sm:h-36 overflow-hidden rounded-tr-[24px] sm:rounded-tr-[28px]">
            <svg
              viewBox="0 0 180 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute top-0 right-0 w-full h-full transition-all duration-500"
            >
              <defs>
                <linearGradient id="card-corner-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={palette.primary} stopOpacity={0.25} />
                  <stop offset="60%" stopColor={palette.primaryGlow} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={palette.primaryGlow} stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="card-corner-fg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={palette.primary} stopOpacity={0.5} />
                  <stop offset="50%" stopColor={palette.primaryGlow} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={palette.primaryGlow} stopOpacity={0.75} />
                </linearGradient>
              </defs>
              {/* Back layered curve */}
              <path
                d="M180 0 L70 0 C78 50 115 88 180 110 Z"
                fill="url(#card-corner-bg)"
              />
              {/* Front layered curve */}
              <path
                d="M180 0 L105 0 C112 40 138 68 180 82 Z"
                fill="url(#card-corner-fg)"
              />
            </svg>
          </div>

          {/* MIS Brand Header inside Card */}
          <div className="relative z-10 flex items-center gap-2.5 sm:gap-3">
            <div
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-white shadow-md transition-all duration-500 shrink-0"
              style={{
                background:
                  palette.primaryGradient ||
                  `linear-gradient(135deg, ${palette.primary}, ${palette.primaryGlow})`,
                boxShadow: `0 4px 14px color-mix(in srgb, ${palette.primary} 30%, transparent)`,
              }}
            >
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                MIS
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Management Information System
              </div>
            </div>
          </div>

          {/* Welcome Title & Subtitle */}
          <div className="relative z-10 mt-3.5 sm:mt-4">
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome back
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Sign in to your account to continue.
            </p>
          </div>

          {/* Inline Red Error Alert if backend returns failure */}
          {errorMessage && (
            <div className="relative z-10 mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-700 animate-fade-in shadow-xs">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative z-10 mt-4 sm:mt-5 space-y-3 sm:space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email or NTID
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="text"
                  placeholder="admin@techno.com"
                  className="h-10 sm:h-10.5 rounded-lg sm:rounded-xl bg-[#f0f4fc]/80 dark:bg-slate-800/80 border-[#dce5f5] dark:border-slate-700 pl-9 sm:pl-10 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white focus:ring-4 transition-all"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-10 sm:h-10.5 rounded-lg sm:rounded-xl bg-[#f0f4fc]/80 dark:bg-slate-800/80 border-[#dce5f5] dark:border-slate-700 pl-9 sm:pl-10 pr-9 sm:pr-10 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white focus:ring-4 transition-all"
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-0.5">
                <Link
                  to="/forgot-password"
                  className="text-[11px] sm:text-xs font-medium hover:underline transition-colors"
                  style={{ color: palette.primary }}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="mt-1.5 sm:mt-2 h-10 sm:h-11 w-full rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-white cursor-pointer transition-all flex items-center justify-center gap-2"
              style={{
                backgroundImage:
                  palette.primaryGradient ||
                  `linear-gradient(90deg, ${palette.primary} 0%, ${palette.primaryGlow} 100%)`,
                boxShadow: `0 6px 20px -3px color-mix(in srgb, ${palette.primary} 35%, transparent)`,
              }}
              disabled={loading}
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>

            {/* Bottom Trust Badge Divider */}
            <div className="pt-2 sm:pt-2.5 flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 font-medium">
              <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span>Secure &bull; Reliable &bull; Built for You</span>
              <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
