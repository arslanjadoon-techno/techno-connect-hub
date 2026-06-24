import { Link, useNavigate } from "react-router-dom";import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/ai-chat"); }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Email and password are required");
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if ("requires2FA" in result) {
        toast.message("Two-factor authentication required");
        navigate(`/verify-2fa?email=${encodeURIComponent(result.email)}`);
        return;
      }
      toast.success("Signed in successfully");
      navigate("/ai-chat");
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Hero side with curved right edge */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex lg:rounded-r-[40%_60%] lg:-mr-10 lg:shadow-[20px_0_60px_-20px_rgba(0,0,0,0.35)] lg:z-10"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        {/* Floating big blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float-blob" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-float-blob" style={{ animationDelay: "2s" }} />
        <div className="pointer-events-none absolute top-1/3 right-1/4 h-48 w-48 rounded-full bg-white/15 blur-2xl animate-float-blob" style={{ animationDelay: "4s" }} />

        {/* Small decorative bubbles (crisp circles) */}
        <span className="pointer-events-none absolute left-[12%] top-[18%] h-3 w-3 rounded-full bg-white/40 animate-float-blob" />
        <span className="pointer-events-none absolute left-[28%] top-[60%] h-2 w-2 rounded-full bg-white/30 animate-float-blob" style={{ animationDelay: "1.5s" }} />
        <span className="pointer-events-none absolute right-[18%] top-[22%] h-4 w-4 rounded-full bg-white/30 animate-float-blob" style={{ animationDelay: "2.5s" }} />
        <span className="pointer-events-none absolute right-[30%] bottom-[18%] h-2.5 w-2.5 rounded-full bg-white/40 animate-float-blob" style={{ animationDelay: "3.2s" }} />
        <span className="pointer-events-none absolute left-[45%] bottom-[30%] h-6 w-6 rounded-full border border-white/30 animate-float-blob" style={{ animationDelay: "1s" }} />
        <span className="pointer-events-none absolute left-[55%] top-[14%] h-8 w-8 rounded-full border border-white/20 animate-float-blob" style={{ animationDelay: "4.5s" }} />
        <span className="pointer-events-none absolute right-[10%] bottom-[40%] h-3 w-3 rounded-full bg-white/50 animate-float-blob" style={{ animationDelay: "0.8s" }} />

        <div className="relative z-10 flex items-center gap-3 animate-fade-in">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">Techno MIS</div>
            <div className="text-xs text-white/70">Management Information System</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-4 animate-fade-in" style={{ animationDelay: ".1s" }}>
          <h1 className="font-display text-4xl font-semibold leading-tight">
            One platform for every portal, every team, every decision.
          </h1>
          <p className="text-white/80">
            Ticketing, commission, and more — unified inside a single MIS workspace with role-aware
            visibility and real-time collaboration.
          </p>
        </div>
        <div className="relative z-10 text-xs text-white/60">© Techno Communications LLC</div>
      </div>

      {/* Form side — soft grey backdrop with crisp white card on top */}
      <div className="flex items-center justify-center bg-muted/40 p-6 lg:pl-16">
        <Card className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl animate-scale-in">
          <h2 className="font-display text-2xl font-semibold">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your portal account.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email" type="email" placeholder="you@techno.com"
                  className="h-11 pl-9"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
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
                  value={password} onChange={(e) => setPassword(e.target.value)} required
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
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="pt-1 text-center text-xs text-muted-foreground">
              Want to enable Google Authenticator?{" "}
              <Link to="/setup-2fa" className="font-medium text-primary hover:underline">
                Set up 2FA
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
