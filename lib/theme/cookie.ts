import { cookies } from "next/headers";
import {
  DEFAULT_THEME_ACCENT,
  DEFAULT_THEME_MODE,
  isThemeAccent,
  isThemeMode,
  type ThemeAccent,
  type ThemeMode,
} from "@/lib/theme/presets";

export const THEME_MODE_COOKIE = "theme_mode";
export const THEME_ACCENT_COOKIE = "theme_accent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function readThemeCookie(): Promise<{
  mode: ThemeMode;
  accent: ThemeAccent;
}> {
  const store = await cookies();
  const mode = store.get(THEME_MODE_COOKIE)?.value;
  const accent = store.get(THEME_ACCENT_COOKIE)?.value;
  return {
    mode: isThemeMode(mode) ? mode : DEFAULT_THEME_MODE,
    accent: isThemeAccent(accent) ? accent : DEFAULT_THEME_ACCENT,
  };
}

export async function writeThemeCookie(mode: ThemeMode, accent: ThemeAccent) {
  const store = await cookies();
  store.set(THEME_MODE_COOKIE, mode, {
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });
  store.set(THEME_ACCENT_COOKIE, accent, {
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });
}
