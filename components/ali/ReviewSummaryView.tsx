import type { ReviewSummary } from "@/lib/db/queries/forecast";
import styles from "./ReviewForm.module.css";

/** Everyone's reviews of one ALI: tallies per ingredient plus the notes. */
export function ReviewSummaryView({
  summary,
  ingredientNames,
}: {
  summary: ReviewSummary;
  ingredientNames: Map<string, string>;
}) {
  const tallies = summary.tallies
    .map((t) => ({ ...t, name: ingredientNames.get(t.ingredientId) }))
    .filter((t): t is typeof t & { name: string } => Boolean(t.name))
    // Lead with what people disagreed with most; "just right" needs no action.
    .sort((a, b) => b.tooLittle + b.tooMuch - (a.tooLittle + a.tooMuch) || a.name.localeCompare(b.name));

  return (
    <div>
      {tallies.map((t) => (
        <div key={t.ingredientId} className={styles.tally}>
          <strong>{t.name}</strong>
          <span className={styles.tallyCounts}>
            {t.tooLittle} too little · {t.justRight} just right · {t.tooMuch} too much
          </span>
        </div>
      ))}
      {summary.notes.map((n, index) => (
        <blockquote key={index} className={styles.quote}>
          {n.note}
          <span className={styles.quoteBy}>{n.userName}</span>
        </blockquote>
      ))}
    </div>
  );
}
