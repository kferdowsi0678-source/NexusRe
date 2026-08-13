'use client';

import { useMemo, useState } from 'react';
import { DynamicForm } from './dynamic-form';
import {
  FORM_TYPES,
  FormSchemaInput,
  FormSchemaProblem,
  FormSchemaRecord,
  FormType,
  LINES_OF_BUSINESS,
  LineOfBusiness,
  extractSchemaProblems,
  useCheckFormSchema,
  useCreateFormSchema,
  useUpdateFormSchema,
} from '@/lib/forms-api';

interface FormSchemaEditorProps {
  /** Existing version being edited, or null when authoring a new schema. */
  target: FormSchemaRecord | null;
  onClose: () => void;
  onSaved: (record: FormSchemaRecord) => void;
}

const STARTER_SCHEMA = {
  type: 'object',
  required: ['exampleField'],
  properties: {
    exampleField: {
      type: 'string',
      enum: ['first_option', 'second_option'],
      title: 'Example Field',
    },
  },
};

const inputClass =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm';

const labelClass = 'block text-sm font-medium text-gray-700';

/** Parses editor text, reporting the JSON error rather than swallowing it. */
function parseJson(text: string, allowEmpty: boolean) {
  const trimmed = text.trim();
  if (!trimmed) {
    return allowEmpty
      ? { value: undefined as any, error: '' }
      : { value: undefined as any, error: 'Schema body is empty.' };
  }
  try {
    return { value: JSON.parse(trimmed), error: '' };
  } catch (err: any) {
    return { value: undefined as any, error: err?.message || 'Invalid JSON.' };
  }
}

/** Turns `schema.properties.address.properties.city.type` into `address › city`. */
function fieldLabelFor(path: string): string {
  const parts = path
    .split('.')
    .filter((part) => part && part !== 'schema' && part !== 'properties' && part !== 'items');
  if (parts.length === 0) return path || 'Schema';
  if (path.startsWith('uiSchema')) return parts.join(' › ');
  // Drop the trailing keyword (type, enum, ...) so the field name reads first.
  const trailing = ['type', 'enum', 'required', 'title', 'format'];
  const head = parts.filter((part, index) => !(index === parts.length - 1 && trailing.includes(part)));
  return (head.length ? head : parts).join(' › ');
}

export function FormSchemaEditor({ target, onClose, onSaved }: FormSchemaEditorProps) {
  const createSchema = useCreateFormSchema();
  const updateSchema = useUpdateFormSchema();
  const checkSchema = useCheckFormSchema();

  const [name, setName] = useState(target?.name ?? '');
  const [formType, setFormType] = useState<FormType>(target?.formType ?? 'property_facultative');
  const [version, setVersion] = useState(target?.version ?? '1.0.0');
  const [lineOfBusiness, setLineOfBusiness] = useState<string>(target?.lineOfBusiness ?? '');
  const [description, setDescription] = useState(target?.description ?? '');
  const [schemaText, setSchemaText] = useState(
    JSON.stringify(target?.schema ?? STARTER_SCHEMA, null, 2),
  );
  const [uiSchemaText, setUiSchemaText] = useState(
    target?.uiSchema ? JSON.stringify(target.uiSchema, null, 2) : '',
  );

  const [problems, setProblems] = useState<FormSchemaProblem[]>([]);
  const [notice, setNotice] = useState('');
  const [previewValue, setPreviewValue] = useState<Record<string, any>>({});

  const parsedSchema = useMemo(() => parseJson(schemaText, false), [schemaText]);
  const parsedUiSchema = useMemo(() => parseJson(uiSchemaText, true), [uiSchemaText]);

  const parseError = parsedSchema.error || parsedUiSchema.error;
  const canSubmit = !parseError && name.trim().length > 0 && !createSchema.isPending && !updateSchema.isPending;

  // A published version is immutable, so saving forks a new draft instead.
  const forksNewVersion = !!target?.isPublished;

  const buildPayload = (): FormSchemaInput => ({
    name: name.trim(),
    formType,
    version: version.trim() || undefined,
    schema: parsedSchema.value,
    uiSchema: parsedUiSchema.value,
    lineOfBusiness: (lineOfBusiness || undefined) as LineOfBusiness | undefined,
    description: description.trim() || undefined,
  });

  const handleCheck = async () => {
    setNotice('');
    if (parseError) {
      setProblems([{ path: '', message: parseError }]);
      return;
    }
    try {
      const result = await checkSchema.mutateAsync({
        schema: parsedSchema.value,
        uiSchema: parsedUiSchema.value,
      });
      setProblems(result.problems);
      setNotice(result.valid ? 'Schema is valid and ready to publish.' : '');
    } catch (err) {
      setProblems(extractSchemaProblems(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice('');
    if (parseError) {
      setProblems([{ path: '', message: parseError }]);
      return;
    }

    try {
      const payload = buildPayload();
      const saved = target
        ? await updateSchema.mutateAsync({ id: target.id, data: payload })
        : await createSchema.mutateAsync(payload);
      setProblems([]);
      onSaved(saved);
    } catch (err) {
      setProblems(extractSchemaProblems(err));
    }
  };

  const prettify = () => {
    if (!parsedSchema.error) setSchemaText(JSON.stringify(parsedSchema.value, null, 2));
    if (!parsedUiSchema.error && parsedUiSchema.value !== undefined) {
      setUiSchemaText(JSON.stringify(parsedUiSchema.value, null, 2));
    }
  };

  const previewReady =
    !parsedSchema.error &&
    parsedSchema.value &&
    typeof parsedSchema.value === 'object' &&
    !Array.isArray(parsedSchema.value);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            {target ? `Edit ${target.name}` : 'New form schema'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {forksNewVersion
              ? `v${target?.version} is published and cannot be changed — saving creates a new draft version.`
              : 'Saved as an unpublished draft. Cedants only see it once you publish.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="schemaName" className={labelClass}>
            Name <span className="text-red-600">*</span>
          </label>
          <input
            id="schemaName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="schemaFormType" className={labelClass}>
            Form type <span className="text-red-600">*</span>
          </label>
          <select
            id="schemaFormType"
            value={formType}
            onChange={(e) => setFormType(e.target.value as FormType)}
            className={inputClass}
          >
            {FORM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="schemaVersion" className={labelClass}>
            Version
          </label>
          <input
            id="schemaVersion"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder={forksNewVersion ? 'Leave blank to auto-increment' : '1.0.0'}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="schemaLob" className={labelClass}>
            Line of business
          </label>
          <select
            id="schemaLob"
            value={lineOfBusiness}
            onChange={(e) => setLineOfBusiness(e.target.value)}
            className={inputClass}
          >
            <option value="">Not specified</option>
            {LINES_OF_BUSINESS.map((lob) => (
              <option key={lob} value={lob}>
                {lob.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="schemaDescription" className={labelClass}>
            Description
          </label>
          <input
            id="schemaDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {notice && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">{notice}</div>
      )}

      {problems.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">
            {problems.length} problem{problems.length === 1 ? '' : 's'} to fix
          </h3>
          <ul className="mt-3 space-y-2">
            {problems.map((problem, index) => (
              <li key={`${problem.path}-${index}`} className="text-sm">
                <span className="font-medium text-red-900">{fieldLabelFor(problem.path)}</span>
                {problem.path && (
                  <code className="ml-2 rounded bg-red-100 px-1 py-0.5 font-mono text-xs text-red-700">
                    {problem.path}
                  </code>
                )}
                <p className="text-red-700">{problem.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="schemaBody" className={labelClass}>
                Schema (JSON Schema) <span className="text-red-600">*</span>
              </label>
              <button
                type="button"
                onClick={prettify}
                disabled={!!parseError}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-40"
              >
                Format
              </button>
            </div>
            <textarea
              id="schemaBody"
              spellCheck={false}
              rows={20}
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              className={`${inputClass} font-mono text-xs leading-relaxed ${
                parsedSchema.error ? 'border-red-400 bg-red-50' : ''
              }`}
            />
            <p
              className={`mt-1 text-xs ${
                parsedSchema.error ? 'font-medium text-red-700' : 'text-gray-500'
              }`}
            >
              {parsedSchema.error || 'Valid JSON'}
            </p>
          </div>

          <div>
            <label htmlFor="uiSchemaBody" className={labelClass}>
              uiSchema (optional)
            </label>
            <textarea
              id="uiSchemaBody"
              spellCheck={false}
              rows={8}
              value={uiSchemaText}
              onChange={(e) => setUiSchemaText(e.target.value)}
              placeholder='{ "ui:order": ["fieldOne", "fieldTwo"] }'
              className={`${inputClass} font-mono text-xs leading-relaxed ${
                parsedUiSchema.error ? 'border-red-400 bg-red-50' : ''
              }`}
            />
            <p
              className={`mt-1 text-xs ${
                parsedUiSchema.error ? 'font-medium text-red-700' : 'text-gray-500'
              }`}
            >
              {parsedUiSchema.error || 'Valid JSON'}
            </p>
          </div>
        </div>

        <div>
          <h3 className={labelClass}>Live preview</h3>
          <p className="mt-1 text-xs text-gray-500">
            Rendered with the same component cedants use on the submission wizard.
          </p>
          <div className="mt-2 max-h-[36rem] overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-4">
            {previewReady ? (
              <DynamicForm
                schema={parsedSchema.value}
                uiSchema={parsedUiSchema.value}
                value={previewValue}
                onChange={setPreviewValue}
              />
            ) : (
              <p className="text-sm text-gray-500">
                Fix the JSON above to see the form preview.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={checkSchema.isPending}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {checkSchema.isPending ? 'Checking...' : 'Check schema'}
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {createSchema.isPending || updateSchema.isPending
            ? 'Saving...'
            : forksNewVersion
            ? 'Save as new version'
            : target
            ? 'Save draft'
            : 'Create draft'}
        </button>
      </div>
    </form>
  );
}
