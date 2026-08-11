'use client';

import { useState } from 'react';
import { useFormSchemas } from '@/lib/forms-api';

export default function FormsPage() {
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
