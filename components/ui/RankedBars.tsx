import styles from "./RankedBars.module.css";

/** A ranked list with proportional bars: favourite ingredients and the like. */
export function RankedBars({
  items,
  unit,
  emptyText,
}: {
  items: { id: string; label: string; value: number; note?: string }[];
  /** Printed before each value, e.g. "×". */
  unit?: string;
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className={styles.list}>
      {items.map((item, index) => (
        <li key={item.id} className={styles.row}>
          <span className={styles.rank}>{index + 1}</span>
          <div className={styles.body}>
            <div className={styles.head}>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.value}>
                {unit}
                {item.value}
                {item.note ? <span className={styles.note}> · {item.note}</span> : null}
              </span>
            </div>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
