'use client';

import { useMemo } from 'react';
import {
  AXIS_TEXT,
  ChartEmpty,
  ChartLegend,
  GRID,
  SERIES_COLORS,
  SERIES_OTHER,
  VALUE_TEXT,
  columnPath,
  formatMonth,
  humanise,
  niceTicks,
} from './chart-theme';
import type { VolumeReport } from '@/lib/analytics-api';

const SLOT = 56;
const BAR_WIDTH = 24;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 20;
const PAD_BOTTOM = 30;
const PLOT_HEIGHT = 200;
/** Surface gap between stacked segments. */
const GAP = 2;
/** Soft cap on categorical slots; the tail folds into 'Other'. */
const MAX_SERIES = SERIES_COLORS.length;

interface StackSeries {
  label: string;
  color: string;
  counts: number[];
  total: number;
}

/**
 * Submissions per month, stacked by line of business.
 *
 * Colour carries identity here, so it is backed up two ways: a legend is always
 * present, and the numbers themselves are available in the table view below the
 * chart. Anything past the sixth line folds into 'Other' rather than inventing
 * a new hue.
 */
export function VolumeChart({ report }: { report: VolumeReport }) {
  const series = useMemo<StackSeries[]>(() => {
    const months = report.months?.length ?? 0;
    const named = (report.series ?? []).slice(0, MAX_SERIES - 1).map((entry, index) => ({
      label: humanise(entry.lineOfBusiness),
      color: SERIES_COLORS[index],
      counts: entry.counts,
      total: entry.total,
    }));

    const tail = (report.series ?? []).slice(MAX_SERIES - 1);
    if (!tail.length) return named;

    const folded: StackSeries = {
      label: `Other (${tail.length})`,
      color: SERIES_OTHER,
      counts: Array.from({ length: months }, (_, i) =>
        tail.reduce((sum, entry) => sum + (entry.counts[i] ?? 0), 0),
      ),
      total: tail.reduce((sum, entry) => sum + entry.total, 0),
    };
    return [...named, folded];
  }, [report]);

  const months = report.months ?? [];
  const totals = report.totals ?? [];

  if (!months.length || !report.totalCount) {
    return <ChartEmpty message="No submissions were created in the last 12 months." />;
  }

  const max = Math.max(...totals, 1);
  const ticks = niceTicks(max);
  const axisMax = Math.max(ticks[ticks.length - 1] ?? max, max);
  const width = PAD_LEFT + months.length * SLOT + PAD_RIGHT;
  const height = PAD_TOP + PLOT_HEIGHT + PAD_BOTTOM;
  const baseline = PAD_TOP + PLOT_HEIGHT;
  const scale = (value: number) => (value / axisMax) * PLOT_HEIGHT;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          role="img"
          aria-label={`Submissions created per month over ${months.length} months, stacked by line of business. ${report.totalCount} in total.`}
          style={{ minWidth: width }}
        >
          <title>Submission volume by month and line of business</title>

          {ticks.map((tick) => {
            const y = baseline - scale(tick);
            return (
              <g key={tick}>
                <line
                  x1={PAD_LEFT}
                  x2={width - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  stroke={GRID}
                  strokeWidth={1}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  className={AXIS_TEXT}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {tick.toLocaleString()}
                </text>
              </g>
            );
          })}

          {months.map((month, monthIndex) => {
            const slotX = PAD_LEFT + monthIndex * SLOT;
            const x = slotX + (SLOT - BAR_WIDTH) / 2;
            const stack = series
              .map((entry) => ({ entry, value: entry.counts[monthIndex] ?? 0 }))
              .filter((row) => row.value > 0);
            const topIndex = stack.length - 1;
            let cursor = baseline;

            return (
              <g key={month}>
                {stack.map((row, index) => {
                  const segmentHeight = scale(row.value);
                  const isTop = index === topIndex;
                  const drawHeight =
                    isTop || segmentHeight <= GAP + 1
                      ? Math.max(segmentHeight, 1)
                      : segmentHeight - GAP;
                  const y = isTop
                    ? cursor - segmentHeight
                    : cursor - segmentHeight + (segmentHeight - drawHeight);
                  cursor -= segmentHeight;

                  return (
                    <path
                      key={row.entry.label}
                      d={columnPath(x, y, BAR_WIDTH, drawHeight, 4, isTop)}
                      fill={row.entry.color}
                    />
                  );
                })}

                {totals[monthIndex] > 0 && (
                  <text
                    x={slotX + SLOT / 2}
                    y={baseline - scale(totals[monthIndex]) - 6}
                    textAnchor="middle"
                    fontSize={10}
                    className={VALUE_TEXT}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {totals[monthIndex]}
                  </text>
                )}

                <text
                  x={slotX + SLOT / 2}
                  y={baseline + 16}
                  textAnchor="middle"
                  fontSize={10}
                  className={AXIS_TEXT}
                >
                  {formatMonth(month)}
                </text>
              </g>
            );
          })}

          <line
            x1={PAD_LEFT}
            x2={width - PAD_RIGHT}
            y1={baseline}
            y2={baseline}
            stroke={GRID}
            strokeWidth={1}
          />
        </svg>
      </div>

      <ChartLegend
        items={series.map((entry) => ({
          label: entry.label,
          color: entry.color,
          value: String(entry.total),
        }))}
      />

      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
          Show the numbers
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <caption className="sr-only">
              Submissions created per month by line of business
            </caption>
            <thead>
              <tr className="text-gray-500 dark:text-gray-400">
                <th scope="col" className="py-1 pr-4 font-medium">
                  Line of business
                </th>
                {months.map((month) => (
                  <th key={month} scope="col" className="px-2 py-1 text-right font-medium">
                    {formatMonth(month)}
                  </th>
                ))}
                <th scope="col" className="pl-2 py-1 text-right font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-700 tabular-nums dark:text-gray-200">
              {series.map((entry) => (
                <tr key={entry.label} className="border-t border-gray-100 dark:border-gray-800">
                  <th scope="row" className="py-1 pr-4 font-normal">
                    {entry.label}
                  </th>
                  {entry.counts.map((count, index) => (
                    <td key={months[index]} className="px-2 py-1 text-right">
                      {count}
                    </td>
                  ))}
                  <td className="pl-2 py-1 text-right font-medium">{entry.total}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <th scope="row" className="py-1 pr-4 font-medium">
                  All
                </th>
                {totals.map((total, index) => (
                  <td key={months[index]} className="px-2 py-1 text-right font-medium">
                    {total}
                  </td>
                ))}
                <td className="pl-2 py-1 text-right font-medium">{report.totalCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
