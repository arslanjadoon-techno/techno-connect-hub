import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shared auth-side hero panel with the gradient + curved right edge,
 * floating blobs and decorative bubbles. Used by login, forgot, reset, 2FA pages
 * so every auth screen feels visually identical.
 */
export default function AuthHero({
  title,
  subtitle,
  eyebrow = "Management Information System",
  brand = "Techno MIS",
}: {
  title: ReactNode;
  subtitle: ReactNode;
  eyebrow?: string;
  brand?: string;
}) {
  return (
    <div
      className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex clip-wave-right -mr-16 z-10"
      style={{ backgroundImage: "var(--gradient-hero)" }}
    >
      {/* Big floating blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float-blob" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-float-blob" style={{ animationDelay: "2s" }} />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-48 w-48 rounded-full bg-white/15 blur-2xl animate-float-blob" style={{ animationDelay: "4s" }} />

      {/* Small bubbles */}
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
          <div className="font-display text-lg font-semibold">{brand}</div>
          <div className="text-xs text-white/70">{eyebrow}</div>
        </div>
      </div>

      <div className="relative z-10 max-w-md space-y-4 animate-fade-in" style={{ animationDelay: ".1s" }}>
        <h1 className="font-display text-4xl font-semibold leading-tight">{title}</h1>
        <p className="text-white/80">{subtitle}</p>
      </div>

      <div className="relative z-10 text-xs text-white/60">© Techno Communications LLC</div>
    </div>
  );
}
