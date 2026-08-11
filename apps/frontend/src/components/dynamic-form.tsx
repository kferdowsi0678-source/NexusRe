'use client';

// Renders a form from a JSON Schema definition (one level of nesting supported).
// Values are stored as a plain object suitable for the submission riskDetails field.

interface DynamicFormProps {
  schema: any;
  uiSchema?: any;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  errors?: string[];
}

const labelFor = (key: string, def: any) =>
  def?.title || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c: string) => c.toUpperCase());

const inputClass =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm';

function isRequired(schema: any, key: string) {
  return Array.isArray(schema?.required) && schema.required.includes(key);
}

export function DynamicForm({ schema, uiSchema, value, onChange, errors }: DynamicFormProps) {
  const properties: Record<string, any> = schema?.properties || {};
  const order: string[] = uiSchema?.['ui:order'] || Object.keys(properties);
  const keys = order.filter((k) => properties[k]);

  const setField = (key: string, fieldValue: any) => {
    onChange({ ...value, [key]: fieldValue });
  };

  const renderScalar = (key: string, def: any, current: any, onSet: (v: any) => void) => {
    if (Array.isArray(def.enum)) {
      return (
        <select
          id={key}
          value={current ?? ''}
          onChange={(e) => onSet(e.target.value || undefined)}
          className={inputClass}
        >
          <option value="">Select...</option>
          {def.enum.map((option: string) => (
            <option key={option} value={option}>
              {option.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      );
    }

    if (def.type === 'boolean') {
      return (
        <label className="mt-2 flex items-center gap-2">
          <input
            id={key}
            type="checkbox"
            checked={!!current}
            onChange={(e) => onSet(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">Yes</span>
        </label>
      );
    }

    if (def.type === 'number' || def.type === 'integer') {
      return (
        <input
          id={key}
          type="number"
          value={current ?? ''}
          min={def.minimum}
          max={def.maximum}
          onChange={(e) => onSet(e.target.value === '' ? undefined : Number(e.target.value))}
          className={inputClass}
        />
      );
    }

    if (def.format === 'date') {
      return (
        <input
          id={key}
          type="date"
          value={current ?? ''}
          onChange={(e) => onSet(e.target.value || undefined)}
          className={inputClass}
        />
      );
    }

    const widget = uiSchema?.[key]?.['ui:widget'];
    if (widget === 'textarea') {
      return (
        <textarea
          id={key}
          rows={uiSchema?.[key]?.['ui:options']?.rows || 3}
          value={current ?? ''}
          onChange={(e) => onSet(e.target.value || undefined)}
          className={inputClass}
        />
      );
    }

    return (
      <input
        id={key}
        type="text"
        value={current ?? ''}
        onChange={(e) => onSet(e.target.value || undefined)}
        className={inputClass}
      />
    );
  };

  const renderEnumArray = (key: string, def: any, current: string[] = []) => (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {def.items.enum.map((option: string) => (
        <label key={option} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={current.includes(option)}
            onChange={(e) => {
              const next = e.target.checked
                ? [...current, option]
                : current.filter((v) => v !== option);
              setField(key, next.length ? next : undefined);
            }}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">{option.replace(/_/g, ' ')}</span>
        </label>
      ))}
    </div>
  );

  const renderStringArray = (key: string, current: string[] = []) => (
    <input
      id={key}
      type="text"
      value={current.join(', ')}
      onChange={(e) => {
        const items = e.target.value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        setField(key, items.length ? items : undefined);
      }}
      placeholder="Comma separated values"
      className={inputClass}
    />
  );

  return (
    <div className="space-y-6">
      {errors && errors.length > 0 && (
        <div className="rounded-md bg-red-50 p-4">
          <h4 className="text-sm font-medium text-red-800">Please fix the following:</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {keys.map((key) => {
        const def = properties[key];
        const required = isRequired(schema, key);

        if (def.type === 'object' && def.properties) {
          const nested: Record<string, any> = value[key] || {};
          return (
            <fieldset key={key} className="rounded-md border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium text-gray-900">
                {labelFor(key, def)}
                {required && <span className="ml-1 text-red-600">*</span>}
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Object.entries(def.properties).map(([nestedKey, nestedDef]: [string, any]) => (
                  <div key={nestedKey}>
                    <label htmlFor={nestedKey} className="block text-sm font-medium text-gray-700">
                      {labelFor(nestedKey, nestedDef)}
                      {isRequired(def, nestedKey) && <span className="ml-1 text-red-600">*</span>}
                    </label>
                    {nestedDef.type === 'array' && nestedDef.items?.enum
                      ? renderEnumArray(nestedKey, nestedDef, nested[nestedKey] || [])
                      : nestedDef.type === 'array'
                      ? renderStringArray(nestedKey, nested[nestedKey] || [])
                      : renderScalar(nestedKey, nestedDef, nested[nestedKey], (v) =>
                          setField(key, { ...nested, [nestedKey]: v }),
                        )}
                  </div>
                ))}
              </div>
            </fieldset>
          );
        }

        if (def.type === 'array' && def.items?.type === 'object') {
          // Repeating groups are captured as JSON in this MVP renderer.
          return (
            <div key={key}>
              <label htmlFor={key} className="block text-sm font-medium text-gray-700">
                {labelFor(key, def)} <span className="text-xs text-gray-500">(JSON list)</span>
              </label>
              <textarea
                id={key}
                rows={4}
                value={value[key] ? JSON.stringify(value[key], null, 2) : ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw.trim()) return setField(key, undefined);
                  try {
                    setField(key, JSON.parse(raw));
                  } catch {
                    setField(key, raw);
                  }
                }}
                placeholder='[{ "year": 2023, "amount": 10000 }]'
                className={inputClass + ' font-mono text-xs'}
              />
            </div>
          );
        }

        return (
          <div key={key}>
            <label htmlFor={key} className="block text-sm font-medium text-gray-700">
              {labelFor(key, def)}
              {required && <span className="ml-1 text-red-600">*</span>}
            </label>
            {def.type === 'array' && def.items?.enum
              ? renderEnumArray(key, def, value[key] || [])
              : def.type === 'array'
              ? renderStringArray(key, value[key] || [])
              : renderScalar(key, def, value[key], (v) => setField(key, v))}
          </div>
        );
      })}
    </div>
  );
}
