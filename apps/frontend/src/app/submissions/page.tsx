'use client';

import { useState } from 'react';
import { useSubmissions } from '@/lib/submissions-api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-purple-100 text-purple-800',
  negotiating: 'bg-orange-100 text-orange-800',
  bound: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

export default function SubmissionsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    lineOfBusiness: '',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'DESC' as 'ASC' | 'DESC',
  });

  const { data, isLoading } = useSubmissions(filters);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      type: '',
      lineOfBusiness: '',
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your reinsurance submissions
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/submissions/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            New Submission
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search title..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="quoted">Quoted</option>
              <option value="negotiating">Negotiating</option>
              <option value="bound">Bound</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="treaty">Treaty</option>
              <option value="facultative">Facultative</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Line of Business</label>
            <select
              value={filters.lineOfBusiness}
              onChange={(e) => handleFilterChange('lineOfBusiness', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Lines</option>
              <option value="property">Property</option>
              <option value="casualty">Casualty</option>
              <option value="energy">Energy</option>
              <option value="marine">Marine</option>
              <option value="aviation">Aviation</option>
              <option value="engineering">Engineering</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <div className="text-gray-500">Loading submissions...</div>
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new submission.</p>
          <div className="mt-6">
            <Link
              href="/submissions/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              New Submission
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {data?.data?.map((submission: any) => (
                <li
                  key={submission.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/submissions/${submission.id}`)}
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {submission.title}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[submission.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {submission.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                          <span className="capitalize">{submission.type}</span>
                          <span>•</span>
                          <span className="capitalize">{submission.lineOfBusiness}</span>
                          {submission.sumInsured && (
                            <>
                              <span>•</span>
                              <span>
                                {submission.currency} {submission.sumInsured.toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {submission.completenessScore}%
                          </div>
                          <div className="text-xs text-gray-500">Completeness</div>
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              submission.completenessScore >= 80
                                ? 'bg-green-600'
                                : submission.completenessScore >= 50
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }`}
                            style={{ width: `${submission.completenessScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {data?.total > filters.limit && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page * filters.limit >= data.total}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">{(filters.page - 1) * filters.limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(filters.page * filters.limit, data.total)}
                    </span>{' '}
                    of <span className="font-medium">{data.total}</span> results
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={filters.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={filters.page * filters.limit >= data.total}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
