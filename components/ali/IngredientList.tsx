"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import {
  deactivateIngredientAction,
  toggleDefaultIngredientAction,
} from "@/lib/ali/actions";
import type { Ingredient } from "@/lib/db/schema";
import styles from "./IngredientRow.module.css";
import tableStyles from "@/components/ui/Table.module.css";

export function IngredientList({
  ingredients,
  defaultIds,
}: {
  ingredients: Ingredient[];
  defaultIds: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticDefaults, setOptimisticDefault] = useOptimistic(
    new Set(defaultIds),
    (state, { id, isDefault }: { id: string; isDefault: boolean }) => {
      const next = new Set(state);
      if (isDefault) next.add(id);
      else next.delete(id);
      return next;
    },
  );

  function toggleDefault(id: string, isDefault: boolean) {
    startTransition(async () => {
      setOptimisticDefault({ id, isDefault });
      await toggleDefaultIngredientAction(id, isDefault);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deactivateIngredientAction(id);
      router.refresh();
    });
  }

  return (
    <div className={tableStyles.wrapper}>
      {ingredients.length === 0 ? (
        <div className={styles.row} style={{ color: "var(--text-subtle)" }}>
          No ingredients yet — add the first one below.
        </div>
      ) : (
        ingredients.map((ingredient) => {
          const isDefault = optimisticDefaults.has(ingredient.id);
          return (
            <div className={styles.row} key={ingredient.id}>
              <button
                type="button"
                className={`${styles.starButton} ${isDefault ? styles.starActive : ""}`}
                onClick={() => toggleDefault(ingredient.id, !isDefault)}
                title={
                  isDefault
                    ? `Remove ${ingredient.name} from my defaults`
                    : `Always want ${ingredient.name}`
                }
                aria-pressed={isDefault}
              >
                <Star size={16} fill={isDefault ? "currentColor" : "none"} />
              </button>
              <span className={styles.name}>{ingredient.name}</span>
              <span className={styles.packageSize}>
                {ingredient.packageSize} per package
              </span>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => remove(ingredient.id)}
                title="Remove ingredient"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
