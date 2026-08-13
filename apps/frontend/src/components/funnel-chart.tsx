'use client';

import { ACCENT, AXIS_TEXT, ChartEmpty, TRACK, VALUE_TEXT, horizontalBarPath } from './chart-theme';
import type { FunnelReport } from '@/lib/analytics-api';

const LABEL_GUTTER = 130;
const VALUE_GUTTER = 96;
const ROW_HEIGHT = 40;
const BAR_HEIGHT = 20;
const MIN_WIDTH = 520;

/**
 * How many submissions reached each stage of the lifecycle. One measure across
 * ordered stages, so a single hue: the stage names carry the order, and every
 * bar is direct-labelled with its count and share.
 */
export function FunnelChart({ report }: { report: FunnelReport }) {
  const stages = report.stages ?? [];
  const entered = stages[0]?.count ?? 0;

  if (!stages.length || entered === 0) {
    return <ChartEmpty message="No submissions have entered the pipeline yet." />;
  }

  const height = stages.length * ROW_HEIGHT;
  const plotWidth = MIN_WIDTH - LABEL_GUTTER - VALUE_GUTTER;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${MIN_WIDTH} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`Submission funnel: ${stages
          .map((stage) => `${stage.label} ${stage.count}`)
          .join(', ')}`}
        style={{ minWidth: MIN_WIDTH }}
      >
        <title>Submissions reaching each stage of the lifecycle</title>
        {stages.map((stage, index) => {
          const y = index * ROW_HEIGHT;
          const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
          const width = entered > 0 ? (stage.count / entered) * plotWidth : 0;

          return (
            <g key={stage.stage}>
              <text
                x={LABEL_GUTTER - 10}
                y={y + ROW_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className={AXIS_TEXT}
                fontSize={11}
              >
                {stage.label}
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
                fill={ACCENT}
              />
              <text
                x={LABEL_GUTTER + width + 8}
                y={y + ROW_HEIGHT / 2}
                dominantBaseline="middle"
                fontSize={11}
                className={VALUE_TEXT}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {stage.count.toLocaleString()}
                <tspan className={AXIS_TEXT}> · {stage.ofStart}%</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** The two ways a submission leaves the funnel, stated in words not colour. */
export function FunnelExits({ report }: { report: FunnelReport }) {
  const { declined, expired } = report.exits ?? { declined: 0, expired: 0 };
  if (!declined && !expired) return null;

  return (
    <p className="text-xs text-gray-500 dark:text-gray-400">
      {declined.toLocaleString()} declined and {expired.toLocaleString()} expired along the way.
      Both are counted only as far as the lifecycle proves they travelled.
    </p>
  );
}
