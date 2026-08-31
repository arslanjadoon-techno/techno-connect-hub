import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

// Curated palette set — each entry uses harmonious accent + sidebar tones.
export const PALETTES: Palette[] = [
  {
    id: "indigo",
    name: "Indigo Violet",
    primary: "oklch(0.52 0.21 275)",
    primaryGlow: "oklch(0.66 0.22 295)",
    ring: "oklch(0.66 0.22 295)",
    sidebar: "oklch(0.21 0.06 275)",
    sidebarForeground: "oklch(0.96 0.01 270)",
    sidebarAccent: "oklch(0.3 0.08 280)",
    sidebarBorder: "oklch(0.3 0.08 280)",
    heroGradient:
      "linear-gradient(135deg, oklch(0.45 0.22 270) 0%, oklch(0.55 0.23 295) 50%, oklch(0.6 0.2 320) 100%)",
    swatches: ["#1e1b4b", "#4f46e5", "#a78bfa"],
  },
  {
    id: "autumn-earth",
    name: "Autumn Earth",
    // #d96459 (Warm Terracotta/Coral) as primary accent
    primary: "oklch(0.61 0.17 26)",
    primaryGlow: "oklch(0.72 0.15 35)",
    ring: "oklch(0.72 0.15 35)",
    // Derived sidebar using the deep tone of #588c7e (Sage Green)
    sidebar: "oklch(0.24 0.04 175)",
    sidebarForeground: "oklch(0.96 0.02 90)",
    sidebarAccent: "oklch(0.34 0.05 175)",
    sidebarBorder: "oklch(0.34 0.05 175)",
    // Hero gradient blending all your colors beautifully
    heroGradient:
      "linear-gradient(135deg, oklch(0.56 0.07 175) 0%, oklch(0.72 0.17 40) 50%, oklch(0.9 0.12 90) 100%)",
    // Aapke provide kiye huay custom HEX colors
    swatches: ["#588c7e", "#f2ae72", "#d96459"],
  },
  {
    id: "rustic-safari",
    name: "Rustic Safari",
    // #7e4a35 (Deep Terracotta/Brown) as primary accent
    primary: "oklch(0.46 0.12 35)",
    primaryGlow: "oklch(0.6 0.11 45)",
    ring: "oklch(0.6 0.11 45)",
    // Derived sidebar using the deep tone of #838060 (Olive Khaki)
    sidebar: "oklch(0.25 0.03 105)",
    sidebarForeground: "oklch(0.95 0.02 95)",
    sidebarAccent: "oklch(0.35 0.04 105)",
    sidebarBorder: "oklch(0.35 0.04 105)",
    // Hero gradient blending your brown, gold, and sand tones
    heroGradient:
      "linear-gradient(135deg, oklch(0.46 0.12 35) 0%, oklch(0.75 0.11 92) 50%, oklch(0.85 0.06 95) 100%)",
    // Aapke provide kiye huay custom HEX colors
    swatches: ["#7e4a35", "#cab577", "#838060"],
  },
  {
    id: "mint-rose",
    name: "Mint Rose",
    // #77a8a8 (Muted Sage Teal) as primary accent
    primary: "oklch(0.66 0.06 195)",
    primaryGlow: "oklch(0.76 0.06 190)",
    ring: "oklch(0.76 0.06 190)",
    // Derived sidebar using a deep slate-gray base that complements the soft tones
    sidebar: "oklch(0.24 0.02 240)",
    sidebarForeground: "oklch(0.94 0.02 10)",
    sidebarAccent: "oklch(0.34 0.03 210)",
    sidebarBorder: "oklch(0.34 0.03 210)",
    // Hero gradient blending the soft pink, mint, and teal tones
    heroGradient:
      "linear-gradient(135deg, oklch(0.88 0.03 15) 0%, oklch(0.92 0.04 140) 50%, oklch(0.66 0.06 195) 100%)",
    // Aapke provide kiye huay custom HEX colors
    swatches: ["#e4d1d1", "#d9ecd0", "#77a8a8"],
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    primary: "oklch(0.55 0.16 220)",
    primaryGlow: "oklch(0.7 0.15 200)",
    ring: "oklch(0.7 0.15 200)",
    sidebar: "oklch(0.22 0.07 230)",
    sidebarForeground: "oklch(0.97 0.01 220)",
    sidebarAccent: "oklch(0.32 0.09 225)",
    sidebarBorder: "oklch(0.32 0.09 225)",
    heroGradient:
      "linear-gradient(135deg, oklch(0.32 0.1 240) 0%, oklch(0.5 0.16 220) 50%, oklch(0.72 0.14 195) 100%)",
    swatches: ["#0c2d48", "#0ea5e9", "#67e8f9"],
  },
  {
    id: "sunset",
    name: "Sunset Glow",
    primary: "oklch(0.63 0.2 35)",
    primaryGlow: "oklch(0.76 0.18 55)",
    ring: "oklch(0.76 0.18 55)",
    sidebar: "oklch(0.25 0.08 25)",
    sidebarForeground: "oklch(0.97 0.02 40)",
    sidebarAccent: "oklch(0.35 0.1 30)",
    sidebarBorder: "oklch(0.35 0.1 30)",
    heroGradient:
      "linear-gradient(135deg, oklch(0.42 0.18 10) 0%, oklch(0.6 0.21 30) 50%, oklch(0.78 0.18 70) 100%)",
    swatches: ["#7c2d12", "#f97316", "#fcd34d"],
  },
  {
    id: "forest",
    name: "Forest Pine",
    primary: "oklch(0.5 0.13 155)",
    primaryGlow: "oklch(0.66 0.16 150)",
    ring: "oklch(0.66 0.16 150)",
    sidebar: "oklch(0.22 0.05 160)",
    sidebarForeground: "oklch(0.97 0.02 155)",
    sidebarAccent: "oklch(0.32 0.07 155)",
    sidebarBorder: "oklch(0.32 0.07 155)",
    heroGradient:
      "linear-gradient(135deg, oklch(0.3 0.08 160) 0%, oklch(0.48 0.13 155) 50%, oklch(0.7 0.16 145) 100%)",
    swatches: ["#14532d", "#16a34a", "#86efac"],
  },
  {
    id: "berry",
    name: "Berry Crush",
    primary: "oklch(0.55 0.24 335)",
    primaryGlow: "oklch(0.7 0.22 350)",
    ring: "oklch(0.7 0.22 350)",
    sidebar: "oklch(0.23 0.09 335)",
    sidebarForeground: "oklch(0.97 0.02 340)",
    sidebarAccent: "oklch(0.33 0.11 335)",
    sidebarBorder: "oklch(0.33 0.11 335)",
    heroGradient:
      "linear-gradient(135deg, oklch(0.4 0.16 330) 0%, oklch(0.56 0.24 340) 50%, oklch(0.72 0.2 355) 100%)",
    swatches: ["#500724", "#db2777", "#f9a8d4"],
  },
  {
    id: "teal",
    name: "Tropical Teal",
    primary: "oklch(0.55 0.12 195)",
    primaryGlow: "oklch(0.7 0.13 185)",
    ring: "oklch(0.7 0.13 185)",
    sidebar: "oklch(0.22 0.06 195)",
    sidebarForeground: "oklch(0.97 0.02 190)",
    sidebarAccent: "oklch(0.32 0.07 195)",
    sidebarBorder: "oklch(0.32 0.07 195)",
    heroGradient:
      "linear-gradient(135deg, oklch(0.32 0.08 200) 0%, oklch(0.5 0.12 195) 50%, oklch(0.72 0.13 180) 100%)",
    swatches: ["#134e4a", "#14b8a6", "#5eead4"],
  },
  {
    id: "royal",
    name: "Royal Plum",
    primary: "oklch(0.42 0.18 305)",
    primaryGlow: "oklch(0.6 0.2 315)",
    ring: "oklch(0.6 0.2 315)",
    sidebar: "oklch(0.2 0.08 305)",
    sidebarForeground: "oklch(0.97 0.02 310)",
    sidebarAccent: "oklch(0.3 0.1 305)",
    sidebarBorder: "oklch(0.3 0.1 305)",
    heroGradient:
      "linear-gradient(135deg, oklch(0.28 0.12 295) 0%, oklch(0.45 0.18 310) 50%, oklch(0.65 0.2 325) 100%)",
    swatches: ["#3b0764", "#9333ea", "#d8b4fe"],
  },
  {
    id: "midnight",
    name: "Midnight Steel",
    primary: "oklch(0.5 0.08 250)",
    primaryGlow: "oklch(0.65 0.1 245)",
    ring: "oklch(0.65 0.1 245)",
    sidebar: "oklch(0.18 0.04 250)",
    sidebarForeground: "oklch(0.96 0.01 245)",
    sidebarAccent: "oklch(0.28 0.05 250)",
    sidebarBorder: "oklch(0.28 0.05 250)",
    heroGradient:
      "linear-gradient(135deg, oklch(0.22 0.05 250) 0%, oklch(0.4 0.08 248) 50%, oklch(0.62 0.1 240) 100%)",
    swatches: ["#0f172a", "#334155", "#94a3b8"],
  },
  {
    id: "coral",
    name: "Coral Bloom",
    primary: "oklch(0.65 0.18 20)",
    primaryGlow: "oklch(0.78 0.15 30)",
    ring: "oklch(0.78 0.15 30)",
    sidebar: "oklch(0.26 0.08 15)",
    sidebarForeground: "oklch(0.97 0.02 25)",
    sidebarAccent: "oklch(0.36 0.1 18)",
    sidebarBorder: "oklch(0.36 0.1 18)",
    heroGradient:
      "linear-gradient(135deg, oklch(0.42 0.14 8) 0%, oklch(0.62 0.18 20) 50%, oklch(0.8 0.15 35) 100%)",
    swatches: ["#7f1d1d", "#fb7185", "#fecaca"],
  },
  ...(
    [
      // [id, name, L, C, H, swatches]
      ["rose-pop", "Rose Pop", 0.63, 0.24, 9, ["#F5276C", "#FF7FA5", "#FFD6E3"]],
      ["ember", "Ember Orange", 0.65, 0.21, 33, ["#F54927", "#FF8A63", "#FFD8C9"]],
      ["gold", "Golden Hour", 0.72, 0.16, 78, ["#F5B027", "#FFD37A", "#FFF0CC"]],
      ["mint", "Fresh Mint", 0.72, 0.16, 163, ["#27F5B0", "#7DF0CE", "#D6FBEE"]],
      ["azure", "Azure Blue", 0.57, 0.22, 262, ["#276CF5", "#7BA4FF", "#D6E3FF"]],
      ["magenta", "Magenta Ink", 0.5, 0.23, 328, ["#A300A3", "#D45BD4", "#F3D2F3"]],
      ["cyan", "Electric Cyan", 0.64, 0.13, 215, ["#06B6D4", "#67E8F9", "#CFFAFE"]],
      ["violet", "Deep Violet", 0.54, 0.25, 293, ["#7C3AED", "#A78BFA", "#EDE9FE"]],
      ["crimson", "Crimson Red", 0.59, 0.22, 18, ["#E11D48", "#FB7185", "#FFE4E6"]],
      ["graphite", "Graphite Grey", 0.5, 0.02, 257, ["#334155", "#64748B", "#CBD5E1"]],
      ["obsidian", "Obsidian Black", 0.32, 0.01, 266, ["#0F172A", "#1F2937", "#94A3B8"]],
    ] as Array<[string, string, number, number, number, string[]]>
  ).map(([id, name, L, C, H, swatches]) => ({
    id,
    name,
    primary: `oklch(${L} ${C} ${H})`,
    primaryGlow: `oklch(${Math.min(L + 0.14, 0.9)} ${Math.max(C - 0.03, 0.02)} ${H})`,
    ring: `oklch(${Math.min(L + 0.14, 0.9)} ${Math.max(C - 0.03, 0.02)} ${H})`,
    sidebar: `oklch(0.22 ${Math.min(C * 0.35, 0.08)} ${H})`,
    sidebarForeground: `oklch(0.97 0.01 ${H})`,
    sidebarAccent: `oklch(0.32 ${Math.min(C * 0.4, 0.09)} ${H})`,
    sidebarBorder: `oklch(0.32 ${Math.min(C * 0.4, 0.09)} ${H})`,
    heroGradient: `linear-gradient(135deg, oklch(${Math.max(L - 0.2, 0.2)} ${C} ${H}) 0%, oklch(${L} ${C} ${H}) 50%, oklch(${Math.min(L + 0.2, 0.92)} ${Math.max(C - 0.05, 0.03)} ${(H + 25) % 360}) 100%)`,
    swatches,
  })),
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
    } catch {
      return "light";
    }
  });
  const [paletteId, setPaletteId] = useState<string>(() => {
    if (typeof window === "undefined") return "indigo";
    try {
      const pid = window.localStorage.getItem(PALETTE_KEY);
      return pid && PALETTES.some((p) => p.id === pid) ? pid : "indigo";
    } catch {
      return "indigo";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const p = PALETTES.find((x) => x.id === paletteId) ?? PALETTES[0];
    applyPalette(p, theme);
    try {
      window.localStorage.setItem(PALETTE_KEY, p.id);
    } catch {
      /* ignore */
    }
  }, [paletteId, theme]);

  const palette = useMemo(
    () => PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0],
    [paletteId],
  );

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
