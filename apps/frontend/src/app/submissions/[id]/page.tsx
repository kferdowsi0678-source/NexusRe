'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import {
  useCalculateScore,
  useSubmission,
  useSubmitSubmission,
  useUpdateStatus,
} from '@/lib/submissions-api';
import { DocumentManager } from '@/components/document-manager';
import { HistoryTimeline } from '@/components/history-timeline';
import { QuotesPanel } from '@/components/quotes-panel';
import { MessagingPanel } from '@/components/messaging-panel';
import { MarketMatchesPanel } from '@/components/market-matches-panel';
import { ExtractionPanel } from '@/components/extraction-panel';
import { PlacementSlipButton } from '@/components/placement-slip-button';
import { useRoleFlags } from '@/lib/use-role-flags';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-purple-100 text-purple-800',
  negotiating: 'bg-orange-100 text-orange-800',
  bound: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

const nextStatuses: Record<string, string[]> = {
  draft: [],
  submitted: ['under_review', 'declined'],
  under_review: ['quoted', 'declined'],
  quoted: ['negotiating', 'declined', 'expired'],
  negotiating: ['bound', 'declined', 'expired'],
  bound: [],
  declined: [],
  expired: [],
};

type TabKey =
  | 'details'
  | 'documents'
  | 'extraction'
  | 'history'
  | 'quotes'
  | 'messages'
  | 'markets';

const TAB_LABELS: Record<TabKey, string> = {
  details: 'Details',
  documents: 'Documents',
  extraction: 'Extracted data',
  history: 'History',
  quotes: 'Quotes',
  messages: 'Messages',
  markets: 'Markets',
};

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = String(params.id);

  const { user } = useAuthStore();
  const { data: submission, isLoading, isError } = useSubmission(id);
  const submit = useSubmitSubmission();
  const updateStatus = useUpdateStatus();
  const calculateScore = useCalculateScore();

  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('details');

  const { isReinsurer } = useRoleFlags();
  const roles = useMemo(() => user?.roles?.map((r: any) => r.name) || [], [user]);
  const isReviewer = roles.some((r: string) =>
    ['reinsurer_underwriter', 'reinsurer_admin', 'super_admin'].includes(r),
  );
  const isOwner = submission?.submittedById === user?.id;
  const canEdit = isOwner && submission?.status === 'draft';
  // Whoever raised the submission speaks for the ceding side, as does anyone in
  // the cedant organisation. Market suggestions are only useful to them.
  const cedantSide = !isReinsurer;
  const tabs: TabKey[] = cedantSide
    ? ['details', 'documents', 'extraction', 'quotes', 'markets', 'messages', 'history']
    : ['details', 'documents', 'extraction', 'quotes', 'messages', 'history'];

  // Deep link from the create wizard: ?submit=1 focuses the submit action.
  useEffect(() => {
    if (searchParams.get('submit') === '1') setTab('details');
  }, [searchParams]);

  const handleSubmit = async () => {
    setError('');
    try {
      await submit.mutateAsync(id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to submit this submission.');
    }
  };

  const handleStatus = async (status: string) => {
    setError('');
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to change status.');
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading submission...</p>;
  }

  if (isError || !submission) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
        Submission not found.{' '}
        <Link href="/submissions" className="font-medium underline">
          Back to submissions
        </Link>
      </div>
    );
  }

  const score = submission.completenessScore ?? 0;
  const allowedNext = nextStatuses[submission.status] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/submissions" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            ← Submissions
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{submission.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusColors[submission.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {String(submission.status).replace(/_/g, ' ')}
            </span>
            <span className="capitalize">{submission.type}</span>
            <span>·</span>
            <span className="capitalize">{String(submission.lineOfBusiness).replace(/_/g, ' ')}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PlacementSlipButton submissionId={id} reference={submission.title} />

          <button
            type="button"
            onClick={() => calculateScore.mutate(id)}
            disabled={calculateScore.isPending}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {calculateScore.isPending ? 'Scoring...' : 'Recalculate score'}
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submit.isPending}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {submit.isPending ? 'Submitting...' : 'Submit for review'}
            </button>
          )}

          {isReviewer &&
            allowedNext.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleStatus(status)}
                disabled={updateStatus.isPending}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Mark {status.replace(/_/g, ' ')}
              </button>
            ))}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Completeness</h2>
          <span className="text-sm font-semibold text-gray-900">{score}%</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full ${
              score >= 80 ? 'bg-green-600' : score >= 50 ? 'bg-yellow-500' : 'bg-red-600'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        {submission.status === 'draft' && score < 50 && (
          <p className="mt-2 text-xs text-gray-500">
            A minimum score of 50% is required before submitting.
          </p>
        )}
      </div>

      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 overflow-x-auto px-6" aria-label="Submission sections">
            {tabs.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`whitespace-nowrap border-b-2 py-4 text-sm font-medium ${
                  tab === key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {TAB_LABELS[key]}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {tab === 'details' && (
            <div className="space-y-6">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Cedant" value={submission.cedant?.name} />
                <Field
                  label="Submitted by"
                  value={
                    submission.submittedBy
                      ? `${submission.submittedBy.firstName} ${submission.submittedBy.lastName}`
                      : undefined
                  }
                />
                <Field
                  label="Sum insured"
                  value={
                    submission.sumInsured
                      ? `${submission.currency || ''} ${Number(submission.sumInsured).toLocaleString()}`
                      : undefined
                  }
                />
                <Field
                  label="Inception"
                  value={submission.inceptionDate ? new Date(submission.inceptionDate).toLocaleDateString() : undefined}
                />
                <Field
                  label="Expiry"
                  value={submission.expiryDate ? new Date(submission.expiryDate).toLocaleDateString() : undefined}
                />
                <Field
                  label="Created"
                  value={new Date(submission.createdAt).toLocaleString()}
                />
              </dl>

              {submission.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-900">
                    {submission.description}
                  </p>
                </div>
              )}

              {submission.riskDetails && Object.keys(submission.riskDetails).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Risk details</h3>
                  <dl className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Object.entries(submission.riskDetails).map(([key, value]) => (
                      <div key={key} className="rounded-md bg-gray-50 p-3">
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </dt>
                        <dd className="mt-1 break-words text-sm text-gray-900">
                          {typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}

          {tab === 'documents' && <DocumentManager submissionId={id} canEdit={!!canEdit} />}
          {tab === 'history' && <HistoryTimeline submissionId={id} />}
          {tab === 'quotes' && (
            <QuotesPanel
              submissionId={id}
              isReinsurer={isReinsurer}
              isCedantSide={cedantSide}
              currency={submission.currency}
            />
          )}
          {tab === 'messages' && (
            <MessagingPanel submissionId={id} isCedantSide={cedantSide} />
          )}
          {tab === 'extraction' && (
            <ExtractionPanel submissionId={id} canReview={cedantSide} />
          )}
          {tab === 'markets' && <MarketMatchesPanel submissionId={id} />}
        </div>
      </div>
    </div>
  );
}