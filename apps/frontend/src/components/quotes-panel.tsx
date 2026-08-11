'use client';

import { useState } from 'react';
import {
  QUOTE_STATUS_COLORS,
  QUOTE_TYPES,
  Quote,
  QuoteStatus,
  QuoteType,
  allowedQuoteTransitions,
  useCreateQuote,
  useQuoteComparison,
  useQuotes,
  useUpdateQuoteStatus,
} from '@/lib/quotes-api';

interface QuotesPanelProps {
  submissionId: string;
  isReinsurer: boolean;
  isCedantSide: boolean;
  currency?: string | null;
}

const money = (value: number | string | null | undefined, currency?: string | null) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${currency ? currency + ' ' : ''}${n.toLocaleString()}`;
};

const emptyForm = {
  quoteType: 'indication' as QuoteType,
  rate: '',
  premium: '',
  capacity: '',
  terms: '',
  conditions: '',
  exclusions: '',
  validUntil: '',
};

export function QuotesPanel({
  submissionId,
  isReinsurer,
  isCedantSide,
  currency,
}: QuotesPanelProps) {
  const { data: quotes, isLoading } = useQuotes(submissionId);
  // The comparison endpoint is ceding-side only; asking as a reinsurer would 403.
  const { data: comparison } = useQuoteComparison(submissionId, isCedantSide);
  const createQuote = useCreateQuote(submissionId);
  const updateStatus = useUpdateQuoteStatus(submissionId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const actor = isCedantSide ? 'cedant' : 'reinsurer';
  const inputClass =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm';

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const submitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.rate || !form.premium || !form.capacity) {
      setError('Rate, premium and capacity are all required.');
      return;
    }
    try {
      await createQuote.mutateAsync({
        quoteType: form.quoteType,
        rate: Number(form.rate),
        premium: Number(form.premium),
        capacity: Number(form.capacity),
        terms: form.terms || undefined,
        conditions: form.conditions || undefined,
        exclusions: form.exclusions || undefined,
        validUntil: form.validUntil || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not submit this quote.');
    }
  };

  const move = async (quote: Quote, status: QuoteStatus) => {
    setError('');
    if (status === 'declined') {
      setDecliningId(quote.id);
      return;
    }
    try {
      await updateStatus.mutateAsync({ quoteId: quote.id, status });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not update this quote.');
    }
  };

  const confirmDecline = async () => {
    if (!decliningId) return;
    setError('');
    if (!declineReason.trim()) {
      setError('A reason is required when declining.');
      return;
    }
    try {
      await updateStatus.mutateAsync({
        quoteId: decliningId,
        status: 'declined',
        declineReason: declineReason.trim(),
      });
      setDecliningId(null);
      setDeclineReason('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not decline this quote.');
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {/* Ceding-side summary across every market */}
      {isCedantSide && comparison && comparison.summary.count > 0 && (
        <dl className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Quotes</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {comparison.summary.count}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Capacity offered
            </dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {comparison.summary.totalCapacityOffered}%
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Best rate</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {comparison.summary.bestRate ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Keenest</dt>
            <dd className="mt-1 truncate text-lg font-semibold text-gray-900">
              {comparison.summary.cheapestReinsurer ?? '—'}
            </dd>
          </div>
        </dl>
      )}

      {isReinsurer && (
        <div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            {showForm ? 'Cancel' : 'Submit a quote'}
          </button>
        </div>
      )}

      {isReinsurer && showForm && (
        <form onSubmit={submitQuote} className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="quoteType" className="block text-sm font-medium text-gray-700">
                Quote type <span className="text-red-600">*</span>
              </label>
              <select
                id="quoteType"
                name="quoteType"
                value={form.quoteType}
                onChange={handleChange}
                className={inputClass}
              >
                {QUOTE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700">
                Valid until
              </label>
              <input
                id="validUntil"
                name="validUntil"
                type="date"
                value={form.validUntil}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="rate" className="block text-sm font-medium text-gray-700">
                Rate <span className="text-red-600">*</span>
              </label>
              <input
                id="rate"
                name="rate"
                type="number"
                step="0.0001"
                min="0"
                value={form.rate}
                onChange={handleChange}
                placeholder="0.125"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="premium" className="block text-sm font-medium text-gray-700">
                Premium <span className="text-red-600">*</span>
              </label>
              <input
                id="premium"
                name="premium"
                type="number"
                min="0"
                value={form.premium}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                Capacity share % <span className="text-red-600">*</span>
              </label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                min="0"
                max="100"
                value={form.capacity}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="terms" className="block text-sm font-medium text-gray-700">
                Terms
              </label>
              <textarea id="terms" name="terms" rows={2} value={form.terms} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label htmlFor="conditions" className="block text-sm font-medium text-gray-700">
                Conditions
              </label>
              <textarea id="conditions" name="conditions" rows={2} value={form.conditions} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label htmlFor="exclusions" className="block text-sm font-medium text-gray-700">
                Exclusions
              </label>
              <textarea id="exclusions" name="exclusions" rows={2} value={form.exclusions} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createQuote.isPending}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {createQuote.isPending ? 'Submitting...' : 'Submit quote'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading quotes...</p>
      ) : !quotes?.length ? (
        <p className="text-sm text-gray-500">
          {isReinsurer
            ? 'You have not quoted this risk yet.'
            : 'No quotes have come in on this submission yet.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {quotes.map((quote) => {
            const next = allowedQuoteTransitions(quote.status, actor);
            return (
              <li key={quote.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {quote.reinsurer?.name ?? 'Your quote'}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          QUOTE_STATUS_COLORS[quote.status] ?? 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {quote.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs capitalize text-gray-500">
                        {quote.quoteType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(quote.createdAt).toLocaleString()}
                      {quote.validUntil
                        ? ` · valid to ${new Date(quote.validUntil).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>

                  {next.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {next.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => move(quote, status)}
                          disabled={updateStatus.isPending}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-50 ${
                            status === 'accepted'
                              ? 'border border-transparent bg-green-600 text-white hover:bg-green-700'
                              : status === 'declined'
                              ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
                              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {status === 'firm_offer'
                            ? 'Firm up'
                            : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-4 border-t border-gray-100 pt-3">
                  <div>
                    <dt className="text-xs text-gray-500">Rate</dt>
                    <dd className="text-sm font-medium text-gray-900">{Number(quote.rate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Premium</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {money(quote.premium, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Capacity</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {Number(quote.capacity)}%
                    </dd>
                  </div>
                </dl>

                {(quote.terms || quote.exclusions || quote.declineReason) && (
                  <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-600">
                    {quote.terms && <p><span className="font-medium">Terms:</span> {quote.terms}</p>}
                    {quote.exclusions && (
                      <p><span className="font-medium">Exclusions:</span> {quote.exclusions}</p>
                    )}
                    {quote.declineReason && (
                      <p className="text-red-700">
                        <span className="font-medium">Declined:</span> {quote.declineReason}
                      </p>
                    )}
                  </div>
                )}

                {decliningId === quote.id && (
                  <div className="mt-3 space-y-2 rounded-md bg-red-50 p-3">
                    <label htmlFor={`reason-${quote.id}`} className="block text-sm font-medium text-red-800">
                      Reason for declining
                    </label>
                    <input
                      id={`reason-${quote.id}`}
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      className="block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={confirmDecline}
                        disabled={updateStatus.isPending}
                        className="rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm decline
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDecliningId(null);
                          setDeclineReason('');
                        }}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
