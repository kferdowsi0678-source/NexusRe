'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  DOCUMENT_CATEGORIES,
  DocumentCategory,
  formatFileSize,
  openDocument,
  useDeleteDocument,
  useDocuments,
  useUploadDocument,
} from '@/lib/documents-api';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'text/csv': ['.csv'],
};

export function DocumentManager({
  submissionId,
  canEdit,
}: {
  submissionId: string;
  canEdit: boolean;
}) {
  const { data: documents, isLoading } = useDocuments(submissionId);
  const upload = useUploadDocument(submissionId);
  const remove = useDeleteDocument(submissionId);

  const [category, setCategory] = useState<DocumentCategory>('risk_survey');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const onDrop = useCallback(
    async (files: File[]) => {
      setError('');
      for (const file of files) {
        try {
          await upload.mutateAsync({ file, category, description: description || undefined });
        } catch (err: any) {
          setError(err.response?.data?.message || `Failed to upload ${file.name}`);
        }
      }
      setDescription('');
    },
    [upload, category, description],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 50 * 1024 * 1024,
    disabled: !canEdit || upload.isPending,
  });

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="doc-category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="doc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="doc-description" className="block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <input
                id="doc-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${
              isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'
            } ${upload.isPending ? 'opacity-60' : 'hover:border-indigo-400'}`}
          >
            <input {...getInputProps()} aria-label="Upload documents" />
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6H16a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {upload.isPending
                ? 'Uploading...'
                : isDragActive
                ? 'Drop files here'
                : 'Drag and drop files, or click to browse'}
            </p>
            <p className="mt-1 text-xs text-gray-500">PDF, Word, Excel, CSV or images up to 50MB</p>
          </div>
        </div>
      )}

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading documents...</p>
      ) : !documents || documents.length === 0 ? (
        <p className="text-sm text-gray-500">No documents uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{doc.fileName}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(doc.fileSize)}
                  {doc.description ? ` · ${doc.description}` : ''}
                  {doc.uploadedBy ? ` · ${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : ''}
                </p>
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => openDocument(doc.id)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Download
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(doc.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-500"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
