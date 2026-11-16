export const THEME_MODES = ["light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const ACCENT_PRESETS = [
  { id: "slate", label: "Slate", swatch: "#8b8d98" },
  { id: "forest", label: "Forest", swatch: "#46a758" },
  { id: "plum", label: "Plum", swatch: "#ab4aba" },
  { id: "amber", label: "Amber", swatch: "#ffc53d" },
  { id: "ocean", label: "Ocean", swatch: "#12a594" },
] as const;

export type ThemeAccent = (typeof ACCENT_PRESETS)[number]["id"];

export const DEFAULT_THEME_MODE: ThemeMode = "light";
export const DEFAULT_THEME_ACCENT: ThemeAccent = "forest";

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}

export function isThemeAccent(value: unknown): value is ThemeAccent {
  return ACCENT_PRESETS.some((preset) => preset.id === value);
}
