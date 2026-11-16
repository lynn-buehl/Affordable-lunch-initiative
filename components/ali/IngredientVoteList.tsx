"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { setVoteAction } from "@/lib/ali/actions";
import type { Ingredient } from "@/lib/db/schema";
import styles from "./IngredientVoteList.module.css";

export function IngredientVoteList({
  eventId,
  ingredients,
  votes,
}: {
  eventId: string;
  ingredients: Ingredient[];
  votes: Record<string, number>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticVotes, setOptimisticVote] = useOptimistic(
    votes,
    (state, { id, quantity }: { id: string; quantity: number }) => ({
      ...state,
      [id]: quantity,
    }),
  );

  function setQuantity(id: string, quantity: number) {
    const clamped = Math.max(0, quantity);
    startTransition(async () => {
      setOptimisticVote({ id, quantity: clamped });
      await setVoteAction(eventId, id, clamped);
      router.refresh();
    });
  }

  return (
    <div className={styles.grid}>
      {ingredients.map((ingredient) => {
        const quantity = optimisticVotes[ingredient.id] ?? 0;
        return (
          <div
            key={ingredient.id}
            className={`${styles.option} ${quantity > 0 ? styles.optionActive : ""}`}
          >
            <span className={styles.name}>{ingredient.name}</span>
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.stepperButton}
                onClick={() => setQuantity(ingredient.id, quantity - 1)}
                disabled={quantity === 0}
                aria-label={`Fewer ${ingredient.name}`}
              >
                <Minus size={14} />
              </button>
              <span className={styles.count}>{quantity}</span>
              <button
                type="button"
                className={styles.stepperButton}
                onClick={() => setQuantity(ingredient.id, quantity + 1)}
                aria-label={`More ${ingredient.name}`}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
