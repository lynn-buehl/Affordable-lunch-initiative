"use client";

import { useState } from "react";
import styles from "./DivergingBarChart.module.css";

export type SequentialBarDatum = { id: string; label: string; value: number };

const ROW_HEIGHT = 30;
const BAR_THICKNESS = 16;
const LABEL_WIDTH = 130;
const RIGHT_PADDING = 50;
const CHART_WIDTH = 560;

// Server Components can't pass function props to Client Components (not
// serializable), so this formats votes itself rather than accepting a
// formatValue prop — fine since it's only ever used for vote counts.
function formatValue(value: number): string {
  return `${value} vote${value === 1 ? "" : "s"}`;
}

export function SequentialBarChart({ data }: { data: SequentialBarDatum[] }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tablePosition, setTablePosition] = useState<{ x: number; y: number } | null>(null);

  if (data.length === 0) {
    return <p style={{ color: "var(--text-subtle)" }}>No votes in this window yet.</p>;
  }

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...data.map((d) => d.value));
  const chartAreaWidth = CHART_WIDTH - LABEL_WIDTH - RIGHT_PADDING;
  const scale = chartAreaWidth / max;
  const height = sorted.length * ROW_HEIGHT + 8;

  return (
    <div className={styles.chartArea}>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${height}`} width="100%" role="img" aria-label="Trending ingredients">
        {sorted.map((d, i) => {
          const y = i * ROW_HEIGHT + 4;
          const barWidth = d.value * scale;
          return (
            <g
              key={d.id}
              onMouseEnter={(e) => {
                setHoverId(d.id);
                const rect = e.currentTarget.getBoundingClientRect();
                setTablePosition({ x: rect.left + rect.width / 2, y: rect.top });
              }}
              onMouseLeave={() => setHoverId(null)}
            >
              <rect x={0} y={y} width={CHART_WIDTH} height={BAR_THICKNESS} fill="transparent" />
              <text
                x={LABEL_WIDTH - 10}
                y={y + BAR_THICKNESS / 2 + 4}
                textAnchor="end"
                className={styles.rowLabel}
              >
                {d.label}
              </text>
              <rect
                className={styles.bar}
                x={LABEL_WIDTH}
                y={y}
                width={Math.max(barWidth, 1)}
                height={BAR_THICKNESS}
                rx={4}
                fill="var(--accent-9)"
              />
              <text
                x={LABEL_WIDTH + barWidth + 8}
                y={y + BAR_THICKNESS / 2 + 4}
                textAnchor="start"
                className={styles.valueLabel}
              >
                {formatValue(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
      {hoverId && tablePosition
        ? (() => {
            const d = sorted.find((row) => row.id === hoverId);
            if (!d) return null;
            return (
              <div
                className={styles.tooltip}
                style={{
                  position: "fixed",
                  left: 0,
                  top: 0,
                  transform: `translate(${tablePosition.x}px, ${tablePosition.y}px) translate(-50%, -110%)`,
                }}
              >
                <span className={styles.tooltipLabel}>{d.label}: </span>
                <span className={styles.tooltipValue}>{formatValue(d.value)}</span>
              </div>
            );
          })()
        : null}
    </div>
  );
}
