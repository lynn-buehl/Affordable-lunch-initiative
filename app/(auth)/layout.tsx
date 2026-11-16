import styles from "@/components/layout/AuthShell.module.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.shell} aurora`}>
      <div className={`${styles.inner} animate-in`}>
        <span className={styles.brand}>ALI</span>
        {children}
      </div>
    </div>
  );
}
