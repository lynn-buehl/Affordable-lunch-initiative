"use client";

import { DivergingBarChart } from "@/components/stats/DivergingBarChart";
import type { WeeklyKarma } from "@/lib/db/queries/karma";
import { formatCents } from "@/lib/money";

const weekFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" });

export function KarmaHistory({ weeks }: { weeks: WeeklyKarma[] }) {
  if (weeks.length === 0) {
    return (
      <p style={{ color: "var(--text-subtle)", fontSize: 14, margin: 0 }}>
        No activity yet. Karma starts moving after the first ALI or shopping trip.
      </p>
    );
  }
  return (
    <DivergingBarChart
      data={weeks.map((w) => ({
        id: w.week,
        label: `Week of ${weekFormatter.format(new Date(w.week))}`,
        value: Math.round(w.karmaCents),
      }))}
      formatValue={formatCents}
      positiveLabel="Spent more than consumed"
      negativeLabel="Consumed more than spent"
      preserveOrder
    />
  );
}
