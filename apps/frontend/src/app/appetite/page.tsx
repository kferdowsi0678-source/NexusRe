'use client';

import { useState } from 'react';
import {
  RiskAppetite,
  StructurePreference,
  useCreateAppetite,
  useDeleteAppetite,
  useMyAppetites,
  useUpdateAppetite,
} from '@/lib/appetite-api';

const LINES_OF_BUSINESS = [
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
];

const STRUCTURES: { value: StructurePreference; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'proportional', label: 'Proportional' },
  { value: 'non_proportional', label: 'Non-proportional' },
];

const emptyForm = {
  name: '',
  linesOfBusiness: [] as string[],
  submissionTypes: [] as string[],
  countries: '',
  worldwide: false,
  structurePreference: 'any' as StructurePreference,
  minSumInsured: '',
  maxSumInsured: '',
  currency: 'USD',
  maxCapacityShare: '',
  notes: '',
};

const label = (value: string) => value.replace(/_/g, ' ');

export default function AppetitePage() {
  const { data: appetites, isLoading } = useMyAppetites();
  const createAppetite = useCreateAppetite();
  const updateAppetite = useUpdateAppetite();
  const deleteAppetite = useDeleteAppetite();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const inputClass =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm';

  const toggleLine = (line: string) =>
    setForm((prev) => ({
      ...prev,
      linesOfBusiness: prev.linesOfBusiness.includes(line)
        ? prev.linesOfBusiness.filter((l) => l !== line)
        : [...prev.linesOfBusiness, line],
    }));

  const toggleType = (type: string) =>
    setForm((prev) => ({
      ...prev,
      submissionTypes: prev.submissionTypes.includes(type)
        ? prev.submissionTypes.filter((t) => t !== type)
        : [...prev.submissionTypes, type],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Give this appetite a name.');
    if (!form.linesOfBusiness.length) return setError('Pick at least one line of business.');

    try {
      await createAppetite.mutateAsync({
        name: form.name,
        linesOfBusiness: form.linesOfBusiness,
        submissionTypes: form.submissionTypes.length ? form.submissionTypes : undefined,
        countries: form.countries
          ? form.countries.split(',').map((c) => c.trim()).filter(Boolean)
          : undefined,
        worldwide: form.worldwide,
        structurePreference: form.structurePreference,
        minSumInsured: form.minSumInsured ? Number(form.minSumInsured) : undefined,
        maxSumInsured: form.maxSumInsured ? Number(form.maxSumInsured) : undefined,
        currency: form.currency || undefined,
        maxCapacityShare: form.maxCapacityShare ? Number(form.maxCapacityShare) : undefined,
        notes: form.notes || undefined,
      } as Partial<RiskAppetite>);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not save this appetite.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Appetite</h1>
          <p className="mt-1 text-sm text-gray-500">
            What your organisation is willing to look at. Used to match you to incoming risks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          {showForm ? 'Close' : 'New appetite'}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="space-y-5 rounded-lg bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name <span className="text-red-600">*</span>
              </label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="African property facultative"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="structure" className="block text-sm font-medium text-gray-700">
                Structure preference
              </label>
              <select
                id="structure"
                value={form.structurePreference}
                onChange={(e) =>
                  setForm({ ...form, structurePreference: e.target.value as StructurePreference })
                }
                className={inputClass}
              >
                {STRUCTURES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-gray-700">
              Lines of business <span className="text-red-600">*</span>
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LINES_OF_BUSINESS.map((line) => (
                <label key={line} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.linesOfBusiness.includes(line)}
                    onChange={() => toggleLine(line)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm capitalize text-gray-700">{label(line)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-gray-700">Business written</legend>
            <p className="text-xs text-gray-500">Leave both unticked to accept either.</p>
            <div className="mt-2 flex gap-4">
              {['treaty', 'facultative'].map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.submissionTypes.includes(type)}
                    onChange={() => toggleType(type)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm capitalize text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="countries" className="block text-sm font-medium text-gray-700">
                Territories
              </label>
              <input
                id="countries"
                value={form.countries}
                onChange={(e) => setForm({ ...form, countries: e.target.value })}
                placeholder="Nigeria, Kenya, Ghana"
                disabled={form.worldwide}
                className={inputClass + (form.worldwide ? ' bg-gray-100' : '')}
              />
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.worldwide}
                  onChange={(e) => setForm({ ...form, worldwide: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Worldwide</span>
              </label>
            </div>
            <div>
              <label htmlFor="maxCapacityShare" className="block text-sm font-medium text-gray-700">
                Largest share you would take (%)
              </label>
              <input
                id="maxCapacityShare"
                type="number"
                min="0"
                max="100"
                value={form.maxCapacityShare}
                onChange={(e) => setForm({ ...form, maxCapacityShare: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="minSumInsured" className="block text-sm font-medium text-gray-700">
                Minimum sum insured
              </label>
              <input
                id="minSumInsured"
                type="number"
                min="0"
                value={form.minSumInsured}
                onChange={(e) => setForm({ ...form, minSumInsured: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="maxSumInsured" className="block text-sm font-medium text-gray-700">
                Maximum sum insured
              </label>
              <input
                id="maxSumInsured"
                type="number"
                min="0"
                value={form.maxSumInsured}
                onChange={(e) => setForm({ ...form, maxSumInsured: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                Currency
              </label>
              <input
                id="currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createAppetite.isPending}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {createAppetite.isPending ? 'Saving...' : 'Save appetite'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading appetite...</p>
      ) : !appetites?.length ? (
        <div className="rounded-lg bg-white p-6 text-center shadow">
          <p className="text-sm text-gray-500">
            No appetite defined yet. Until you add one, you will not appear in market matches and
            your opportunities feed will stay empty.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {appetites.map((appetite) => (
            <li key={appetite.id} className="rounded-lg bg-white p-6 shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-medium text-gray-900">{appetite.name}</h2>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        appetite.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {appetite.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm capitalize text-gray-600">
                    {appetite.linesOfBusiness.map(label).join(', ')}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {appetite.worldwide
                      ? 'Worldwide'
                      : appetite.countries?.length
                      ? appetite.countries.join(', ')
                      : 'No territory restriction'}
                    {appetite.maxCapacityShare != null
                      ? ` · up to ${Number(appetite.maxCapacityShare)}%`
                      : ''}
                    {appetite.structurePreference !== 'any'
                      ? ` · ${label(appetite.structurePreference)}`
                      : ''}
                  </p>
                  {appetite.notes && (
                    <p className="mt-2 text-xs text-gray-600">{appetite.notes}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateAppetite.mutate({
                        id: appetite.id,
                        data: { isActive: !appetite.isActive },
                      })
                    }
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {appetite.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAppetite.mutate(appetite.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
