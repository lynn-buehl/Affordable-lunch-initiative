import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { readThemeCookie } from "@/lib/theme/cookie";
import { isThemeAccent, isThemeMode } from "@/lib/theme/presets";
import type { ThemeAccent, ThemeMode } from "@/lib/theme/presets";

/**
 * Resolves the theme to render server-side, with zero client-side script
 * and no flash: logged-in users get their saved DB preference (falling
 * back to the pre-login cookie if unset), anonymous visitors get the
 * cookie (falling back to the built-in defaults).
 */
export async function resolveTheme(): Promise<{
  mode: ThemeMode;
  accent: ThemeAccent;
}> {
  const cookieTheme = await readThemeCookie();
  const session = await auth();
  if (!session?.user?.id) return cookieTheme;

  const [user] = await db
    .select({ themeMode: users.themeMode, themeAccent: users.themeAccent })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    mode: isThemeMode(user?.themeMode) ? user.themeMode : cookieTheme.mode,
    accent: isThemeAccent(user?.themeAccent)
      ? user.themeAccent
      : cookieTheme.accent,
  };
}
