"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setIngredientReviewAction, saveReviewNoteAction } from "@/lib/ali/actions";
import type { ActionState } from "@/lib/auth/actions";
import type { Verdict } from "@/lib/ali/forecast";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import styles from "./ReviewForm.module.css";

const CHOICES: { verdict: Verdict; label: string }[] = [
  { verdict: "too_little", label: "Too little" },
  { verdict: "just_right", label: "Just right" },
  { verdict: "too_much", label: "Too much" },
];

/**
 * "How did the amounts work out?" for one finished ALI. Each tap saves
 * straight away; tapping the selected answer again clears it.
 */
export function ReviewForm({
  eventId,
  items,
  verdicts,
  note,
}: {
  eventId: string;
  items: { ingredientId: string; name: string }[];
  verdicts: Record<string, Verdict>;
  note: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    verdicts,
    (state, change: { id: string; verdict: Verdict | null }) => {
      const next = { ...state };
      if (change.verdict) next[change.id] = change.verdict;
      else delete next[change.id];
      return next;
    },
  );
  const [noteState, noteAction] = useActionState<ActionState, FormData>(
    saveReviewNoteAction.bind(null, eventId),
    undefined,
  );

  function choose(id: string, verdict: Verdict) {
    const next = optimistic[id] === verdict ? null : verdict;
    startTransition(async () => {
      setOptimistic({ id, verdict: next });
      try {
        await setIngredientReviewAction(eventId, id, next);
      } finally {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <ul className={styles.rows}>
        {items.map((item) => (
          <li key={item.ingredientId} className={styles.row}>
            <span className={styles.name}>{item.name}</span>
            <div className={styles.choices} role="group" aria-label={`Amount of ${item.name}`}>
              {CHOICES.map((choice) => {
                const active = optimistic[item.ingredientId] === choice.verdict;
                return (
                  <button
                    key={choice.verdict}
                    type="button"
                    aria-pressed={active}
                    className={`${styles.choice} ${active ? styles.choiceActive : ""}`}
                    onClick={() => choose(item.ingredientId, choice.verdict)}
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <form action={noteAction} style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
        <div style={{ width: "100%" }}>
          <label htmlFor="review-note" className={styles.label}>
            Anything the next shopper should know?
          </label>
          <textarea
            id="review-note"
            name="note"
            className={styles.note}
            defaultValue={note}
            maxLength={500}
            placeholder="e.g. the vegetable falafel was not a hit"
          />
        </div>
        {noteState?.error ? <FormMessage kind="error">{noteState.error}</FormMessage> : null}
        {noteState?.success ? <FormMessage kind="success">{noteState.success}</FormMessage> : null}
        <SubmitButton pendingLabel="Saving…">
          Save note
        </SubmitButton>
      </form>
    </div>
  );
}
