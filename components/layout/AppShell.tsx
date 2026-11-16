import type { ReactNode } from "react";
import { signOut } from "@/lib/auth/config";
import { resolveTheme } from "@/lib/theme/resolve";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Nav } from "@/components/layout/Nav";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./AppShell.module.css";

export async function AppShell({
  isAdmin,
  user,
  children,
}: {
  isAdmin: boolean;
  user: { id: string; name: string };
  children: ReactNode;
}) {
  const { mode, accent } = await resolveTheme();

  const links = [
    { href: "/", label: "Home" },
    { href: "/ali", label: "ALI" },
    { href: "/finance", label: "Finance" },
    { href: "/ingredients", label: "Ingredients" },
    { href: "/stats", label: "Stats" },
    { href: "/members", label: "Members" },
    ...(isAdmin ? [{ href: "/admin/adjustments", label: "Adjustments" }] : []),
  ];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          ALI
        </Link>
        <Nav links={links} />
        <div className={styles.controls}>
          <Link
            href={`/members/${user.id}`}
            className={styles.me}
            aria-label="Your profile"
            title="Your profile"
          >
            <Avatar name={user.name} size={30} />
            <span className={styles.meName}>{user.name.split(" ")[0]}</span>
          </Link>
          <ThemeSwitcher mode={mode} accent={accent} />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
