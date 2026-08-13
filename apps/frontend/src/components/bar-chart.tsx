'use client';

import {
  ACCENT,
  AXIS_TEXT,
  ChartEmpty,
  TRACK,
  VALUE_TEXT,
  horizontalBarPath,
} from './chart-theme';

export interface BarDatum {
  label: string;
  value: number;
  /** Overrides the number printed at the bar's tip. */
  valueLabel?: string;
}

const LABEL_GUTTER = 150;
const VALUE_GUTTER = 64;
const ROW_HEIGHT = 28;
const BAR_HEIGHT = 16;
const MIN_WIDTH = 440;

/**
 * Horizontal bars for comparing magnitude across a handful of named categories.
 * One measure, so one hue: identity comes from the row label, not from colour.
 * Every bar is direct-labelled, which is also the relief for the lighter hues.
 */
export function BarChart({
  data,
  ariaLabel,
  color = ACCENT,
  emptyMessage = 'Nothing to show yet.',
}: {
  data: BarDatum[];
  ariaLabel: string;
  color?: string;
  emptyMessage?: string;
}) {
  if (!data.length) return <ChartEmpty message={emptyMessage} />;

  const max = Math.max(...data.map((row) => (Number.isFinite(row.value) ? row.value : 0)), 0);
  const height = data.length * ROW_HEIGHT;
  const plotWidth = MIN_WIDTH - LABEL_GUTTER - VALUE_GUTTER;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${MIN_WIDTH} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={ariaLabel}
        style={{ minWidth: MIN_WIDTH }}
      >
        <title>{ariaLabel}</title>
        {data.map((row, index) => {
          const y = index * ROW_HEIGHT;
          const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
          const value = Number.isFinite(row.value) ? row.value : 0;
          const width = max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * plotWidth) : 0;

          return (
            <g key={`${row.label}-${index}`}>
              <text
                x={LABEL_GUTTER - 10}
                y={y + ROW_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className={AXIS_TEXT}
                fontSize={11}
              >
                {row.label}
              </text>
              <rect
                x={LABEL_GUTTER}
                y={barY}
                width={plotWidth}
                height={BAR_HEIGHT}
                rx={4}
                fill={TRACK}
              />
              <path
                d={horizontalBarPath(LABEL_GUTTER, barY, width, BAR_HEIGHT)}
                fill={color}
              />
              {/* Value at the tip; VALUE_GUTTER reserves room so a full-length
                  bar's label can never be clipped. */}
              <text
                x={LABEL_GUTTER + width + 8}
                y={y + ROW_HEIGHT / 2}
                dominantBaseline="middle"
                className={VALUE_TEXT}
                fontSize={11}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {row.valueLabel ?? value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
