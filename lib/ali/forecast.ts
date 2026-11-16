/**
 * Forecast: what each person will probably want at the next ALI, and how
 * the group's reviews should nudge the amounts.
 *
 * This is deliberately a small, explainable formula rather than a fitted
 * regression. With a handful of ALIs per person there is far too little data
 * to fit coefficients that mean anything, and a shopper needs to be able to
 * see why the list says "3 hummus". It has the two terms the group asked
 * for:
 *
 *   1. A personal preference term. For each person and ingredient, a
 *      recency-weighted average of how many they asked for at the ALIs they
 *      joined (0 when they skipped it). For items on their standing order,
 *      the standing order counts as one extra "wanted 1" observation, so
 *      new members start from it and regulars drift towards what they
 *      actually pick.
 *
 *   2. A review term. After each ALI people say whether there was too
 *      little, the right amount or too much of an ingredient. The recent
 *      average of those verdicts scales the amount bought by up to +/-25%.
 *
 * Pure functions only; the database loading lives in
 * lib/db/queries/forecast.ts so this file can be tested on its own.
 */

/** Each older ALI counts this much less than the one after it. */
export const PREFERENCE_DECAY = 0.7;
/** How many of a person's past ALIs are looked at. */
export const PREFERENCE_HISTORY = 8;
/** The standing order counts like this many ALIs' worth of evidence. */
export const STANDING_ORDER_WEIGHT = 1;

export const REVIEW_DECAY = 0.6;
export const REVIEW_HISTORY = 4;
/** Largest change reviews can make: 0.25 means between -25% and +25%. */
export const REVIEW_MAX_SHIFT = 0.25;

export type Verdict = "too_little" | "just_right" | "too_much";

const VERDICT_SCORE: Record<Verdict, number> = {
  too_little: 1,
  just_right: 0,
  too_much: -1,
};

/**
 * Expected quantity per ingredient for one person.
 *
 * @param pastVotes The person's votes at the ALIs they joined, most recent
 *   first. Each entry maps ingredient id to quantity; missing means 0.
 * @param standingOrder Ingredient ids on their standing order.
 */
export function personalForecast(
  pastVotes: Map<string, number>[],
  standingOrder: Set<string>,
): Map<string, number> {
  const history = pastVotes.slice(0, PREFERENCE_HISTORY);
  const ingredientIds = new Set<string>(standingOrder);
  for (const votes of history) for (const id of votes.keys()) ingredientIds.add(id);

  const historyWeight = history.reduce((sum, _votes, k) => sum + PREFERENCE_DECAY ** k, 0);

  const expected = new Map<string, number>();
  for (const id of ingredientIds) {
    // The standing order is evidence FOR its items only. It must not count
    // as a "didn't want it" vote against everything else, or someone who
    // takes two wraps every single time would be forecast at fewer than two.
    const standing = standingOrder.has(id) ? STANDING_ORDER_WEIGHT : 0;
    let weighted = standing;
    history.forEach((votes, k) => {
      weighted += PREFERENCE_DECAY ** k * (votes.get(id) ?? 0);
    });
    expected.set(id, weighted / (historyWeight + standing));
  }
  return expected;
}

/**
 * Turns expected quantities into the vote a person is pre-filled with when
 * they opt in: anything they'd more likely than not pick, at the rounded
 * amount. Standing-order items are always included.
 */
export function prefillFromForecast(
  expected: Map<string, number>,
  standingOrder: Set<string>,
): Map<string, number> {
  const prefill = new Map<string, number>();
  for (const [id, quantity] of expected) {
    if (quantity >= 0.5 || standingOrder.has(id)) {
      prefill.set(id, Math.max(1, Math.round(quantity)));
    }
  }
  return prefill;
}

/**
 * Multiplier for how much of one ingredient to buy, from its reviews.
 *
 * @param verdictsByAli Verdicts for this ingredient per past ALI, most
 *   recent first. ALIs nobody reviewed should be left out.
 * @returns Between 1 - REVIEW_MAX_SHIFT and 1 + REVIEW_MAX_SHIFT; 1 when
 *   there are no reviews.
 */
export function reviewFactor(verdictsByAli: Verdict[][]): number {
  const recent = verdictsByAli.filter((v) => v.length > 0).slice(0, REVIEW_HISTORY);
  if (recent.length === 0) return 1;

  let weighted = 0;
  let totalWeight = 0;
  recent.forEach((verdicts, k) => {
    const mean = verdicts.reduce((sum, v) => sum + VERDICT_SCORE[v], 0) / verdicts.length;
    weighted += REVIEW_DECAY ** k * mean;
    totalWeight += REVIEW_DECAY ** k;
  });
  return 1 + REVIEW_MAX_SHIFT * (weighted / totalWeight);
}

/** Packs to buy for a wanted quantity, after the review adjustment. */
export function packagesToBuy(quantity: number, packageSize: number, factor: number): number {
  if (quantity <= 0) return 0;
  // Round to 2 decimals first so 4 x 1.25 = 5.000000001 doesn't buy a 6th.
  const adjusted = Math.round(quantity * factor * 100) / 100;
  return Math.max(1, Math.ceil(adjusted / packageSize));
}
