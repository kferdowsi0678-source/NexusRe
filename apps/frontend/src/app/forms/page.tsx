'use client';

import { useMemo, useState } from 'react';
import { FormSchemaEditor } from '@/components/form-schema-editor';
import {
  FormSchemaProblem,
  FormSchemaRecord,
  extractSchemaProblems,
  useAdminFormSchemas,
  useCloneFormSchema,
  useFormSchemas,
  usePublishFormSchema,
  useUnpublishFormSchema,
} from '@/lib/forms-api';
import { useRoleFlags } from '@/lib/use-role-flags';

export default function FormsPage() {
  const { isAdmin } = useRoleFlags();
  return isAdmin ? <FormSchemaAdmin /> : <FormSchemaCatalogue />;
}

// ---------------------------------------------------------------------------
// Read-only view — what everyone but a platform admin sees.
// ---------------------------------------------------------------------------

function FormSchemaCatalogue() {
  const { data: schemas, isLoading } = useFormSchemas();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Form Schemas</h1>
        <p className="mt-1 text-sm text-gray-500">
          JSON Schema definitions driving the dynamic submission forms
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading schemas...</p>
      ) : !schemas?.length ? (
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
          No schemas found. Run <code>pnpm run seed:forms</code> and{' '}
          <code>pnpm run seed:additional-forms</code> on the backend.
        </div>
      ) : (
        <ul className="space-y-4">
          {schemas.map((schema) => {
            const fieldCount = Object.keys(schema.schema?.properties || {}).length;
            const requiredCount = (schema.schema?.required || []).length;
            const isOpen = expanded === schema.id;

            return (
              <li key={schema.id} className="rounded-lg bg-white shadow">
                <div className="flex items-center justify-between p-6">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">{schema.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">{schema.description}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {schema.formType.replace(/_/g, ' ')} · v{schema.version} · {fieldCount} fields ·{' '}
                      {requiredCount} required
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : schema.id)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {isOpen ? 'Hide' : 'Inspect'}
                  </button>
                </div>
                {isOpen && (
                  <pre className="max-h-96 overflow-auto border-t border-gray-200 bg-gray-50 p-4 text-xs text-gray-800">
                    {JSON.stringify(schema.schema, null, 2)}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin management view.
// ---------------------------------------------------------------------------

interface SchemaFamily {
  name: string;
  versions: FormSchemaRecord[];
}

const compareVersions = (a: string, b: string) =>
  b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });

function FormSchemaAdmin() {
  const { data: schemas, isLoading } = useAdminFormSchemas();
  const publishSchema = usePublishFormSchema();
  const unpublishSchema = useUnpublishFormSchema();
  const cloneSchema = useCloneFormSchema();

  // `editing` holds the version under edit; null inside the object means "new".
  const [editing, setEditing] = useState<{ target: FormSchemaRecord | null } | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [problems, setProblems] = useState<FormSchemaProblem[]>([]);
  const [flash, setFlash] = useState('');

  const families = useMemo<SchemaFamily[]>(() => {
    const byName = new Map<string, FormSchemaRecord[]>();
    for (const schema of schemas ?? []) {
      const versions = byName.get(schema.name) ?? [];
      versions.push(schema);
      byName.set(schema.name, versions);
    }
    return Array.from(byName.entries())
      .map(([name, versions]) => ({
        name,
        versions: [...versions].sort((a, b) => compareVersions(a.version, b.version)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [schemas]);

  const run = async (action: () => Promise<FormSchemaRecord>, success: string) => {
    setProblems([]);
    setFlash('');
    try {
      await action();
      setFlash(success);
    } catch (err) {
      setProblems(extractSchemaProblems(err));
    }
  };

  const busy = publishSchema.isPending || unpublishSchema.isPending || cloneSchema.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Schemas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Author, version and publish the JSON Schemas that drive the submission wizard
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setProblems([]);
            setFlash('');
            setEditing(editing ? null : { target: null });
          }}
          className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          {editing ? 'Close editor' : 'New schema'}
        </button>
      </div>

      {flash && <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">{flash}</div>}

      {problems.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-medium text-red-800">
            {problems.length} problem{problems.length === 1 ? '' : 's'}
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {problems.map((problem, index) => (
              <li key={`${problem.path}-${index}`}>
                {problem.path && (
                  <code className="mr-2 rounded bg-red-100 px-1 py-0.5 font-mono text-xs">
                    {problem.path}
                  </code>
                )}
                {problem.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <FormSchemaEditor
          key={editing.target?.id ?? 'new'}
          target={editing.target}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setFlash(`Saved ${saved.name} v${saved.version} as a draft.`);
          }}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading schemas...</p>
      ) : !families.length ? (
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
          No schemas yet. Use <strong>New schema</strong> above, or seed the starter set with{' '}
          <code>pnpm run seed:forms</code> on the backend.
        </div>
      ) : (
        <div className="space-y-4">
          {families.map((family) => (
            <section key={family.name} className="overflow-hidden rounded-lg bg-white shadow">
              <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">{family.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {family.versions[0]?.description || 'No description'}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wider text-gray-500">
                  {family.versions.length} version{family.versions.length === 1 ? '' : 's'}
                </span>
              </header>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Version</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Form type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Line of business</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Fields</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {family.versions.map((schema) => {
                      const fieldCount = Object.keys(schema.schema?.properties || {}).length;
                      const requiredCount = (schema.schema?.required || []).length;

                      return (
                        <tr key={schema.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            v{schema.version}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-500">
                            {schema.formType.replace(/_/g, ' ')}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-500">
                            {schema.lineOfBusiness ? schema.lineOfBusiness.replace(/_/g, ' ') : '—'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {fieldCount} ({requiredCount} required)
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                schema.isPublished
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {schema.isPublished ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setProblems([]);
                                  setFlash('');
                                  setEditing({ target: schema });
                                }}
                                className="font-medium text-indigo-600 hover:text-indigo-500"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () => cloneSchema.mutateAsync({ id: schema.id }),
                                    `Cloned ${schema.name} v${schema.version} into a new draft.`,
                                  )
                                }
                                className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-40"
                              >
                                Clone
                              </button>
                              {schema.isPublished ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    run(
                                      () => unpublishSchema.mutateAsync(schema.id),
                                      `Withdrew ${schema.name} v${schema.version}.`,
                                    )
                                  }
                                  className="font-medium text-amber-700 hover:text-amber-600 disabled:opacity-40"
                                >
                                  Unpublish
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    run(
                                      () => publishSchema.mutateAsync(schema.id),
                                      `Published ${schema.name} v${schema.version}.`,
                                    )
                                  }
                                  className="font-medium text-green-700 hover:text-green-600 disabled:opacity-40"
                                >
                                  Publish
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setInspecting(inspecting === schema.id ? null : schema.id)
                                }
                                className="font-medium text-gray-600 hover:text-gray-500"
                              >
                                {inspecting === schema.id ? 'Hide' : 'Inspect'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {family.versions
                .filter((schema) => inspecting === schema.id)
                .map((schema) => (
                  <pre
                    key={schema.id}
                    className="max-h-96 overflow-auto border-t border-gray-200 bg-gray-50 p-4 text-xs text-gray-800"
                  >
                    {JSON.stringify({ schema: schema.schema, uiSchema: schema.uiSchema }, null, 2)}
                  </pre>
                ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
