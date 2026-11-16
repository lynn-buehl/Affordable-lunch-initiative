import type { ReactNode } from "react";
import styles from "./Badge.module.css";

type Kind = "accent" | "positive" | "negative" | "neutral";

export function Badge({ kind, children }: { kind: Kind; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[kind]}`}>{children}</span>;
}
