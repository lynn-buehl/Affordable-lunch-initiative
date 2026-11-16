import styles from "./Avatar.module.css";

const SCALES = ["plum", "teal", "amber", "blue", "grass"] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable per-name colour, so a person looks the same everywhere. */
function scaleFor(name: string): (typeof SCALES)[number] {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return SCALES[hash % SCALES.length];
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const scale = scaleFor(name);
  return (
    <span
      className={styles.avatar}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        backgroundColor: `var(--${scale}-4)`,
        color: `var(--${scale}-11)`,
        borderColor: `var(--${scale}-6)`,
      }}
    >
      {initials(name)}
    </span>
  );
}
