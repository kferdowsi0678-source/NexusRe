import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export type FormType =
  | 'property_facultative'
  | 'engineering_facultative'
  | 'treaty_generic'
  | 'casualty_facultative'
  | 'energy_facultative';

export const FORM_TYPES: FormType[] = [
  'property_facultative',
  'engineering_facultative',
  'treaty_generic',
  'casualty_facultative',
  'energy_facultative',
];

export const LINES_OF_BUSINESS = [
  'property',
  'casualty',
  'energy',
  'marine',
  'aviation',
  'cyber',
  'political_violence',
  'agriculture',
  'engineering',
  'professional_indemnity',
  'motor',
  'liability',
] as const;

export type LineOfBusiness = (typeof LINES_OF_BUSINESS)[number];

export interface FormSchemaRecord {
  id: string;
  name: string;
  formType: FormType;
  version: string;
  schema: any;
  uiSchema?: any;
  validationRules?: any;
  description?: string;
  lineOfBusiness?: LineOfBusiness | null;
  isActive?: boolean;
  isPublished?: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** One structural problem the server found, addressed by a path into the JSON. */
export interface FormSchemaProblem {
  path: string;
  message: string;
}

export interface FormSchemaCheckResult {
  valid: boolean;
  problems: FormSchemaProblem[];
}

export interface FormSchemaInput {
  name: string;
  formType: FormType;
  version?: string;
  schema: any;
  uiSchema?: any;
  validationRules?: any;
  lineOfBusiness?: LineOfBusiness;
  description?: string;
}

// Maps submission type + line of business to a form schema type
export function resolveFormType(
  type: 'treaty' | 'facultative',
  lineOfBusiness: string,
): FormType {
  if (type === 'treaty') return 'treaty_generic';
  switch (lineOfBusiness) {
    case 'property':
      return 'property_facultative';
    case 'engineering':
      return 'engineering_facultative';
    case 'casualty':
    case 'liability':
    case 'professional_indemnity':
      return 'casualty_facultative';
    case 'energy':
      return 'energy_facultative';
    default:
      return 'property_facultative';
  }
}

/**
 * Pulls the per-field problem list out of a failed admin write. The API returns
 * `{ message, errors: [{ path, message }] }` for schema rejections; anything
 * else (a 403, a network blip) collapses to a single problem so the caller can
 * render one list either way.
 */
export function extractSchemaProblems(error: any): FormSchemaProblem[] {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors)) {
    return data.errors.map((entry: any) =>
      typeof entry === 'string'
        ? { path: '', message: entry }
        : { path: entry?.path ?? '', message: entry?.message ?? String(entry) },
    );
  }
  const message = data?.message ?? error?.message ?? 'Request failed.';
  return [{ path: '', message: Array.isArray(message) ? message.join(', ') : String(message) }];
}

// ---------------------------------------------------------------------------
// Consumer reads
// ---------------------------------------------------------------------------

export const useFormSchemas = () =>
  useQuery({
    queryKey: ['form-schemas'],
    queryFn: async () => {
      const res = await api.get<FormSchemaRecord[]>('/forms');
      return res.data;
    },
  });

export const useFormSchema = (formType?: FormType) =>
  useQuery({
    queryKey: ['form-schema', formType],
    queryFn: async () => {
      const res = await api.get<FormSchemaRecord>(`/forms/type/${formType}`);
      return res.data;
    },
    enabled: !!formType,
    retry: false,
  });

// ---------------------------------------------------------------------------
// Admin panel — every one of these is super_admin only on the server.
// ---------------------------------------------------------------------------

const ADMIN_KEY = ['admin-form-schemas'];

/** Invalidate both the admin catalogue and the consumer views after a write. */
const useSchemaInvalidation = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
    queryClient.invalidateQueries({ queryKey: ['form-schemas'] });
    queryClient.invalidateQueries({ queryKey: ['form-schema'] });
  };
};

/** Every version of every schema, drafts included. */
export const useAdminFormSchemas = (enabled = true) =>
  useQuery({
    queryKey: ADMIN_KEY,
    queryFn: async () => {
      const res = await api.get<FormSchemaRecord[]>('/forms/admin/schemas');
      return res.data;
    },
    enabled,
  });

/** Every version sharing a name with the given one, newest first. */
export const useFormSchemaVersions = (id?: string) =>
  useQuery({
    queryKey: [...ADMIN_KEY, id, 'versions'],
    queryFn: async () => {
      const res = await api.get<FormSchemaRecord[]>(`/forms/admin/schemas/${id}/versions`);
      return res.data;
    },
    enabled: !!id,
  });

export const useCreateFormSchema = () => {
  const invalidate = useSchemaInvalidation();
  return useMutation({
    mutationFn: async (input: FormSchemaInput) => {
      const res = await api.post<FormSchemaRecord>('/forms/admin/schemas', input);
      return res.data;
    },
    onSuccess: invalidate,
  });
};

/**
 * Edits a version. Drafts change in place; a published version is forked into a
 * new draft, so the returned record may carry a different id than the one sent.
 */
export const useUpdateFormSchema = () => {
  const invalidate = useSchemaInvalidation();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormSchemaInput> }) => {
      const res = await api.patch<FormSchemaRecord>(`/forms/admin/schemas/${id}`, data);
      return res.data;
    },
    onSuccess: invalidate,
  });
};

export const useCloneFormSchema = () => {
  const invalidate = useSchemaInvalidation();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data?: { name?: string; version?: string; formType?: FormType; lineOfBusiness?: LineOfBusiness; description?: string };
    }) => {
      const res = await api.post<FormSchemaRecord>(`/forms/admin/schemas/${id}/clone`, data ?? {});
      return res.data;
    },
    onSuccess: invalidate,
  });
};

export const usePublishFormSchema = () => {
  const invalidate = useSchemaInvalidation();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<FormSchemaRecord>(`/forms/admin/schemas/${id}/publish`, {});
      return res.data;
    },
    onSuccess: invalidate,
  });
};

export const useUnpublishFormSchema = () => {
  const invalidate = useSchemaInvalidation();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<FormSchemaRecord>(`/forms/admin/schemas/${id}/unpublish`, {});
      return res.data;
    },
    onSuccess: invalidate,
  });
};

/** Dry run: asks the server for the problem list without saving anything. */
export const useCheckFormSchema = () =>
  useMutation({
    mutationFn: async (input: { schema: any; uiSchema?: any }) => {
      const res = await api.post<FormSchemaCheckResult>('/forms/admin/schemas/validate', input);
      return res.data;
    },
  });
