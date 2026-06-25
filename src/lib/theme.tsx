import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const THEME_KEY = "techno-theme";
const PALETTE_KEY = "techno-palette";

export interface Palette {
  id: string;
  name: string;
  /** Accent/CTA color used by buttons, links, ring */
  primary: string;
  primaryGlow: string;
  ring: string;
  /** Sidebar tones — automatically derived to match the palette mood */
  sidebar: string;
  sidebarForeground: string;
  sidebarAccent: string;
  sidebarBorder: string;
  /** Hero gradient used on the login screen */
  heroGradient: string;
  /** Small swatch preview row */
  swatches: string[];
}

// 9 palettes — sidebar tone is auto-paired with a complementary lighter accent.
export const PALETTES: Palette[] = [
  {
    id: "indigo", name: "Indigo Violet",
    primary: "oklch(0.52 0.21 275)", primaryGlow: "oklch(0.66 0.22 295)", ring: "oklch(0.66 0.22 295)",
    sidebar: "oklch(0.21 0.06 275)", sidebarForeground: "oklch(0.96 0.01 270)",
    sidebarAccent: "oklch(0.3 0.08 280)", sidebarBorder: "oklch(0.3 0.08 280)",
    heroGradient: "linear-gradient(135deg, oklch(0.45 0.22 270) 0%, oklch(0.55 0.23 295) 50%, oklch(0.6 0.2 320) 100%)",
    swatches: ["#1e1b4b", "#4f46e5", "#a78bfa"],
  },
  {
    id: "emerald", name: "Emerald",
    primary: "oklch(0.58 0.16 160)", primaryGlow: "oklch(0.72 0.18 165)", ring: "oklch(0.72 0.18 165)",
    sidebar: "oklch(0.24 0.06 160)", sidebarForeground: "oklch(0.96 0.02 160)",
    sidebarAccent: "oklch(0.32 0.08 160)", sidebarBorder: "oklch(0.32 0.08 160)",
    heroGradient: "linear-gradient(135deg, oklch(0.4 0.13 160) 0%, oklch(0.55 0.15 165) 50%, oklch(0.7 0.16 170) 100%)",
    swatches: ["#064e3b", "#10b981", "#6ee7b7"],
  },
  {
    id: "rose", name: "Rose",
    primary: "oklch(0.6 0.21 15)", primaryGlow: "oklch(0.72 0.2 25)", ring: "oklch(0.72 0.2 25)",
    sidebar: "oklch(0.24 0.08 15)", sidebarForeground: "oklch(0.97 0.01 15)",
    sidebarAccent: "oklch(0.34 0.1 15)", sidebarBorder: "oklch(0.34 0.1 15)",
    heroGradient: "linear-gradient(135deg, oklch(0.45 0.18 10) 0%, oklch(0.58 0.21 20) 50%, oklch(0.7 0.2 35) 100%)",
    swatches: ["#4c0519", "#e11d48", "#fda4af"],
  },
  {
    id: "amber", name: "Amber",
    primary: "oklch(0.7 0.17 70)", primaryGlow: "oklch(0.82 0.15 80)", ring: "oklch(0.82 0.15 80)",
    sidebar: "oklch(0.28 0.06 70)", sidebarForeground: "oklch(0.97 0.02 80)",
    sidebarAccent: "oklch(0.36 0.08 70)", sidebarBorder: "oklch(0.36 0.08 70)",
    heroGradient: "linear-gradient(135deg, oklch(0.45 0.12 60) 0%, oklch(0.62 0.16 70) 50%, oklch(0.78 0.15 80) 100%)",
    swatches: ["#451a03", "#d97706", "#fcd34d"],
  },
  {
    id: "sky", name: "Sky Blue",
    primary: "oklch(0.58 0.16 235)", primaryGlow: "oklch(0.72 0.16 230)", ring: "oklch(0.72 0.16 230)",
    sidebar: "oklch(0.24 0.07 235)", sidebarForeground: "oklch(0.97 0.01 230)",
    sidebarAccent: "oklch(0.34 0.09 235)", sidebarBorder: "oklch(0.34 0.09 235)",
    heroGradient: "linear-gradient(135deg, oklch(0.4 0.12 240) 0%, oklch(0.55 0.16 235) 50%, oklch(0.72 0.16 225) 100%)",
    swatches: ["#0c4a6e", "#0284c7", "#7dd3fc"],
  },
  {
    id: "slate", name: "Slate",
    primary: "oklch(0.45 0.04 260)", primaryGlow: "oklch(0.6 0.05 260)", ring: "oklch(0.6 0.05 260)",
    sidebar: "oklch(0.26 0.02 260)", sidebarForeground: "oklch(0.96 0.005 260)",
    sidebarAccent: "oklch(0.36 0.03 260)", sidebarBorder: "oklch(0.36 0.03 260)",
    heroGradient: "linear-gradient(135deg, oklch(0.3 0.02 260) 0%, oklch(0.45 0.04 260) 50%, oklch(0.6 0.05 260) 100%)",
    swatches: ["#0f172a", "#475569", "#cbd5e1"],
  },
  {
    id: "navy", name: "Dark Navy",
    primary: "oklch(0.42 0.13 255)", primaryGlow: "oklch(0.62 0.16 240)", ring: "oklch(0.62 0.16 240)",
    sidebar: "oklch(0.18 0.06 260)", sidebarForeground: "oklch(0.96 0.01 240)",
    sidebarAccent: "oklch(0.28 0.08 255)", sidebarBorder: "oklch(0.28 0.08 255)",
    heroGradient: "linear-gradient(135deg, oklch(0.2 0.07 260) 0%, oklch(0.36 0.12 255) 50%, oklch(0.58 0.15 235) 100%)",
    swatches: ["#0b1437", "#1e3a8a", "#60a5fa"],
  },
  {
    id: "graphite", name: "Charcoal Grey",
    primary: "oklch(0.4 0.01 260)", primaryGlow: "oklch(0.6 0.015 260)", ring: "oklch(0.6 0.015 260)",
    sidebar: "oklch(0.2 0.005 260)", sidebarForeground: "oklch(0.96 0.005 260)",
    sidebarAccent: "oklch(0.3 0.008 260)", sidebarBorder: "oklch(0.3 0.008 260)",
    heroGradient: "linear-gradient(135deg, oklch(0.22 0.005 260) 0%, oklch(0.38 0.01 260) 50%, oklch(0.58 0.015 260) 100%)",
    swatches: ["#18181b", "#52525b", "#a1a1aa"],
  },
  {
    id: "brown", name: "Warm Brown",
    primary: "oklch(0.45 0.08 45)", primaryGlow: "oklch(0.65 0.11 55)", ring: "oklch(0.65 0.11 55)",
    sidebar: "oklch(0.25 0.05 45)", sidebarForeground: "oklch(0.96 0.02 55)",
    sidebarAccent: "oklch(0.35 0.07 45)", sidebarBorder: "oklch(0.35 0.07 45)",
    heroGradient: "linear-gradient(135deg, oklch(0.28 0.06 40) 0%, oklch(0.45 0.09 50) 50%, oklch(0.65 0.11 60) 100%)",
    swatches: ["#3f2a1a", "#92400e", "#d6a373"],
  },
];

interface Ctx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  palette: Palette;
  setPalette: (id: string) => void;
}
const ThemeContext = createContext<Ctx | null>(null);

function applyPalette(p: Palette, theme: Theme) {
  const r = document.documentElement.style;
  // Accent / button colors
  r.setProperty("--primary", p.primary);
  r.setProperty("--primary-glow", p.primaryGlow);
  r.setProperty("--ring", p.ring);
  r.setProperty("--gradient-primary", `linear-gradient(135deg, ${p.primary}, ${p.primaryGlow})`);
  r.setProperty("--gradient-hero", p.heroGradient);

  // In dark mode, sidebar should sit ABOVE the dark background — use a slightly
  // lighter card-like surface (still tinted with the palette hue) so the menu,
  // header, and content are clearly separated. In light mode keep the rich
  // dark sidebar from the palette.
  if (theme === "dark") {
    r.setProperty("--sidebar", "oklch(0.24 0.05 275)");
    r.setProperty("--sidebar-foreground", "oklch(0.97 0.01 270)");
    r.setProperty("--sidebar-primary", p.primaryGlow);
    r.setProperty("--sidebar-primary-foreground", "oklch(0.14 0.03 275)");
    r.setProperty("--sidebar-accent", "oklch(0.32 0.07 280)");
    r.setProperty("--sidebar-accent-foreground", "oklch(0.97 0.01 270)");
    r.setProperty("--sidebar-border", "oklch(1 0 0 / 12%)");
    r.setProperty("--sidebar-ring", p.primaryGlow);
  } else {
    r.setProperty("--sidebar", p.sidebar);
    r.setProperty("--sidebar-foreground", p.sidebarForeground);
    r.setProperty("--sidebar-primary", p.primaryGlow);
    r.setProperty("--sidebar-primary-foreground", p.sidebar);
    r.setProperty("--sidebar-accent", p.sidebarAccent);
    r.setProperty("--sidebar-accent-foreground", p.sidebarForeground);
    r.setProperty("--sidebar-border", p.sidebarBorder);
    r.setProperty("--sidebar-ring", p.primaryGlow);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    try {
      const t = window.localStorage.getItem(THEME_KEY) as Theme | null;
      return t === "dark" || t === "light" ? t : "light";
    } catch { return "light"; }
  });
  const [paletteId, setPaletteId] = useState<string>(() => {
    if (typeof window === "undefined") return "indigo";
    try {
      const pid = window.localStorage.getItem(PALETTE_KEY);
      return pid && PALETTES.some((p) => p.id === pid) ? pid : "indigo";
    } catch { return "indigo"; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    const p = PALETTES.find((x) => x.id === paletteId) ?? PALETTES[0];
    applyPalette(p, theme);
    try { window.localStorage.setItem(PALETTE_KEY, p.id); } catch { /* ignore */ }
  }, [paletteId, theme]);

  const palette = useMemo(() => PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0], [paletteId]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((p) => (p === "light" ? "dark" : "light")), []);
  const setPalette = useCallback((id: string) => setPaletteId(id), []);

  const value = useMemo(
    () => ({ theme, toggle, setTheme, palette, setPalette }),
    [theme, toggle, setTheme, palette, setPalette],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
