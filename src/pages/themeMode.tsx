import { useTheme } from "@/lib/theme";

/** Compatibility hook for page-level settings that control the shared theme. */
export function useThemeMode() {
  const { theme, setTheme } = useTheme();
  return { mode: theme, setMode: setTheme };
}
