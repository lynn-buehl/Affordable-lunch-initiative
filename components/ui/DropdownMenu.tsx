"use client";

import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import styles from "./DropdownMenu.module.css";

export const MenuRoot = RadixMenu.Root;
export const MenuTrigger = RadixMenu.Trigger;

export function MenuContent({
  children,
  align = "end",
}: {
  children: ReactNode;
  align?: "start" | "end" | "center";
}) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        className={styles.content}
        align={align}
        sideOffset={8}
      >
        {children}
      </RadixMenu.Content>
    </RadixMenu.Portal>
  );
}

export function MenuItem({
  children,
  onSelect,
  disabled,
}: {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
}) {
  return (
    <RadixMenu.Item
      className={styles.item}
      onSelect={onSelect}
      disabled={disabled}
    >
      {children}
    </RadixMenu.Item>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <RadixMenu.Label className={styles.label}>{children}</RadixMenu.Label>;
}

export function MenuSeparator() {
  return <RadixMenu.Separator className={styles.separator} />;
}

export function MenuSwatch({ color }: { color: string }) {
  return <span className={styles.swatch} style={{ backgroundColor: color }} />;
}
