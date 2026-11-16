"use server";

import { auth } from "@/lib/auth/config";
import { writeThemeCookie } from "@/lib/theme/cookie";
import { updateUserTheme } from "@/lib/db/queries/users";
import { isThemeAccent, isThemeMode } from "@/lib/theme/presets";

export async function setTheme(mode: unknown, accent: unknown) {
  if (!isThemeMode(mode) || !isThemeAccent(accent)) return;

  await writeThemeCookie(mode, accent);

  const session = await auth();
  if (session?.user?.id) {
    await updateUserTheme(session.user.id, mode, accent);
  }
}
