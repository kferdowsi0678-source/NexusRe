'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useCreateSubmission } from '@/lib/submissions-api';
import { resolveFormType, useFormSchema } from '@/lib/forms-api';
import { DynamicForm } from '@/components/dynamic-form';

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

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'XOF'];

export default function NewSubmissionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const createSubmission = useCreateSubmission();

  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState('');
  const [basics, setBasics] = useState({
    title: '',
    type: 'facultative' as 'treaty' | 'facultative',
    lineOfBusiness: 'property',
    description: '',
    sumInsured: '',
    currency: 'USD',
    inceptionDate: '',
    expiryDate: '',
  });
  const [riskDetails, setRiskDetails] = useState<Record<string, any>>({});

  const formType = useMemo(
    () => resolveFormType(basics.type, basics.lineOfBusiness),
    [basics.type, basics.lineOfBusiness],
  );
  const { data: formSchema, isLoading: schemaLoading, isError: schemaError } =
    useFormSchema(step === 2 ? formType : undefined);

  const handleBasicsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setBasics({ ...basics, [e.target.name]: e.target.value });
  };

  const goToDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!basics.title.trim()) {
      setError('Title is required');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (asDraft: boolean) => {
    setError('');
    if (!user?.organizationId) {
      setError('Your account is not linked to an organization.');
      return;
    }

    try {
      const created = await createSubmission.mutateAsync({
        title: basics.title,
        type: basics.type,
        lineOfBusiness: basics.lineOfBusiness,
        description: basics.description || undefined,
        sumInsured: basics.sumInsured ? Number(basics.sumInsured) : undefined,
        currency: basics.currency || undefined,
        inceptionDate: basics.inceptionDate || undefined,
        expiryDate: basics.expiryDate || undefined,
        cedantId: user.organizationId,
        riskDetails: Object.keys(riskDetails).length ? riskDetails : undefined,
      });

      router.push(`/submissions/${created.id}${asDraft ? '' : '?submit=1'}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create submission.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Submission</h1>
          <p className="mt-1 text-sm text-gray-500">
            Step {step} of 2 — {step === 1 ? 'Basic information' : 'Risk details'}
          </p>
        </div>
        <Link href="/submissions" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Cancel
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {step === 1 && (
        <form onSubmit={goToDetails} className="space-y-6 rounded-lg bg-white p-6 shadow">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              id="title"
              name="title"
              required
              value={basics.title}
              onChange={handleBasicsChange}
              placeholder="e.g. Lagos Office Tower - Property Fac"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Type <span className="text-red-600">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={basics.type}
                onChange={handleBasicsChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="facultative">Facultative</option>
                <option value="treaty">Treaty</option>
              </select>
            </div>
            <div>
              <label htmlFor="lineOfBusiness" className="block text-sm font-medium text-gray-700">
                Line of Business <span className="text-red-600">*</span>
              </label>
              <select
                id="lineOfBusiness"
                name="lineOfBusiness"
                value={basics.lineOfBusiness}
                onChange={handleBasicsChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {LINES_OF_BUSINESS.map((lob) => (
                  <option key={lob} value={lob}>
                    {lob.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={basics.description}
              onChange={handleBasicsChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sumInsured" className="block text-sm font-medium text-gray-700">
                Sum Insured
              </label>
              <input
                id="sumInsured"
                name="sumInsured"
                type="number"
                min="0"
                value={basics.sumInsured}
                onChange={handleBasicsChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={basics.currency}
                onChange={handleBasicsChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="inceptionDate" className="block text-sm font-medium text-gray-700">
                Inception Date
              </label>
              <input
                id="inceptionDate"
                name="inceptionDate"
                type="date"
                value={basics.inceptionDate}
                onChange={handleBasicsChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">
                Expiry Date
              </label>
              <input
                id="expiryDate"
                name="expiryDate"
                type="date"
                value={basics.expiryDate}
                onChange={handleBasicsChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Continue to risk details
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-6 rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {formSchema?.name || formType.replace(/_/g, ' ')}
              </h2>
              {formSchema?.description && (
                <p className="mt-1 text-sm text-gray-500">{formSchema.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Back
            </button>
          </div>

          {schemaLoading && <p className="text-sm text-gray-500">Loading form schema...</p>}

          {schemaError && (
            <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
              No form schema found for this combination. You can still save the submission and add
              risk details later. Run <code>pnpm run seed:forms</code> on the backend to load schemas.
            </div>
          )}

          {formSchema && (
            <DynamicForm
              schema={formSchema.schema}
              uiSchema={formSchema.uiSchema}
              value={riskDetails}
              onChange={setRiskDetails}
            />
          )}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              disabled={createSubmission.isPending}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {createSubmission.isPending ? 'Saving...' : 'Save as draft'}
            </button>
            <button
              type="button"
              disabled={createSubmission.isPending}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              Save and review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
