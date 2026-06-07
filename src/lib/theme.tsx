import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const THEME_KEY = "techno-theme";
const PALETTE_KEY = "techno-palette";

export interface Palette {
  id: string;
  name: string;
  primary: string;        // oklch(...)
  primaryGlow: string;    // oklch(...)
  ring: string;
}

export const PALETTES: Palette[] = [
  { id: "indigo",  name: "Indigo Violet", primary: "oklch(0.52 0.21 275)", primaryGlow: "oklch(0.66 0.22 295)", ring: "oklch(0.66 0.22 295)" },
  { id: "emerald", name: "Emerald",       primary: "oklch(0.58 0.16 160)", primaryGlow: "oklch(0.72 0.18 165)", ring: "oklch(0.72 0.18 165)" },
  { id: "rose",    name: "Rose",          primary: "oklch(0.6 0.21 15)",   primaryGlow: "oklch(0.72 0.2 25)",   ring: "oklch(0.72 0.2 25)" },
  { id: "amber",   name: "Amber",         primary: "oklch(0.7 0.17 70)",   primaryGlow: "oklch(0.82 0.15 80)",  ring: "oklch(0.82 0.15 80)" },
  { id: "sky",     name: "Sky Blue",      primary: "oklch(0.58 0.16 235)", primaryGlow: "oklch(0.72 0.16 230)", ring: "oklch(0.72 0.16 230)" },
  { id: "slate",   name: "Slate",         primary: "oklch(0.45 0.04 260)", primaryGlow: "oklch(0.6 0.05 260)",  ring: "oklch(0.6 0.05 260)" },
];

interface Ctx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  palette: Palette;
  setPalette: (id: string) => void;
}
const ThemeContext = createContext<Ctx | null>(null);

function applyPalette(p: Palette) {
  const r = document.documentElement.style;
  r.setProperty("--primary", p.primary);
  r.setProperty("--primary-glow", p.primaryGlow);
  r.setProperty("--ring", p.ring);
  r.setProperty("--gradient-primary", `linear-gradient(135deg, ${p.primary}, ${p.primaryGlow})`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [paletteId, setPaletteId] = useState<string>("indigo");

  useEffect(() => {
    try {
      const t = window.localStorage.getItem(THEME_KEY) as Theme | null;
      if (t === "light" || t === "dark") setThemeState(t);
      const pid = window.localStorage.getItem(PALETTE_KEY);
      if (pid && PALETTES.some((p) => p.id === pid)) setPaletteId(pid);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    const p = PALETTES.find((x) => x.id === paletteId) ?? PALETTES[0];
    applyPalette(p);
    try { window.localStorage.setItem(PALETTE_KEY, p.id); } catch { /* ignore */ }
  }, [paletteId]);

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
