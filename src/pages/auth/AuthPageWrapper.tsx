import { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/lib/theme";
import { useAuthThemeReset } from "./useAuthThemeReset";

interface AuthPageWrapperProps {
  title: ReactNode;
  subtitle: ReactNode;
  idPrefix: string;
  cardMaxWidth?: string;
  children: ReactNode;
}

export default function AuthPageWrapper({
  title,
  subtitle,
  idPrefix,
  cardMaxWidth = "max-w-[390px] sm:max-w-[420px] xl:max-w-[440px]",
  children,
}: AuthPageWrapperProps) {
  useAuthThemeReset();
  const { palette, theme } = useTheme();
  const isDark = theme === "dark";

  // Harmonious canvas background for form side & parent grid
  const bgCanvas = isDark
    ? `linear-gradient(135deg, #090e1a 0%, color-mix(in srgb, ${palette.primary} 9%, #0d1527) 50%, #060a14 100%)`
    : `linear-gradient(135deg, #f8fafc 0%, color-mix(in srgb, ${palette.primary} 4%, #f1f5fb) 50%, #e8effc 100%)`;

  return (
    <div
      className="relative grid min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden lg:grid-cols-[1.05fr_1fr] transition-colors duration-500"
      style={{ background: bgCanvas }}
    >
      {/* Hero side with curved right edge — desktop view */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-6 lg:p-8 xl:p-12 text-white lg:flex clip-wave-right lg:-mr-16 lg:z-10 h-full"
        style={{ backgroundImage: palette.heroGradient || "var(--gradient-hero)" }}
      >
        {/* Ambient background corner glow - pinned to outer edges */}
        <div className="pointer-events-none absolute -top-36 -left-36 h-[26rem] w-[26rem] rounded-full bg-white/10 blur-3xl animate-float-blob" />
        <div
          className="pointer-events-none absolute -bottom-24 -right-12 h-[30rem] w-[30rem] rounded-full bg-white/10 blur-3xl animate-float-blob"
          style={{ animationDelay: "2s" }}
        />

        {/* Decorative bubbles placed exclusively in empty negative space */}
        <span className="pointer-events-none absolute right-[7%] top-[8%] h-8 w-8 rounded-full bg-white/30 animate-float-blob" />
        <span
          className="pointer-events-none absolute right-[15%] top-[14%] h-12 w-12 rounded-full border-2 border-white/20 animate-float-blob"
          style={{ animationDelay: "3s" }}
        />
        <span
          className="pointer-events-none absolute left-[44%] top-[3.5%] h-5 w-5 rounded-full bg-white/25 animate-float-blob"
          style={{ animationDelay: "1.2s" }}
        />
        <span
          className="pointer-events-none absolute right-[5%] top-[38%] h-6 w-6 rounded-full bg-white/25 animate-float-blob"
          style={{ animationDelay: "2s" }}
        />
        <span
          className="pointer-events-none absolute right-[8%] bottom-[30%] h-10 w-10 rounded-full bg-white/30 animate-float-blob"
          style={{ animationDelay: "4.2s" }}
        />
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
            <div className="font-display text-base sm:text-lg font-semibold tracking-tight">
              MIS
            </div>
            <div className="text-[11px] sm:text-xs text-white/70">
              Management Information System
            </div>
          </div>
        </div>

        {/* Center Section: Title & Subtitle */}
        <div className="relative z-20 my-auto py-4 max-w-lg animate-fade-in">
          <h1 className="font-display text-3xl xl:text-4xl font-semibold leading-tight text-white drop-shadow-sm">
            {title}
          </h1>
          <p className="mt-3 text-sm xl:text-base text-white/85 leading-relaxed">{subtitle}</p>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-20 text-[11px] sm:text-xs text-white/60">
          &copy; All Rights Reserved.
        </div>
      </div>

      {/* Form side — clean backdrop with ambient glow, dot grid, corner swoosh & refined card */}
      <div
        className="relative flex min-h-screen lg:min-h-0 h-full w-full items-center justify-center overflow-y-auto p-4 sm:p-6 lg:p-8 xl:pl-16 transition-colors duration-500"
        style={{ background: bgCanvas }}
      >
        {/* Ambient soft glow on top-right of form side */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 sm:h-80 sm:w-80 rounded-full blur-3xl transition-all duration-500"
          style={{
            opacity: isDark ? 0.45 : 0.3,
            background: `radial-gradient(circle, color-mix(in srgb, ${palette.primaryGlow} ${isDark ? "45%" : "40%"}, transparent) 0%, color-mix(in srgb, ${palette.primary} ${isDark ? "25%" : "25%"}, transparent) 50%, transparent 75%)`,
          }}
        />

        {/* Subtle decorative concentric ring at top right */}
        <div
          className="pointer-events-none absolute right-8 sm:right-12 top-6 sm:top-8 h-40 w-40 sm:h-48 sm:w-48 rounded-full transition-all duration-500"
          style={{
            borderColor: `color-mix(in srgb, ${palette.primary} ${isDark ? "25%" : "18%"}, transparent)`,
            borderWidth: 1,
          }}
        />

        {/* Decorative Dot Grid Matrix (Top-Right of screen) */}
        <div
          className="pointer-events-none absolute right-4 sm:right-7 top-4 sm:top-7 grid grid-cols-6 gap-2 sm:gap-2.5 transition-opacity duration-500"
          style={{ opacity: isDark ? 0.45 : 0.35 }}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full transition-colors duration-500"
              style={{
                backgroundColor: `color-mix(in srgb, ${palette.primary} ${isDark ? "70%" : "60%"}, transparent)`,
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
              <linearGradient id={`br-wave-bg-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.primary} stopOpacity={isDark ? 0.5 : 0.35} />
                <stop
                  offset="60%"
                  stopColor={palette.primaryGlow}
                  stopOpacity={isDark ? 0.6 : 0.45}
                />
                <stop
                  offset="100%"
                  stopColor={palette.primaryGlow}
                  stopOpacity={isDark ? 0.35 : 0.25}
                />
              </linearGradient>
              <linearGradient id={`br-wave-fg-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.primary} stopOpacity={isDark ? 0.95 : 0.95} />
                <stop offset="55%" stopColor={palette.primary} stopOpacity={isDark ? 0.9 : 0.9} />
                <stop offset="100%" stopColor={palette.primaryGlow} stopOpacity={1} />
              </linearGradient>
            </defs>
            <path
              d="M320 110 C230 135 160 210 120 320 L320 320 Z"
              fill={`url(#br-wave-bg-${idPrefix})`}
            />
            <path
              d="M320 165 C240 185 185 245 155 320 L320 320 Z"
              fill={`url(#br-wave-fg-${idPrefix})`}
            />
          </svg>
        </div>

        {/* The Card with elevation & top-right corner theme layers */}
        <Card
          className={`relative z-10 w-full ${cardMaxWidth} rounded-[24px] sm:rounded-[28px] border border-white/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0f172a]/95 p-5 sm:p-7 xl:p-8 backdrop-blur-md overflow-hidden animate-scale-in transition-all duration-500 my-auto shadow-2xl`}
          style={{
            boxShadow: isDark
              ? `0 20px 50px -10px rgba(0,0,0,0.65), 0 0 35px -8px color-mix(in srgb, ${palette.primary} 25%, transparent)`
              : `0 18px 50px -12px color-mix(in srgb, ${palette.primary} 18%, transparent), 0 8px 20px -4px rgba(0,0,0,0.05)`,
          }}
        >
          {/* Top-right card decorative corner swoosh layers */}
          <div className="pointer-events-none absolute top-0 right-0 w-28 h-28 sm:w-36 sm:h-36 overflow-hidden rounded-tr-[24px] sm:rounded-tr-[28px]">
            <svg
              viewBox="0 0 180 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute top-0 right-0 w-full h-full transition-all duration-500"
            >
              <defs>
                <linearGradient
                  id={`card-corner-bg-${idPrefix}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor={palette.primary}
                    stopOpacity={isDark ? 0.35 : 0.25}
                  />
                  <stop
                    offset="60%"
                    stopColor={palette.primaryGlow}
                    stopOpacity={isDark ? 0.45 : 0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={palette.primaryGlow}
                    stopOpacity={isDark ? 0.25 : 0.15}
                  />
                </linearGradient>
                <linearGradient
                  id={`card-corner-fg-${idPrefix}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={palette.primary} stopOpacity={isDark ? 0.65 : 0.5} />
                  <stop
                    offset="50%"
                    stopColor={palette.primaryGlow}
                    stopOpacity={isDark ? 0.75 : 0.6}
                  />
                  <stop
                    offset="100%"
                    stopColor={palette.primaryGlow}
                    stopOpacity={isDark ? 0.85 : 0.75}
                  />
                </linearGradient>
              </defs>
              <path
                d="M180 0 L70 0 C78 50 115 88 180 110 Z"
                fill={`url(#card-corner-bg-${idPrefix})`}
              />
              <path
                d="M180 0 L105 0 C112 40 138 68 180 82 Z"
                fill={`url(#card-corner-fg-${idPrefix})`}
              />
            </svg>
          </div>

          {/* Mobile-only header logo badge */}
          <div className="relative z-10 flex lg:hidden items-center gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="font-display text-xs font-bold tracking-tight text-foreground">
                MIS
              </div>
              <div className="text-[10px] text-muted-foreground">Management Information System</div>
            </div>
          </div>

          {/* Screen-specific inner content */}
          <div className="relative z-10">{children}</div>
        </Card>
      </div>
    </div>
  );
}
