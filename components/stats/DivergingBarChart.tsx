"use client";

import { useState } from "react";
import { Table2, BarChart3 } from "lucide-react";
import styles from "./DivergingBarChart.module.css";
import tableStyles from "@/components/ui/Table.module.css";

export type DivergingBarDatum = { id: string; label: string; value: number };

const ROW_HEIGHT = 34;
const BAR_THICKNESS = 18;
const LABEL_WIDTH = 130;
const RIGHT_PADDING = 70;
const CHART_WIDTH = 640;

export function DivergingBarChart({
  data,
  formatValue,
  onSelectRow,
  selectedId,
  positiveLabel,
  negativeLabel,
  preserveOrder = false,
}: {
  data: DivergingBarDatum[];
  formatValue: (value: number) => string;
  onSelectRow?: (id: string) => void;
  selectedId?: string;
  positiveLabel: string;
  negativeLabel: string;
  /** Keep input order (e.g. chronological) instead of sorting by value. */
  preserveOrder?: boolean;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tablePosition, setTablePosition] = useState<{ x: number; y: number } | null>(null);
  const [showTable, setShowTable] = useState(false);

  const sorted = preserveOrder ? data : [...data].sort((a, b) => b.value - a.value);
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const chartAreaWidth = CHART_WIDTH - LABEL_WIDTH - RIGHT_PADDING;
  const zeroX = LABEL_WIDTH + chartAreaWidth / 2;
  const scale = chartAreaWidth / 2 / maxAbs;
  const height = sorted.length * ROW_HEIGHT + 8;

  if (data.length === 0) {
    return <p style={{ color: "var(--text-subtle)" }}>Nothing to show yet.</p>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.swatch} style={{ backgroundColor: "var(--balance-positive-chart)" }} />
            {positiveLabel}
          </span>
          <span className={styles.legendItem}>
            <span className={styles.swatch} style={{ backgroundColor: "var(--balance-negative-chart)" }} />
            {negativeLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {showTable ? <BarChart3 size={14} /> : <Table2 size={14} />}
          {showTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <div className={styles.tableWrapper}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Member</th>
                <th className={tableStyles.numeric}>Karma</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => (
                <tr key={d.id}>
                  <td>{d.label}</td>
                  <td className={tableStyles.numeric}>{formatValue(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.chartArea}>
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${height}`}
            width="100%"
            role="img"
            aria-label={`${positiveLabel} vs ${negativeLabel} by member`}
          >
            <line
              x1={zeroX}
              x2={zeroX}
              y1={0}
              y2={height}
              stroke="var(--border)"
              strokeWidth={1}
            />
            {sorted.map((d, i) => {
              const y = i * ROW_HEIGHT + 4;
              const barWidth = Math.abs(d.value) * scale;
              const barX = d.value >= 0 ? zeroX : zeroX - barWidth;
              const isPositive = d.value >= 0;
              const isSelected = selectedId === d.id;
              const valueText = formatValue(d.value);
              const labelSide = isPositive ? "start" : "end";
              const labelX = isPositive ? barX + barWidth + 8 : barX - 8;

              return (
                <g
                  key={d.id}
                  className={styles.row}
                  tabIndex={onSelectRow ? 0 : -1}
                  role={onSelectRow ? "button" : undefined}
                  aria-label={`${d.label}: ${valueText}`}
                  onMouseEnter={(e) => {
                    setHoverId(d.id);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTablePosition({ x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={() => setHoverId(null)}
                  onFocus={() => setHoverId(d.id)}
                  onBlur={() => setHoverId(null)}
                  onClick={() => onSelectRow?.(d.id)}
                  style={{ cursor: onSelectRow ? "pointer" : "default" }}
                >
                  <rect x={0} y={y} width={CHART_WIDTH} height={BAR_THICKNESS} fill="transparent" />
                  <text
                    x={LABEL_WIDTH - 10}
                    y={y + BAR_THICKNESS / 2 + 4}
                    textAnchor="end"
                    className={`${styles.rowLabel} ${isSelected ? styles.rowLabelSelected : ""}`}
                  >
                    {d.label}
                  </text>
                  <rect
                    className={styles.bar}
                    x={barX}
                    y={y}
                    width={Math.max(barWidth, 1)}
                    height={BAR_THICKNESS}
                    rx={4}
                    fill={
                      isPositive ? "var(--balance-positive-chart)" : "var(--balance-negative-chart)"
                    }
                    stroke={isSelected ? "var(--text)" : "none"}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                  <text
                    x={labelX}
                    y={y + BAR_THICKNESS / 2 + 4}
                    textAnchor={labelSide}
                    className={styles.valueLabel}
                  >
                    {valueText}
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
                      left: 0,
                      top: 0,
                      transform: `translate(${tablePosition.x}px, ${tablePosition.y}px) translate(-50%, -110%)`,
                      position: "fixed",
                    }}
                  >
                    <span className={styles.tooltipLabel}>{d.label}: </span>
                    <span className={styles.tooltipValue}>{formatValue(d.value)}</span>
                  </div>
                );
              })()
            : null}
        </div>
      )}
    </div>
  );
}
