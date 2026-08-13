'use client';

import { useMemo, useState } from 'react';
import {
  DocumentExtraction,
  EXTRACTION_STATUS_COLORS,
  EXTRACTION_STATUS_LABELS,
  ExtractedField,
  FIELD_STATUS_COLORS,
  FieldDecision,
  LOW_CONFIDENCE,
  extractionErrorMessage,
  useApplyExtraction,
  useExtractions,
  useReviewExtraction,
  useRunExtraction,
} from '@/lib/extraction-api';
import { useDocuments } from '@/lib/documents-api';

interface ExtractionPanelProps {
  submissionId: string;
  /** Only the owning side may run, review or apply an extraction. */
  canReview: boolean;
}

/** Local, unsaved decisions keyed by field path. */
type DraftDecisions = Record<string, { decision: FieldDecision; correctedValue?: string }>;

const displayValue = (value: ExtractedField['value']) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  return value;
};

export function ExtractionPanel({ submissionId, canReview }: ExtractionPanelProps) {
  const { data: extractions, isLoading } = useExtractions(submissionId);
  const { data: documents } = useDocuments(submissionId);
  const runExtraction = useRunExtraction(submissionId);

  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [error, setError] = useState('');

  const handleRun = async () => {
    if (!selectedDocumentId) {
      setError('Choose a document to read first.');
      return;
    }
    setError('');
    try {
      await runExtraction.mutateAsync(selectedDocumentId);
      setSelectedDocumentId('');
    } catch (err) {
      setError(extractionErrorMessage(err, 'Could not start extraction.'));
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading extractions…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">Read a document</h3>
        <p className="mt-1 text-sm text-gray-600">
          The extractor proposes structured risk data from an uploaded file. Nothing reaches the
          submission until you review each field and apply it.
        </p>

        {canReview ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={selectedDocumentId}
              onChange={(e) => setSelectedDocumentId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a document…</option>
              {(documents ?? []).map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.fileName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRun}
              disabled={runExtraction.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {runExtraction.isPending ? 'Reading…' : 'Extract data'}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Only the ceding side can run extractions on this submission.
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {(extractions ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">
          No documents have been read yet.
        </p>
      ) : (
        (extractions ?? []).map((extraction) => (
          <ExtractionCard
            key={extraction.id}
            submissionId={submissionId}
            extraction={extraction}
            canReview={canReview}
          />
        ))
      )}
    </div>
  );
}

function ExtractionCard({
  submissionId,
  extraction,
  canReview,
}: {
  submissionId: string;
  extraction: DocumentExtraction;
  canReview: boolean;
}) {
  const review = useReviewExtraction(submissionId);
  const apply = useApplyExtraction(submissionId);

  const [drafts, setDrafts] = useState<DraftDecisions>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fields = useMemo(() => extraction.fields ?? [], [extraction.fields]);

  const acceptedCount = fields.filter(
    (f) => f.status === 'accepted' || f.status === 'edited',
  ).length;
  const pendingDraftCount = Object.keys(drafts).length;
  const isApplied = extraction.status === 'reviewed';

  const setDecision = (key: string, decision: FieldDecision, correctedValue?: string) => {
    setDrafts((current) => ({ ...current, [key]: { decision, correctedValue } }));
  };

  const handleSaveReview = async () => {
    setError('');
    setNotice('');
    const decisions = Object.entries(drafts).map(([key, draft]) => ({
      key,
      decision: draft.decision,
      correctedValue: draft.correctedValue,
    }));

    if (decisions.length === 0) {
      setError('Mark at least one field before saving.');
      return;
    }

    const missingCorrection = decisions.find(
      (d) => d.decision === 'edit' && !d.correctedValue?.trim(),
    );
    if (missingCorrection) {
      setError(`Enter a corrected value for "${missingCorrection.key}" before saving.`);
      return;
    }

    try {
      await review.mutateAsync({ extractionId: extraction.id, decisions });
      setDrafts({});
      setNotice('Review saved. Apply it to write these values into the submission.');
    } catch (err) {
      setError(extractionErrorMessage(err, 'Could not save the review.'));
    }
  };

  const handleApply = async () => {
    setError('');
    setNotice('');
    try {
      const result = await apply.mutateAsync(extraction.id);
      setNotice(
        `Applied ${result.appliedKeys.length} field(s). Completeness is now ${result.completenessScore}%.`,
      );
    } catch (err) {
      setError(extractionErrorMessage(err, 'Could not apply the reviewed fields.'));
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 p-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {extraction.document?.fileName ?? 'Document'}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {new Date(extraction.createdAt).toLocaleString()}
            {extraction.provider === 'heuristic' && ' · read locally, no model configured'}
            {extraction.provider === 'anthropic' && extraction.model && ` · ${extraction.model}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
            {extraction.coverage}% coverage
          </span>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              EXTRACTION_STATUS_COLORS[extraction.status]
            }`}
          >
            {EXTRACTION_STATUS_LABELS[extraction.status]}
          </span>
        </div>
      </div>

      {extraction.summary && (
        <p className="border-b border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
          {extraction.summary}
        </p>
      )}

      {extraction.errorMessage && (
        <p className="border-b border-gray-100 bg-red-50 p-4 text-sm text-red-700">
          {extraction.errorMessage}
        </p>
      )}

      {fields.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Field</th>
                <th className="px-4 py-2 font-medium">Extracted value</th>
                <th className="px-4 py-2 font-medium">Confidence</th>
                <th className="px-4 py-2 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map((field) => (
                <FieldRow
                  key={field.key}
                  field={field}
                  draft={drafts[field.key]}
                  disabled={!canReview || isApplied}
                  onDecision={setDecision}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(error || notice) && (
        <p
          className={`px-4 pt-3 text-sm ${error ? 'text-red-600' : 'text-green-700'}`}
        >
          {error || notice}
        </p>
      )}

      {canReview && fields.length > 0 && !isApplied && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <p className="text-xs text-gray-500">
            {acceptedCount} field(s) approved
            {pendingDraftCount > 0 && ` · ${pendingDraftCount} unsaved change(s)`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveReview}
              disabled={review.isPending || pendingDraftCount === 0}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {review.isPending ? 'Saving…' : 'Save review'}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={apply.isPending || acceptedCount === 0}
              title={
                acceptedCount === 0 ? 'Accept at least one field before applying' : undefined
              }
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {apply.isPending ? 'Applying…' : 'Apply to submission'}
            </button>
          </div>
        </div>
      )}

      {isApplied && extraction.appliedKeys && (
        <p className="p-4 text-xs text-gray-500">
          Applied {extraction.appliedKeys.length} field(s) to the submission
          {extraction.reviewedBy &&
            ` · reviewed by ${extraction.reviewedBy.firstName} ${extraction.reviewedBy.lastName}`}
        </p>
      )}
    </div>
  );
}

function FieldRow({
  field,
  draft,
  disabled,
  onDecision,
}: {
  field: ExtractedField;
  draft?: { decision: FieldDecision; correctedValue?: string };
  disabled: boolean;
  onDecision: (key: string, decision: FieldDecision, correctedValue?: string) => void;
}) {
  const currentDecision = draft?.decision;
  const isLowConfidence = field.confidence < LOW_CONFIDENCE;

  return (
    <tr className={isLowConfidence ? 'bg-amber-50/40' : undefined}>
      <td className="px-4 py-3 align-top">
        <p className="font-medium text-gray-900">{field.label}</p>
        <p className="font-mono text-xs text-gray-500">{field.key}</p>
        {field.sourceHint && (
          <p className="mt-1 text-xs italic text-gray-400">{field.sourceHint}</p>
        )}
      </td>
      <td className="px-4 py-3 align-top text-gray-800">
        <span>{displayValue(field.value)}</span>
        {field.status === 'edited' && field.correctedValue != null && (
          <p className="mt-1 text-xs text-blue-700">
            corrected to {displayValue(field.correctedValue)}
          </p>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            isLowConfidence ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
          }`}
          title={isLowConfidence ? 'Low confidence — check this against the document' : undefined}
        >
          {Math.round(field.confidence * 100)}%
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            FIELD_STATUS_COLORS[field.status]
          }`}
        >
          {field.status}
        </span>

        {!disabled && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-1">
              {(['accept', 'edit', 'reject'] as FieldDecision[]).map((decision) => (
                <button
                  key={decision}
                  type="button"
                  onClick={() =>
                    onDecision(
                      field.key,
                      decision,
                      decision === 'edit'
                        ? draft?.correctedValue ?? String(field.value ?? '')
                        : undefined,
                    )
                  }
                  className={`rounded border px-2 py-1 text-xs capitalize ${
                    currentDecision === decision
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {decision}
                </button>
              ))}
            </div>

            {currentDecision === 'edit' && (
              <input
                type="text"
                value={draft?.correctedValue ?? ''}
                onChange={(e) => onDecision(field.key, 'edit', e.target.value)}
                placeholder="Corrected value"
                aria-label={`Corrected value for ${field.label}`}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
