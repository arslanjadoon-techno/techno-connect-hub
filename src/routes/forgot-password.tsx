import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShieldCheck, ArrowLeft, MailCheck } from "lucide-react";
import { seedUsers } from "@/lib/mock/seed";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — Techno Ticket Portal" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock: pretend to send reset email regardless (don't leak which emails exist)
    await new Promise((r) => setTimeout(r, 700));
    const exists = seedUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
    setLoading(false);
    setSent(true);
    if (exists) toast.success("Reset link sent to your email");
    else toast.message("If that email exists, a reset link has been sent");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between p-10 text-white lg:flex"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundImage: "var(--gradient-gold)" }}
          >
            <ShieldCheck className="h-6 w-6 text-[oklch(0.25_0.05_80)]" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">Techno Communications</div>
            <div className="text-xs text-white/70">Internal Ticket Portal</div>
          </div>
        </div>
        <div className="relative z-10 max-w-md space-y-4">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Forgot your password? No worries.
          </h1>
          <p className="text-white/80">
            Enter your work email and we'll send a secure link to reset your password.
          </p>
        </div>
        <div className="text-xs text-white/60">© Techno Communications LLC</div>
        <div
          className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
          style={{ backgroundImage: "var(--gradient-gold)" }}
        />
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <Link
            to="/login"
            className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                <MailCheck className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-semibold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                If <span className="font-medium text-foreground">{email}</span> matches an
                account, we've emailed a link to reset your password. The link expires in 30
                minutes.
              </p>
              <div className="pt-2 text-xs text-muted-foreground">
                Demo mode:{" "}
                <Link to="/reset-password" search={{ token: "demo-token" }} className="font-medium text-primary underline">
                  open reset page
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-semibold">Reset your password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the email associated with your account.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@techno.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !email}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
