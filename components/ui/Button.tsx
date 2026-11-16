import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
}) {
  const classes = [
    styles.button,
    styles[variant],
    size === "sm" ? styles.sm : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} {...props} />;
}
