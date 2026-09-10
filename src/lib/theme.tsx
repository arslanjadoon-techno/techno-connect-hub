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
  sidebarGradient?: string;
  previewGradient?: string;
  primaryGradient?: string;
  sidebarAccentForeground?: string;
  /** Hero gradient used on the login screen */
  heroGradient: string;
  /** Small swatch preview row */
  swatches: string[];
}

export const DEFAULT_PALETTE_ID = "violet";

// Curated palette set — each entry uses harmonious accent + sidebar tones.
export const PALETTES: Palette[] = [
  {
    id: "violet",
    name: "Violet",
    // Exact colors from MIS workspace reference
    primary: "#7F5AD6",
    primaryGlow: "#8B6EF0",
    ring: "#7F5AD6",
    primaryGradient: "linear-gradient(135deg, #8B6EF0 0%, #5B3FA8 100%)",
    sidebar: "#3C2E86",
    sidebarForeground: "#F1EEFB",
    sidebarAccent: "rgba(255, 255, 255, 0.14)",
    sidebarAccentForeground: "#FFFFFF",
    sidebarBorder: "rgba(255, 255, 255, 0.12)",
    sidebarGradient: "linear-gradient(160deg, #3C2E86 0%, #5B3FA8 45%, #7F5AD6 100%)",
    previewGradient: "linear-gradient(135deg, #3C2E86 0%, #5B3FA8 45%, #7F5AD6 100%)",
    heroGradient: "linear-gradient(160deg, #3C2E86 0%, #5B3FA8 45%, #7F5AD6 100%)",
    swatches: ["#3C2E86", "#5B3FA8", "#7F5AD6"],
  },
  {
    id: "blue-2742f5",
    name: "Blue (#2742F5)",
    // Lighter matching blue version for buttons, table headers, and accents
    primary: "#5C73F8",
    primaryGlow: "#879AFB",
    ring: "#5C73F8",
    // Exact sidebar color requested
    sidebar: "#2742F5",
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #1224ab 0%, #2742F5 45%, #0284c7 85%, #06b6d4 100%)",
    previewGradient: "linear-gradient(135deg, #1224ab 0%, #2742F5 50%, #06b6d4 100%)",
    heroGradient: "linear-gradient(135deg, #182BB8 0%, #2742F5 50%, #5C73F8 100%)",
    swatches: ["#2742F5", "#5C73F8", "#BAC5FC"],
  },
  {
    id: "purple-7327f5",
    name: "Purple (#7327F5)",
    // Lighter matching purple version for buttons, table headers, and accents
    primary: "#975CF8",
    primaryGlow: "#BD93FA",
    ring: "#975CF8",
    // Exact sidebar color requested
    sidebar: "#7327F5",
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #3d0c94 0%, #7327F5 45%, #9333ea 75%, #2563eb 100%)",
    previewGradient: "linear-gradient(135deg, #3d0c94 0%, #7327F5 50%, #2563eb 100%)",
    heroGradient: "linear-gradient(135deg, #4A12B0 0%, #7327F5 50%, #975CF8 100%)",
    swatches: ["#7327F5", "#975CF8", "#DCC7FE"],
  },
  {
    id: "grey-696969",
    name: "Grey (#696969)",
    // Lighter matching grey version for buttons, table headers, and accents
    primary: "#828282",
    primaryGlow: "#AAAAAA",
    ring: "#828282",
    // Exact sidebar color requested
    sidebar: "#696969",
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #1f2937 0%, #374151 40%, #696969 75%, #111827 100%)",
    previewGradient: "linear-gradient(135deg, #1f2937 0%, #696969 50%, #9ca3af 100%)",
    heroGradient: "linear-gradient(135deg, #444444 0%, #696969 50%, #888888 100%)",
    swatches: ["#696969", "#828282", "#E2E2E2"],
  },
  {
    id: "indigo",
    name: "Indigo Violet",
    primary: "oklch(0.52 0.21 275)",
    primaryGlow: "oklch(0.66 0.22 295)",
    ring: "oklch(0.66 0.22 295)",
    sidebar: "oklch(0.21 0.06 275)",
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #1e1b4b 0%, #3730a3 40%, #6366f1 75%, #2563eb 100%)",
    previewGradient: "linear-gradient(135deg, #1e1b4b 0%, #6366f1 50%, #2563eb 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #162f28 0%, #234d41 40%, #588c7e 75%, #b94f44 100%)",
    previewGradient: "linear-gradient(135deg, #162f28 0%, #588c7e 50%, #d96459 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #351c12 0%, #542f21 40%, #7e4a35 75%, #9e8947 100%)",
    previewGradient: "linear-gradient(135deg, #351c12 0%, #7e4a35 50%, #cab577 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #1a2727 0%, #2d4545 40%, #557979 75%, #85616e 100%)",
    previewGradient: "linear-gradient(135deg, #1a2727 0%, #77a8a8 50%, #c496a8 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #051626 0%, #0c3860 40%, #0284c7 75%, #06b6d4 100%)",
    previewGradient: "linear-gradient(135deg, #051626 0%, #0284c7 50%, #06b6d4 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #3d1003 0%, #7c2d12 40%, #ea580c 75%, #f59e0b 100%)",
    previewGradient: "linear-gradient(135deg, #3d1003 0%, #ea580c 50%, #f59e0b 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #042411 0%, #14532d 40%, #16a34a 75%, #0d9488 100%)",
    previewGradient: "linear-gradient(135deg, #042411 0%, #16a34a 50%, #0d9488 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #350216 0%, #5e0a30 40%, #9d174d 75%, #db2777 100%)",
    previewGradient: "linear-gradient(135deg, #350216 0%, #9d174d 50%, #db2777 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #032423 0%, #115e59 40%, #0d9488 75%, #0284c7 100%)",
    previewGradient: "linear-gradient(135deg, #032423 0%, #0d9488 50%, #0284c7 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #200238 0%, #4c0d82 40%, #7e22ce 75%, #4338ca 100%)",
    previewGradient: "linear-gradient(135deg, #200238 0%, #7e22ce 50%, #4338ca 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #080c16 0%, #1e293b 40%, #334155 75%, #1d4ed8 100%)",
    previewGradient: "linear-gradient(135deg, #080c16 0%, #334155 50%, #1d4ed8 100%)",
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
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient: "linear-gradient(170deg, #3a0808 0%, #7f1d1d 40%, #e11d48 75%, #f43f5e 100%)",
    previewGradient: "linear-gradient(135deg, #3a0808 0%, #e11d48 50%, #f43f5e 100%)",
    heroGradient:
      "linear-gradient(135deg, oklch(0.42 0.14 8) 0%, oklch(0.62 0.18 20) 50%, oklch(0.8 0.15 35) 100%)",
    swatches: ["#7f1d1d", "#fb7185", "#fecaca"],
  },
  ...(
    [
      // [id, name, L, C, H, swatches, sidebarGradient, previewGradient]
      [
        "rose-pop",
        "Rose Pop",
        0.63,
        0.24,
        9,
        ["#F5276C", "#FF7FA5", "#FFD6E3"],
        "linear-gradient(170deg, #42031c 0%, #831843 40%, #be185d 75%, #7c3aed 100%)",
        "linear-gradient(135deg, #42031c 0%, #be185d 50%, #7c3aed 100%)",
      ],
      [
        "ember",
        "Ember Orange",
        0.65,
        0.21,
        33,
        ["#F54927", "#FF8A63", "#FFD8C9"],
        "linear-gradient(170deg, #3d1003 0%, #7c2d12 40%, #c2410c 75%, #b91c1c 100%)",
        "linear-gradient(135deg, #3d1003 0%, #c2410c 50%, #b91c1c 100%)",
      ],
      [
        "gold",
        "Golden Hour",
        0.72,
        0.16,
        78,
        ["#F5B027", "#FFD37A", "#FFF0CC"],
        "linear-gradient(170deg, #261702 0%, #543606 40%, #854d0e 75%, #b45309 100%)",
        "linear-gradient(135deg, #261702 0%, #854d0e 50%, #b45309 100%)",
      ],
      [
        "mint",
        "Fresh Mint",
        0.72,
        0.16,
        163,
        ["#27F5B0", "#7DF0CE", "#D6FBEE"],
        "linear-gradient(170deg, #02241b 0%, #064e3b 40%, #047857 75%, #0284c7 100%)",
        "linear-gradient(135deg, #02241b 0%, #047857 50%, #0284c7 100%)",
      ],
      [
        "azure",
        "Azure Blue",
        0.57,
        0.22,
        262,
        ["#276CF5", "#7BA4FF", "#D6E3FF"],
        "linear-gradient(170deg, #0a1738 0%, #1e3a8a 40%, #2563eb 75%, #4f46e5 100%)",
        "linear-gradient(135deg, #0a1738 0%, #2563eb 50%, #4f46e5 100%)",
      ],
      [
        "magenta",
        "Magenta Ink",
        0.5,
        0.23,
        328,
        ["#A300A3", "#D45BD4", "#F3D2F3"],
        "linear-gradient(170deg, #300230 0%, #701a75 40%, #a21caf 75%, #e11d48 100%)",
        "linear-gradient(135deg, #300230 0%, #a21caf 50%, #e11d48 100%)",
      ],
      [
        "cyan",
        "Electric Cyan",
        0.64,
        0.13,
        215,
        ["#06B6D4", "#67E8F9", "#CFFAFE"],
        "linear-gradient(170deg, #022423 0%, #0e7490 40%, #0284c7 75%, #2563eb 100%)",
        "linear-gradient(135deg, #022423 0%, #0284c7 50%, #2563eb 100%)",
      ],
      [
        "crimson",
        "Crimson Red",
        0.59,
        0.22,
        18,
        ["#E11D48", "#FB7185", "#FFE4E6"],
        "linear-gradient(170deg, #3d0313 0%, #881337 40%, #be123c 75%, #7e22ce 100%)",
        "linear-gradient(135deg, #3d0313 0%, #be123c 50%, #7e22ce 100%)",
      ],
      [
        "graphite",
        "Graphite Grey",
        0.5,
        0.02,
        257,
        ["#334155", "#64748B", "#CBD5E1"],
        "linear-gradient(170deg, #0b111e 0%, #1e293b 40%, #334155 75%, #475569 100%)",
        "linear-gradient(135deg, #0b111e 0%, #334155 50%, #475569 100%)",
      ],
      [
        "obsidian",
        "Obsidian Black",
        0.32,
        0.01,
        266,
        ["#0F172A", "#1F2937", "#94A3B8"],
        "linear-gradient(170deg, #020617 0%, #0f172a 40%, #1e1b4b 75%, #0f172a 100%)",
        "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)",
      ],
    ] as Array<[string, string, number, number, number, string[], string, string]>
  ).map(([id, name, L, C, H, swatches, sidebarGradient, previewGradient]) => ({
    id,
    name,
    primary: `oklch(${L} ${C} ${H})`,
    primaryGlow: `oklch(${Math.min(L + 0.14, 0.9)} ${Math.max(C - 0.03, 0.02)} ${H})`,
    ring: `oklch(${Math.min(L + 0.14, 0.9)} ${Math.max(C - 0.03, 0.02)} ${H})`,
    sidebar: `oklch(0.22 ${Math.min(C * 0.35, 0.08)} ${H})`,
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "rgba(255, 255, 255, 0.18)",
    sidebarBorder: "rgba(255, 255, 255, 0.16)",
    sidebarGradient,
    previewGradient,
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
  // Accent / button colors (lighter matching version)
  r.setProperty("--primary", p.primary);
  r.setProperty("--primary-foreground", "#FFFFFF");
  r.setProperty("--primary-glow", p.primaryGlow);
  r.setProperty("--ring", p.ring);
  r.setProperty(
    "--gradient-primary",
    p.primaryGradient || `linear-gradient(135deg, ${p.primary}, ${p.primaryGlow})`,
  );
  r.setProperty("--gradient-hero", p.heroGradient);

  // Accent used by hover states
  r.setProperty(
    "--accent",
    `color-mix(in oklab, ${p.primary} 12%, ${theme === "dark" ? "oklch(0.24 0.04 275)" : "#ffffff"})`,
  );

  // Exact sidebar color requested by user
  r.setProperty("--sidebar", p.sidebar);
  r.setProperty("--sidebar-foreground", p.sidebarForeground || "#FFFFFF");
  r.setProperty("--sidebar-primary", p.primaryGlow);
  r.setProperty("--sidebar-primary-foreground", p.sidebar);
  r.setProperty("--sidebar-accent", p.sidebarAccent || "rgba(255, 255, 255, 0.18)");
  r.setProperty(
    "--sidebar-accent-foreground",
    p.sidebarAccentForeground || p.sidebarForeground || "#FFFFFF",
  );
  r.setProperty("--sidebar-border", p.sidebarBorder || "rgba(255, 255, 255, 0.15)");
  r.setProperty("--sidebar-ring", p.ring);
  const sidebarGrad =
    p.sidebarGradient ||
    `linear-gradient(170deg, ${p.sidebar} 0%, color-mix(in oklab, ${p.sidebar} 70%, ${p.primary}) 50%, ${p.primary} 100%)`;
  r.setProperty("--sidebar-gradient", sidebarGrad);
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
    if (typeof window === "undefined") return DEFAULT_PALETTE_ID;
    try {
      const pid = window.localStorage.getItem(PALETTE_KEY);
      if (!pid || pid === "indigo") return DEFAULT_PALETTE_ID;
      return PALETTES.some((p) => p.id === pid) ? pid : DEFAULT_PALETTE_ID;
    } catch {
      return DEFAULT_PALETTE_ID;
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
