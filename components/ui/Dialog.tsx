"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import styles from "./Dialog.module.css";

export const DialogRoot = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={styles.overlay} />
      <RadixDialog.Content className={styles.content}>
        <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
        {description ? (
          <RadixDialog.Description className={styles.description}>
            {description}
          </RadixDialog.Description>
        ) : null}
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
