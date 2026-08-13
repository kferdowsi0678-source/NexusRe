import api from './api';

/** Mirrors the backend's derived reference so the fallback name matches. */
export function placementSlipFileName(reference?: string | null) {
  const safe = (reference || 'submission').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `placement-slip-${safe || 'submission'}.pdf`;
}

/**
 * Reads the filename the API asked for, so the saved file keeps the server's
 * reference rather than whatever the page happened to know about.
 */
function fileNameFromDisposition(disposition: unknown): string | null {
  if (typeof disposition !== 'string') return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

/**
 * Downloads the placement slip PDF and hands it to the browser. The request
 * goes through the shared axios client so the bearer token (and its refresh
 * behaviour) applies exactly as it does everywhere else — a plain anchor to the
 * API URL would be unauthenticated.
 */
export async function downloadPlacementSlip(submissionId: string, reference?: string | null) {
  const res = await api.get<Blob>(`/submissions/${submissionId}/placement-slip`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
  });

  const fileName =
    fileNameFromDisposition(res.headers?.['content-disposition']) ??
    placementSlipFileName(reference);

  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  return fileName;
}

/**
 * Errors come back as a Blob when responseType is 'blob', so the usual
 * `err.response.data.message` is unreadable without unpacking it first.
 */
export async function readBlobErrorMessage(error: any, fallback: string): Promise<string> {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      const message = parsed?.message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
    } catch {
      // Not JSON — fall through to the generic message.
    }
  }
  if (typeof data?.message === 'string') return data.message;
  return fallback;
}
