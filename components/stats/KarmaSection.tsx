"use client";

import { useState } from "react";
import { DivergingBarChart } from "@/components/stats/DivergingBarChart";
import type { PersonKarma } from "@/lib/db/queries/karma";
import { formatCents } from "@/lib/money";

const weekFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" });

export function KarmaSection({ people }: { people: PersonKarma[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(people[0]?.userId ?? null);
  const selected = people.find((p) => p.userId === selectedId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <DivergingBarChart
        data={people.map((p) => ({ id: p.userId, label: p.name, value: p.totalKarmaCents }))}
        formatValue={formatCents}
        onSelectRow={setSelectedId}
        selectedId={selectedId ?? undefined}
        positiveLabel="Spent more than consumed"
        negativeLabel="Consumed more than spent"
      />

      {selected ? (
        <div>
          <h3 style={{ fontSize: 15, marginBottom: 12, color: "var(--text-muted)" }}>
            {selected.name}&rsquo;s karma by week
          </h3>
          {selected.weeks.length === 0 ? (
            <p style={{ color: "var(--text-subtle)", fontSize: 14 }}>
              No activity yet — spend money or opt into an ALI to build up karma.
            </p>
          ) : (
            <DivergingBarChart
              data={selected.weeks.map((w) => ({
                id: w.week,
                label: weekFormatter.format(new Date(w.week)),
                value: w.karmaCents,
              }))}
              formatValue={formatCents}
              positiveLabel="Spent more than consumed"
              negativeLabel="Consumed more than spent"
              preserveOrder
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
