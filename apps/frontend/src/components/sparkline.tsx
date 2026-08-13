'use client';

import { ACCENT, SURFACE } from './chart-theme';

/**
 * A 12-point trend line for a stat tile. Deliberately unlabelled: the tile's
 * value carries the number, the sparkline only carries the shape.
 */
export function Sparkline({
  values,
  label,
  width = 96,
  height = 28,
  color = ACCENT,
}: {
  values: number[];
  /** Read out to screen readers, since the shape itself is decorative. */
  label: string;
  width?: number;
  height?: number;
  color?: string;
}) {
  const points = values.filter((value) => Number.isFinite(value));
  if (points.length < 2) return null;

  const padding = 5;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const stepX = (width - padding * 2) / (points.length - 1);

  const coords = points.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    return [x, y] as const;
  });

  const last = coords[coords.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <title>{label}</title>
      <polyline
        points={coords.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End marker with a 2px surface ring so it stays legible over the line. */}
      <circle cx={last[0]} cy={last[1]} r={4} fill={color} stroke={SURFACE} strokeWidth={2} />
    </svg>
  );
}
