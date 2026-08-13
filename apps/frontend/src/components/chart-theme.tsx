'use client';

import { ReactNode } from 'react';

/**
 * Shared plumbing for the dashboard charts: one validated palette, the card
 * shell, and the number formatting. Everything is inline SVG and Tailwind — no
 * charting dependency.
 *
 * Colours are exposed as CSS custom properties so light and dark swap in one
 * place, and every reference carries the light hex as a fallback so a chart
 * still renders correctly if <VizStyles /> is not on the page.
 */

const PALETTE_CSS = `
.viz {
  --viz-surface: #ffffff;
  --viz-grid: #e5e7eb;
  --viz-track: #eef2f7;
  --viz-meter-track: #cde2fb;
  --viz-series-1: #2a78d6;
  --viz-series-2: #eb6834;
  --viz-series-3: #1baf7a;
  --viz-series-4: #eda100;
  --viz-series-5: #e87ba4;
  --viz-series-6: #008300;
  --viz-series-other: #8c8c85;
}
.dark .viz {
  --viz-surface: #111827;
  --viz-grid: #374151;
  --viz-track: #1f2937;
  --viz-meter-track: #0d366b;
  --viz-series-1: #3987e5;
  --viz-series-2: #d95926;
  --viz-series-3: #199e70;
  --viz-series-4: #c98500;
  --viz-series-5: #d55181;
  --viz-series-6: #008300;
  --viz-series-other: #a3a39b;
}
`;

/**
 * Injects the palette. Render once per page, above the charts.
 */
export function VizStyles() {
  return <style dangerouslySetInnerHTML={{ __html: PALETTE_CSS }} />;
}

/**
 * Categorical slots in fixed order — assigned by entity, never cycled and never
 * re-assigned when a filter changes the series count. Six slots is the soft cap;
 * anything past it belongs in SERIES_OTHER.
 */
export const SERIES_COLORS = [
  'var(--viz-series-1, #2a78d6)',
  'var(--viz-series-2, #eb6834)',
  'var(--viz-series-3, #1baf7a)',
  'var(--viz-series-4, #eda100)',
  'var(--viz-series-5, #e87ba4)',
  'var(--viz-series-6, #008300)',
];

export const SERIES_OTHER = 'var(--viz-series-other, #8c8c85)';
export const ACCENT = SERIES_COLORS[0];
export const SURFACE = 'var(--viz-surface, #ffffff)';
export const GRID = 'var(--viz-grid, #e5e7eb)';
export const TRACK = 'var(--viz-track, #eef2f7)';
export const METER_TRACK = 'var(--viz-meter-track, #cde2fb)';

/** Text classes, so labels never wear the series colour. */
export const AXIS_TEXT = 'fill-current text-gray-500 dark:text-gray-400';
export const VALUE_TEXT = 'fill-current text-gray-900 dark:text-gray-100';

/** 1,284 · 12.9K · 4.2M */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** Hours read badly past a couple of days, so they turn into days. */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

/** '2026-08' -> 'Aug 26' */
export function formatMonth(key: string): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return `${date.toLocaleString('en', { month: 'short', timeZone: 'UTC' })} ${String(year).slice(2)}`;
}

/** 'political_violence' -> 'Political violence' */
export function humanise(value: string): string {
  const spaced = String(value ?? '').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * A bar that grows from a flat baseline on the left with a 4px rounded data-end
 * on the right. Square at the baseline, rounded where the data stops.
 */
export function horizontalBarPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 4,
): string {
  if (width <= 0 || height <= 0) return '';
  const r = Math.max(0, Math.min(radius, width, height / 2));
  return [
    `M${x},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height - r}`,
    `Q${x + width},${y + height} ${x + width - r},${y + height}`,
    `H${x}`,
    'Z',
  ].join(' ');
}

/** The same, growing upward; only the segment that ends the column is rounded. */
export function columnPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 4,
  roundTop = true,
): string {
  if (width <= 0 || height <= 0) return '';
  const r = roundTop ? Math.max(0, Math.min(radius, width / 2, height)) : 0;
  if (r === 0) return `M${x},${y} h${width} v${height} h${-width} Z`;
  return [
    `M${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    `H${x}`,
    'Z',
  ].join(' ');
}

/** Axis ticks on clean numbers. */
export function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0];
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? magnitude * 10;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(Math.round(value * 100) / 100);
  return ticks;
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="viz rounded-lg bg-white p-5 shadow dark:bg-gray-900 dark:ring-1 dark:ring-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
      {footer && <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">{footer}</div>}
    </section>
  );
}

/** A legend is always present for two or more series. */
export function ChartLegend({
  items,
}: {
  items: Array<{ label: string; color: string; value?: string }>;
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
          {item.value && (
            <span className="tabular-nums text-gray-400 dark:text-gray-500">{item.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Empty state used by every chart, so "no data" never looks like a failure. */
export function ChartEmpty({ message }: { message: string }) {
  return (
    <p className="rounded-md bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
      {message}
    </p>
  );
}
