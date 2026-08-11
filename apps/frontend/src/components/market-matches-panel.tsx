'use client';

import { useSubmissionMatches } from '@/lib/appetite-api';

/**
 * Suggested markets for a submission, ranked by the backend's rule-based
 * appetite score. Advisory only: nothing here contacts anyone.
 */
export function MarketMatchesPanel({ submissionId }: { submissionId: string }) {
  const { data, isLoading, isError } = useSubmissionMatches(submissionId);

  if (isLoading) return <p className="text-sm text-gray-500">Finding markets...</p>;
  if (isError) return <p className="text-sm text-gray-500">Could not load market matches.</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {data?.matchCount
          ? `${data.matchCount} market${data.matchCount === 1 ? '' : 's'} may have appetite for this risk`
          : 'No registered appetite matches this risk yet.'}
        {data?.territory ? ` · territory taken as ${data.territory}` : ' · territory unknown'}
      </p>

      {!!data?.matches?.length && (
        <ul className="space-y-3">
          {data.matches.map((match) => (
            <li key={match.appetiteId} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{match.reinsurerName}</p>
                  <p className="text-xs text-gray-500">
                    {match.appetiteName}
                    {match.maxCapacityShare != null
                      ? ` · takes up to ${match.maxCapacityShare}%`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full ${
                        match.score >= 80
                          ? 'bg-green-600'
                          : match.score >= 55
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                      }`}
                      style={{ width: `${match.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{match.score}</span>
                </div>
              </div>

              <ul className="mt-3 flex flex-wrap gap-2">
                {match.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
