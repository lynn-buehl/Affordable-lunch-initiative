"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { ShoppingListItem } from "@/lib/db/queries/ali-events";
import { toggleShoppingCheckAction } from "@/lib/ali/actions";
import styles from "./ShoppingChecklist.module.css";

/**
 * The shopping list as a tap-to-tick checklist. Ticks are saved on the
 * server, so they survive a reload and two people shopping together share
 * one list. `readOnly` shows the final state once the ALI is completed.
 */
export function ShoppingChecklist({
  eventId,
  items,
  readOnly,
}: {
  eventId: string;
  items: ShoppingListItem[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticItems, setOptimistic] = useOptimistic(
    items,
    (current, change: { ingredientId: string; checked: boolean }) =>
      current.map((item) =>
        item.ingredientId === change.ingredientId ? { ...item, checked: change.checked } : item,
      ),
  );

  if (items.length === 0) {
    return (
      <p style={{ color: "var(--text-subtle)", margin: 0 }}>
        Nobody asked for anything, so there&apos;s nothing to buy.
      </p>
    );
  }

  function toggle(item: ShoppingListItem) {
    const checked = !item.checked;
    startTransition(async () => {
      setOptimistic({ ingredientId: item.ingredientId, checked });
      try {
        await toggleShoppingCheckAction(eventId, item.ingredientId, checked);
      } finally {
        router.refresh();
      }
    });
  }

  // Unticked first, so what's still missing stays at the top of the screen.
  const sorted = [...optimisticItems].sort(
    (a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name),
  );
  const doneCount = optimisticItems.filter((i) => i.checked).length;

  return (
    <div>
      {!readOnly ? (
        <div className={styles.progress}>
          <div
            className={styles.track}
            role="progressbar"
            aria-label="Items in the basket"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={doneCount}
          >
            <div className={styles.fill} style={{ width: `${(doneCount / items.length) * 100}%` }} />
          </div>
          <span>
            {doneCount} of {items.length} in the basket
          </span>
        </div>
      ) : null}

      <ul className={styles.list}>
        {sorted.map((item) => (
          <li key={item.ingredientId} data-shopping-item={item.name}>
            <button
              type="button"
              role="checkbox"
              aria-checked={item.checked}
              disabled={readOnly}
              onClick={() => toggle(item)}
              className={`${styles.item} ${item.checked ? styles.itemChecked : ""}`}
            >
              {readOnly && !item.checked ? null : (
                <span className={styles.box}>
                  <Check size={18} strokeWidth={3} />
                </span>
              )}
              <span className={styles.text}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.detail}>
                  {item.quantity} wanted
                  {item.packageSize > 1 ? ` · ${item.packageSize} per pack` : ""}
                </span>
                {item.reviewAdjustment ? (
                  <span className={styles.adjusted}>
                    {item.reviewAdjustment === "more"
                      ? "Buying extra: reviews said there was too little"
                      : "Buying less: reviews said there was too much"}
                  </span>
                ) : null}
              </span>
              <span className={styles.amount} aria-label={`Buy ${item.packagesToBuy}`}>
                {item.packagesToBuy}×
              </span>
            </button>
          </li>
        ))}
      </ul>

      {!readOnly && doneCount === items.length ? (
        <p className={styles.done}>Everything&apos;s in the basket. Scan the receipt below when you&apos;ve paid.</p>
      ) : null}
    </div>
  );
}
