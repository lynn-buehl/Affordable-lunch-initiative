"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppShell.module.css";

export function Nav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
