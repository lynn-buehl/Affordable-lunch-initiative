"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuSwatch,
} from "@/components/ui/DropdownMenu";
import { Button } from "@/components/ui/Button";
import { ACCENT_PRESETS, type ThemeAccent, type ThemeMode } from "@/lib/theme/presets";
import { setTheme } from "@/lib/theme/actions";

export function ThemeSwitcher({
  mode: initialMode,
  accent: initialAccent,
}: {
  mode: ThemeMode;
  accent: ThemeAccent;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Local state, applied to the DOM immediately on click, rather than
  // waiting on a router.refresh() round-trip: relying solely on the mode/
  // accent props meant two quick clicks (e.g. Dark, then Amber) could race
  // and have the second click read stale props, reverting the first.
  const [mode, setMode] = useState(initialMode);
  const [accent, setAccent] = useState(initialAccent);

  function apply(nextMode: ThemeMode, nextAccent: ThemeAccent) {
    setMode(nextMode);
    setAccent(nextAccent);
    document.documentElement.dataset.mode = nextMode;
    document.documentElement.dataset.accent = nextAccent;

    startTransition(async () => {
      await setTheme(nextMode, nextAccent);
      router.refresh();
    });
  }

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <MenuSwatch color="var(--accent-9)" />
          Theme
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>Mode</MenuLabel>
        <MenuItem onSelect={() => apply("light", accent)}>
          {mode === "light" ? "● " : "○ "}Light
        </MenuItem>
        <MenuItem onSelect={() => apply("dark", accent)}>
          {mode === "dark" ? "● " : "○ "}Dark
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>Accent</MenuLabel>
        {ACCENT_PRESETS.map((preset) => (
          <MenuItem key={preset.id} onSelect={() => apply(mode, preset.id)}>
            <MenuSwatch color={preset.swatch} />
            {preset.label}
            {accent === preset.id ? " ✓" : ""}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  );
}
