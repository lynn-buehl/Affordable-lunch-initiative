import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";

export function Card({
  className,
  interactive,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={[styles.card, interactive ? styles.interactive : "", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
