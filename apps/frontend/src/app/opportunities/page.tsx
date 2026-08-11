'use client';

import Link from 'next/link';
import { useOpportunities } from '@/lib/appetite-api';

const label = (value: string) => value.replace(/_/g, ' ');

export default function OpportunitiesPage() {
  const { data, isLoading } = useOpportunities();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
        <p className="mt-1 text-sm text-gray-500">
          Open submissions that fit your registered risk appetite, best fit first.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Matching your appetite against the market...</p>
      ) : !data?.appetiteCount ? (
        <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
          You have no active risk appetite, so nothing can be matched.{' '}
          <Link href="/appetite" className="font-medium underline">
            Define your appetite
          </Link>{' '}
          to start seeing opportunities.
        </div>
      ) : !data.opportunities.length ? (
        <div className="rounded-lg bg-white p-6 text-center shadow">
          <p className="text-sm text-gray-500">
            Nothing open matches your {data.appetiteCount} appetite
            {data.appetiteCount === 1 ? '' : 's'} right now.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {data.opportunities.map((opportunity) => (
            <li key={opportunity.submissionId} className="rounded-lg bg-white p-6 shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/submissions/${opportunity.submissionId}`}
                    className="text-lg font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {opportunity.title}
                  </Link>
                  <p className="mt-1 text-sm capitalize text-gray-600">
                    {label(opportunity.type)} · {label(opportunity.lineOfBusiness)} ·{' '}
                    {label(opportunity.status)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {opportunity.cedant}
                    {opportunity.territory ? ` · ${opportunity.territory}` : ''}
                    {opportunity.sumInsured
                      ? ` · ${opportunity.currency ?? ''} ${opportunity.sumInsured.toLocaleString()}`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Matched on: {opportunity.matchedAppetite}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full ${
                        opportunity.score >= 80
                          ? 'bg-green-600'
                          : opportunity.score >= 55
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                      }`}
                      style={{ width: `${opportunity.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{opportunity.score}</span>
                </div>
              </div>

              <ul className="mt-3 flex flex-wrap gap-2">
                {opportunity.reasons.map((reason) => (
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
