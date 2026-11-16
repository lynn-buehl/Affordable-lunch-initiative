/**
 * Checks for the forecast formula. Plain node:test, no extra dependencies:
 *   npm run test:unit
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  packagesToBuy,
  personalForecast,
  prefillFromForecast,
  reviewFactor,
} from "../../lib/ali/forecast";

const votes = (entries: Record<string, number>) => new Map(Object.entries(entries));

test("a new member is pre-filled with exactly their standing order", () => {
  const standing = new Set(["wraps", "hummus"]);
  const prefill = prefillFromForecast(personalForecast([], standing), standing);
  assert.deepEqual(Object.fromEntries(prefill), { wraps: 1, hummus: 1 });
});

test("something picked at every recent ALI is pre-filled without a standing order", () => {
  const history = [votes({ feta: 1 }), votes({ feta: 1 }), votes({ feta: 1 })];
  const prefill = prefillFromForecast(personalForecast(history, new Set()), new Set());
  assert.equal(prefill.get("feta"), 1);
});

test("something picked once, long ago, is not pre-filled", () => {
  const history = [votes({}), votes({}), votes({}), votes({ corn: 1 })];
  const prefill = prefillFromForecast(personalForecast(history, new Set()), new Set());
  assert.equal(prefill.has("corn"), false);
});

test("recent ALIs count more than old ones", () => {
  const recentlyYes = personalForecast([votes({ a: 1 }), votes({})], new Set()).get("a")!;
  const recentlyNo = personalForecast([votes({}), votes({ a: 1 })], new Set()).get("a")!;
  assert.ok(recentlyYes > recentlyNo);
});

test("someone who always takes two is pre-filled with two", () => {
  const history = [votes({ wraps: 2 }), votes({ wraps: 2 }), votes({ wraps: 2 }), votes({ wraps: 2 })];
  const prefill = prefillFromForecast(personalForecast(history, new Set()), new Set());
  assert.equal(prefill.get("wraps"), 2);
});

test("a standing-order item stays even after being skipped a few times", () => {
  const standing = new Set(["schmand"]);
  const history = [votes({}), votes({}), votes({})];
  const prefill = prefillFromForecast(personalForecast(history, standing), standing);
  assert.equal(prefill.get("schmand"), 1);
});

test("no reviews means no adjustment", () => {
  assert.equal(reviewFactor([]), 1);
  assert.equal(reviewFactor([[], []]), 1);
});

test("unanimous 'too little' buys 25% more, 'too much' 25% less", () => {
  assert.equal(reviewFactor([["too_little", "too_little"]]), 1.25);
  assert.equal(reviewFactor([["too_much"]]), 0.75);
});

test("mixed opinions cancel out", () => {
  assert.equal(reviewFactor([["too_little", "too_much", "just_right"]]), 1);
});

test("the latest ALI's reviews outweigh older ones", () => {
  const factor = reviewFactor([["too_much"], ["too_little"]]);
  assert.ok(factor < 1);
});

test("packs round up, and the review factor can add or remove a pack", () => {
  assert.equal(packagesToBuy(6, 8, 1), 1);
  assert.equal(packagesToBuy(9, 8, 1), 2);
  assert.equal(packagesToBuy(8, 8, 1.25), 2);
  assert.equal(packagesToBuy(9, 8, 0.75), 1);
  assert.equal(packagesToBuy(4, 1, 1.25), 5);
});

test("an ingredient someone wants is never adjusted down to nothing", () => {
  assert.equal(packagesToBuy(1, 1, 0.75), 1);
  assert.equal(packagesToBuy(0, 1, 1.25), 0);
});
