'use client';

import { useEffect, useState } from 'react';
import {
  useOpenThread,
  usePostMessage,
  useThread,
  useThreads,
} from '@/lib/messaging-api';
import { useQuotes } from '@/lib/quotes-api';

interface MessagingPanelProps {
  submissionId: string;
  isCedantSide: boolean;
}

export function MessagingPanel({ submissionId, isCedantSide }: MessagingPanelProps) {
  const { data: threads, isLoading } = useThreads(submissionId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: thread } = useThread(activeId ?? undefined);
  const openThread = useOpenThread(submissionId);
  const postMessage = usePostMessage(submissionId);

  // Candidate counterparties for the cedant are the markets that have quoted.
  const { data: quotes } = useQuotes(submissionId);
  const [counterpartyId, setCounterpartyId] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeId && threads?.length) setActiveId(threads[0].id);
  }, [threads, activeId]);

  const candidates = Array.from(
    new Map(
      (quotes ?? [])
        .filter((q) => q.reinsurer)
        .map((q) => [q.reinsurerId, q.reinsurer!.name] as const),
    ).entries(),
  ).filter(([id]) => !threads?.some((t) => t.counterpartyOrg?.id === id));

  const start = async () => {
    setError('');
    try {
      // A reinsurer is always its own counterparty, so the server ignores this.
      const created = await openThread.mutateAsync({
        counterpartyOrgId: isCedantSide ? counterpartyId : submissionId,
      });
      setActiveId(created.id);
      setCounterpartyId('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not open a conversation.');
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!activeId || !draft.trim()) return;
    try {
      await postMessage.mutateAsync({ threadId: activeId, body: draft.trim() });
      setDraft('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not send that message.');
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="flex flex-wrap items-end gap-2">
        {isCedantSide ? (
          <>
            <div className="min-w-[16rem]">
              <label htmlFor="counterparty" className="block text-sm font-medium text-gray-700">
                Start a conversation with
              </label>
              <select
                id="counterparty"
                value={counterpartyId}
                onChange={(e) => setCounterpartyId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">
                  {candidates.length ? 'Select a market' : 'No new markets to contact'}
                </option>
                {candidates.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={start}
              disabled={!counterpartyId || openThread.isPending}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              Open
            </button>
          </>
        ) : (
          !threads?.length && (
            <button
              type="button"
              onClick={start}
              disabled={openThread.isPending}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {openThread.isPending ? 'Opening...' : 'Message the cedant'}
            </button>
          )
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading conversations...</p>
      ) : !threads?.length ? (
        <p className="text-sm text-gray-500">No conversations on this submission yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ul className="space-y-1 lg:col-span-1">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    activeId === t.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="block truncate font-medium">
                    {isCedantSide
                      ? t.counterpartyOrg?.name ?? 'Counterparty'
                      : t.cedantOrg?.name ?? 'Cedant'}
                  </span>
                  {t.lastMessageAt && (
                    <span className="block text-xs text-gray-500">
                      {new Date(t.lastMessageAt).toLocaleString()}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="lg:col-span-2">
            {!thread ? (
              <p className="text-sm text-gray-500">Pick a conversation.</p>
            ) : (
              <div className="flex h-full flex-col rounded-lg border border-gray-200">
                <div className="max-h-80 flex-1 space-y-3 overflow-y-auto p-4">
                  {!thread.messages.length ? (
                    <p className="text-sm text-gray-500">No messages yet. Say hello.</p>
                  ) : (
                    thread.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            message.mine ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="whitespace-pre-line text-sm">{message.body}</p>
                          <p
                            className={`mt-1 text-xs ${
                              message.mine ? 'text-indigo-200' : 'text-gray-500'
                            }`}
                          >
                            {message.senderName}
                            {message.senderOrgName ? ` · ${message.senderOrgName}` : ''} ·{' '}
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={send} className="flex gap-2 border-t border-gray-200 p-3">
                  <label htmlFor="draft" className="sr-only">
                    Message
                  </label>
                  <input
                    id="draft"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || postMessage.isPending}
                    className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
