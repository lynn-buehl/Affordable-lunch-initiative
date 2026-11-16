import type { ReactNode } from "react";
import styles from "./StatTile.module.css";

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "positive" | "negative";
  icon?: ReactNode;
}) {
  return (
    <div className={styles.tile}>
      <div className={styles.label}>
        {icon}
        {label}
      </div>
      <div className={`${styles.value} ${styles[tone]}`}>{value}</div>
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}
