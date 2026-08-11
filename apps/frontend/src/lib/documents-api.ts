import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export type DocumentCategory =
  | 'risk_survey'
  | 'loss_history'
  | 'financials'
  | 'wordings'
  | 'claims_documentation'
  | 'other';

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'risk_survey', label: 'Risk Survey' },
  { value: 'loss_history', label: 'Loss History' },
  { value: 'financials', label: 'Financials' },
  { value: 'wordings', label: 'Wordings' },
  { value: 'claims_documentation', label: 'Claims Documentation' },
  { value: 'other', label: 'Other' },
];

export interface SubmissionDocumentRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  description?: string;
  createdAt: string;
  uploadedBy?: { firstName: string; lastName: string };
}

export const useDocuments = (submissionId: string) =>
  useQuery({
    queryKey: ['documents', submissionId],
    queryFn: async () => {
      const res = await api.get<SubmissionDocumentRecord[]>(
        `/submissions/${submissionId}/documents`,
      );
      return res.data;
    },
    enabled: !!submissionId,
  });

export const useUploadDocument = (submissionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      file: File;
      category: DocumentCategory;
      description?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', input.file);
      formData.append('submissionId', submissionId);
      formData.append('category', input.category);
      if (input.description) formData.append('description', input.description);

      const res = await api.post(
        `/submissions/${submissionId}/documents/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
    },
  });
};

export const useDeleteDocument = (submissionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      await api.delete(`/submissions/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
    },
  });
};

export async function openDocument(documentId: string) {
  const res = await api.get<{ downloadUrl: string }>(
    `/submissions/documents/${documentId}/download-url`,
  );
  window.open(res.data.downloadUrl, '_blank', 'noopener,noreferrer');
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
