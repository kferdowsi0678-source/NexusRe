'use client';

import { useState } from 'react';
import { downloadPlacementSlip, readBlobErrorMessage } from '@/lib/placement-slip-api';

interface PlacementSlipButtonProps {
  submissionId: string;
  /** Used for the fallback file name when the API sends no Content-Disposition. */
  reference?: string | null;
  className?: string;
}

export function PlacementSlipButton({
  submissionId,
  reference,
  className,
}: PlacementSlipButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setError('');
    setIsDownloading(true);
    try {
      await downloadPlacementSlip(submissionId, reference);
    } catch (err: any) {
      setError(await readBlobErrorMessage(err, 'Could not generate the placement slip.'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading || !submissionId}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
      >
        <svg
          className="h-4 w-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3M4 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
          />
        </svg>
        {isDownloading ? 'Preparing slip...' : 'Download placement slip'}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
