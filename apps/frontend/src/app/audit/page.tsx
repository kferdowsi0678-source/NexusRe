'use client';
import { useState } from 'react';
import { useAuditLogs } from '@/lib/audit-api';

export default function AuditPage() {
  const [filters, setFilters] = useState({ resourceType: '', action: '', startDate: '', endDate: '' });
  const { data: logs, isLoading, refetch } = useAuditLogs(filters);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-4 gap-4">
          <select value={filters.resourceType} onChange={(e) => setFilters({...filters, resourceType: e.target.value})} className="rounded-md border-gray-300">
            <option value="">All Resources</option>
            <option value="user">User</option>
            <option value="submission">Submission</option>
            <option value="quote">Quote</option>
          </select>
          <select value={filters.action} onChange={(e) => setFilters({...filters, action: e.target.value})} className="rounded-md border-gray-300">
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
          <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="rounded-md border-gray-300" />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="rounded-md border-gray-300" />
        </div>
        <button onClick={() => refetch()} className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white">Search</button>
      </div>
      {isLoading ? <p>Loading...</p> : !logs?.length ? <p className="text-gray-500">No entries</p> : (
        <ul className="space-y-3">
          {logs.map(entry => (
            <li key={entry.id} className="rounded-lg bg-white p-4 shadow">
              <div className="flex gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{entry.action}</span>
                <span className="text-sm font-medium">{entry.resourceType}</span>
                <span className="text-xs text-gray-500">{entry.resourceId}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
