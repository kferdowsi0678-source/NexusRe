'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useRoleFlags } from '@/lib/use-role-flags';
import {
  useAnalyticsOverview,
  useSubmissionFunnel,
  useSubmissionVolume,
  useTimeToQuote,
} from '@/lib/analytics-api';
import { ChartCard, VizStyles, formatHours, humanise } from '@/components/chart-theme';
import { StatTile, StatTileGrid } from '@/components/stat-tile';
import { BarChart } from '@/components/bar-chart';
import { FunnelChart, FunnelExits } from '@/components/funnel-chart';
import { VolumeChart } from '@/components/volume-chart';

/** Loading and error states, kept identical across every panel on the page. */
function Panel({
  isLoading,
  isError,
  onRetry,
  loadingLabel,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  loadingLabel: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{loadingLabel}</p>;
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
        <p>We could not load this data.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 font-medium underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { isReinsurer, isAdmin, isCedantSide } = useRoleFlags();

  const overview = useAnalyticsOverview();
  const volume = useSubmissionVolume();
  const timeToQuote = useTimeToQuote();
  const funnel = useSubmissionFunnel();

  const audience = isAdmin ? 'Administrator' : isReinsurer ? 'Reinsurer' : 'Cedant';
  const scopeNote = isAdmin
    ? 'Every submission on the platform.'
    : isReinsurer
    ? 'Risks you have been invited to or quoted on, and your own quotes.'
    : 'Submissions raised by your organization.';

  const statusRows = (overview.data?.byStatus ?? [])
    .filter((row) => row.count > 0)
    .map((row) => ({ label: row.label, value: row.count }));

  const latencyRows = (timeToQuote.data?.byLineOfBusiness ?? []).map((row) => ({
    label: humanise(row.lineOfBusiness),
    value: row.medianHours ?? 0,
    valueLabel: `${formatHours(row.medianHours)} · n=${row.sampleSize}`,
  }));

  return (
    <div className="space-y-6">
      <VizStyles />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          Welcome, {user?.firstName}!
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {audience} dashboard · {scopeNote}
        </p>
      </div>

      <Panel
        isLoading={overview.isLoading}
        isError={overview.isError}
        onRetry={() => overview.refetch()}
        loadingLabel="Loading your figures..."
      >
        <StatTileGrid>
          <StatTile
            label="Total submissions"
            value={overview.data?.totalSubmissions ?? 0}
            hint="In scope for you"
            trend={volume.data?.totals}
            href="/submissions"
          />
          <StatTile
            label={isReinsurer ? 'Quotes you have issued' : 'Quotes received'}
            value={overview.data?.totalQuotes ?? 0}
            hint={
              overview.data?.totalSubmissions
                ? `${(
                    (overview.data.totalQuotes / overview.data.totalSubmissions) || 0
                  ).toFixed(1)} per submission`
                : 'No submissions yet'
            }
          />
          <StatTile
            label="Average completeness"
            value={`${overview.data?.averageCompletenessScore ?? 0}%`}
            hint="Submissions need 50% to be sent to market"
            meter={{ value: overview.data?.averageCompletenessScore ?? 0, max: 100 }}
          />
          <StatTile
            label="Bound conversion"
            value={`${overview.data?.conversion.conversionRate ?? 0}%`}
            hint={
              overview.data?.conversion.decided
                ? `${overview.data.conversion.bound} bound of ${overview.data.conversion.decided} decided`
                : 'Nothing decided yet'
            }
          />
        </StatTileGrid>
      </Panel>

      <ChartCard
        title="Submission volume"
        subtitle="Created per month over the last 12 months, by line of business"
      >
        <Panel
          isLoading={volume.isLoading}
          isError={volume.isError}
          onRetry={() => volume.refetch()}
          loadingLabel="Loading volume..."
        >
          {volume.data && <VolumeChart report={volume.data} />}
        </Panel>
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {isCedantSide || isAdmin ? (
          <ChartCard
            title="Placement funnel"
            subtitle="Submissions that reached each stage of the lifecycle"
            footer={funnel.data ? <FunnelExits report={funnel.data} /> : undefined}
          >
            <Panel
              isLoading={funnel.isLoading}
              isError={funnel.isError}
              onRetry={() => funnel.refetch()}
              loadingLabel="Loading the funnel..."
            >
              {funnel.data && <FunnelChart report={funnel.data} />}
            </Panel>
          </ChartCard>
        ) : (
          <ChartCard
            title="Where your risks stand"
            subtitle="Current status of every submission in your scope"
          >
            <Panel
              isLoading={overview.isLoading}
              isError={overview.isError}
              onRetry={() => overview.refetch()}
              loadingLabel="Loading statuses..."
            >
              <BarChart
                data={statusRows}
                ariaLabel="Submissions by current status"
                emptyMessage="No submissions in scope yet."
              />
            </Panel>
          </ChartCard>
        )}

        <ChartCard
          title={isReinsurer ? 'Your time to quote' : 'Market response time'}
          subtitle={
            isReinsurer
              ? 'Hours from a submission reaching the market to your first quote'
              : 'Hours from submitting a risk to the first quote arriving'
          }
          footer={
            timeToQuote.data?.sampleSize ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Median {formatHours(timeToQuote.data.medianHours)} · average{' '}
                {formatHours(timeToQuote.data.averageHours)} · 90th percentile{' '}
                {formatHours(timeToQuote.data.p90Hours)} · {timeToQuote.data.sampleSize} quoted
                submission{timeToQuote.data.sampleSize === 1 ? '' : 's'}
              </p>
            ) : undefined
          }
        >
          <Panel
            isLoading={timeToQuote.isLoading}
            isError={timeToQuote.isError}
            onRetry={() => timeToQuote.refetch()}
            loadingLabel="Measuring time to quote..."
          >
            <BarChart
              data={latencyRows}
              ariaLabel="Median hours to first quote by line of business"
              emptyMessage="No submission has been quoted yet, so there is nothing to time."
            />
          </Panel>
        </ChartCard>
      </div>

      {(isCedantSide || isAdmin) && (
        <ChartCard
          title="Pipeline by status"
          subtitle="Every submission in scope, by where it currently sits"
        >
          <Panel
            isLoading={overview.isLoading}
            isError={overview.isError}
            onRetry={() => overview.refetch()}
            loadingLabel="Loading statuses..."
          >
            <BarChart
              data={statusRows}
              ariaLabel="Submissions by current status"
              emptyMessage="No submissions in scope yet."
            />
          </Panel>
        </ChartCard>
      )}

      <div className="rounded-lg bg-white shadow dark:bg-gray-900 dark:ring-1 dark:ring-gray-800">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
            Quick actions
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isReinsurer ? (
              <>
                <Link
                  href="/opportunities"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Review opportunities
                </Link>
                <Link
                  href="/appetite"
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Manage risk appetite
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/submissions/new"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Create new submission
                </Link>
                <Link
                  href="/submissions"
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  View all submissions
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <h2 className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Administrator access
          </h2>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            These figures cover every organization on the platform. You can also manage
            organizations, users and system settings.
          </p>
        </div>
      )}
    </div>
  );
}
