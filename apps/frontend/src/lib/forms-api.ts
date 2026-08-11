import { useQuery } from '@tanstack/react-query';
import api from './api';

export type FormType =
  | 'property_facultative'
  | 'engineering_facultative'
  | 'treaty_generic'
  | 'casualty_facultative'
  | 'energy_facultative';

export interface FormSchemaRecord {
  id: string;
  name: string;
  formType: FormType;
  version: string;
  schema: any;
  uiSchema?: any;
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
