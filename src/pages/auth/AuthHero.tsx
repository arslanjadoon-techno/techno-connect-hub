import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useAuthThemeReset } from "./useAuthThemeReset";

/**
 * Shared auth-side hero panel with the gradient + curved right edge,
 * floating blobs and decorative bubbles. Used by login, forgot, reset, 2FA pages
 * so every auth screen feels visually identical.
 */
export default function AuthHero({
  title,
  subtitle,
  eyebrow = "Management Information System",
  brand = "MIS",
}: {
  title: ReactNode;
  subtitle: ReactNode;
  eyebrow?: string;
  brand?: string;
}) {
  useAuthThemeReset();
  return (
    <div
      className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex clip-wave-right -mr-16 z-10"
      style={{ backgroundImage: "var(--gradient-hero)" }}
    >
      {/* Big floating blobs pinned to outer corners */}
      <div className="pointer-events-none absolute -top-36 -left-36 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-float-blob" />
      <div
        className="pointer-events-none absolute -bottom-20 -right-10 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-float-blob"
        style={{ animationDelay: "2s" }}
      />

      {/* Decorative bubbles placed strictly in empty margin zones */}
      <span className="pointer-events-none absolute right-[7%] top-[8%] h-7 w-7 rounded-full bg-white/30 animate-float-blob" />
      <span
        className="pointer-events-none absolute right-[15%] top-[15%] h-12 w-12 rounded-full border border-white/20 animate-float-blob"
        style={{ animationDelay: "3s" }}
      />
      <span
        className="pointer-events-none absolute left-[44%] top-[4%] h-5 w-5 rounded-full bg-white/25 animate-float-blob"
        style={{ animationDelay: "1.2s" }}
      />
      <span
        className="pointer-events-none absolute right-[5%] top-[38%] h-6 w-6 rounded-full bg-white/25 animate-float-blob"
        style={{ animationDelay: "2s" }}
      />
      <span
        className="pointer-events-none absolute right-[8%] bottom-[30%] h-8 w-8 rounded-full bg-white/30 animate-float-blob"
        style={{ animationDelay: "4.2s" }}
      />
      <span
        className="pointer-events-none absolute right-[14%] bottom-[12%] h-14 w-14 rounded-full border border-white/25 animate-float-blob"
        style={{ animationDelay: "1.8s" }}
      />
      <span
        className="pointer-events-none absolute left-[30%] bottom-[4%] h-5 w-5 rounded-full bg-white/20 animate-float-blob"
        style={{ animationDelay: "2.8s" }}
      />

      <div className="relative z-10 flex items-center gap-3 animate-fade-in">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="font-display text-lg font-semibold">{brand}</div>
          <div className="text-xs text-white/70">{eyebrow}</div>
        </div>
      </div>

      <div
        className="relative z-10 max-w-md space-y-4 animate-fade-in"
        style={{ animationDelay: ".1s" }}
      >
        <h1 className="font-display text-4xl font-semibold leading-tight">{title}</h1>
        <p className="text-white/80">{subtitle}</p>
      </div>

      <div className="relative z-10 text-xs text-white/60">© Techno Communications LLC</div>
    </div>
  );
}
