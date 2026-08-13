'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { ACCENT, METER_TRACK, formatCompact } from './chart-theme';
import { Sparkline } from './sparkline';

export interface StatTileProps {
  /** Sentence case, no trailing colon. */
  label: string;
  value: number | string | null | undefined;
  /** Units or context, e.g. 'of 100' or 'last 12 months'. */
  hint?: string;
  /** 12-point trend, rendered as a sparkline beside the value. */
  trend?: number[];
  /** Ratio against a limit, drawn as a meter under the value. */
  meter?: { value: number; max: number };
  href?: string;
  children?: ReactNode;
}

/**
 * A single headline number. Used instead of a one-bar bar chart — a lone value
 * does not need an axis.
 */
export function StatTile({ label, value, hint, trend, meter, href, children }: StatTileProps) {
  const display = typeof value === 'number' ? formatCompact(value) : (value ?? '—');
  const meterPercent =
    meter && meter.max > 0 ? Math.max(0, Math.min(100, (meter.value / meter.max) * 100)) : 0;

  const body = (
    <div className="viz h-full rounded-lg bg-white p-5 shadow dark:bg-gray-900 dark:ring-1 dark:ring-gray-800">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold text-gray-900 dark:text-gray-50">{display}</p>
        {trend && trend.length > 1 && (
          <Sparkline values={trend} label={`${label}: trend over the last ${trend.length} months`} />
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}

      {meter && (
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: METER_TRACK }}
          role="img"
          aria-label={`${label}: ${Math.round(meterPercent)} percent of ${meter.max}`}
        >
          <div
            className="h-2 rounded-full"
            style={{ width: `${meterPercent}%`, backgroundColor: ACCENT }}
          />
        </div>
      )}

      {children}
    </div>
  );

  if (!href) return body;

  return (
    <Link
      href={href}
      className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    >
      {body}
    </Link>
  );
}

export function StatTileGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}
