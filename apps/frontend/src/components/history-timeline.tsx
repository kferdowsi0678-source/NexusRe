'use client';

import { useSubmissionHistory } from '@/lib/submissions-api';

const typeLabels: Record<string, string> = {
  created: 'Submission created',
  updated: 'Details updated',
  status_changed: 'Status changed',
  document_added: 'Document added',
  document_removed: 'Document removed',
  submitted: 'Submitted for review',
};

const typeColors: Record<string, string> = {
  created: 'bg-gray-400',
  updated: 'bg-blue-500',
  status_changed: 'bg-purple-500',
  document_added: 'bg-green-500',
  document_removed: 'bg-red-500',
  submitted: 'bg-indigo-600',
};

export function HistoryTimeline({ submissionId }: { submissionId: string }) {
  const { data, isLoading } = useSubmissionHistory(submissionId);

  if (isLoading) return <p className="text-sm text-gray-500">Loading history...</p>;
  if (!data?.timeline?.length) return <p className="text-sm text-gray-500">No activity recorded yet.</p>;

  return (
    <ol className="relative space-y-6 border-l border-gray-200 pl-6">
      {data.timeline.map((event: any) => (
        <li key={event.id} className="relative">
          <span
            className={`absolute -left-[1.9rem] mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${
              typeColors[event.type] || 'bg-gray-400'
            }`}
          />
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-sm font-medium text-gray-900">
              {typeLabels[event.type] || event.type}
            </p>
            <time className="text-xs text-gray-500">
              {new Date(event.timestamp).toLocaleString()}
            </time>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {event.user?.name} ({event.user?.email})
          </p>
          {event.changes?.oldStatus && event.changes?.newStatus && (
            <p className="mt-1 text-xs text-gray-600">
              {String(event.changes.oldStatus).replace(/_/g, ' ')} →{' '}
              {String(event.changes.newStatus).replace(/_/g, ' ')}
            </p>
          )}
          {event.changes?.fileName && (
            <p className="mt-1 text-xs text-gray-600">{event.changes.fileName}</p>
          )}
          {event.comment && <p className="mt-1 text-xs text-gray-600">{event.comment}</p>}
        </li>
      ))}
    </ol>
  );
}
