import styles from "./FormMessage.module.css";

export function FormMessage({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div className={[styles.message, styles[kind]].join(" ")} role="status">
      {children}
    </div>
  );
}
