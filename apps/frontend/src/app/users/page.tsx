'use client';

import { useState } from 'react';
import { useCreateUser, useOrganizations, useRoles, useUpdateUser, useUsers } from '@/lib/admin-api';

const emptyForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  organizationId: '',
  roleIds: [] as string[],
};

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const { data: organizations } = useOrganizations();
  const { data: roles } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const toggleRole = (roleId: string) =>
    setForm((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.organizationId) {
      setError('Select an organization.');
      return;
    }
    try {
      await createUser.mutateAsync({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        organizationId: form.organizationId,
        roleIds: form.roleIds.length ? form.roleIds : undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage platform users and their roles</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          {showForm ? 'Close' : 'New user'}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-lg bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First name <span className="text-red-600">*</span>
              </label>
              <input id="firstName" name="firstName" required value={form.firstName} onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last name <span className="text-red-600">*</span>
              </label>
              <input id="lastName" name="lastName" required value={form.lastName} onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-600">*</span>
              </label>
              <input id="email" name="email" type="email" required value={form.email} onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Temporary password <span className="text-red-600">*</span>
              </label>
              <input id="password" name="password" type="password" required minLength={8} value={form.password} onChange={handleChange}
                placeholder="Min. 8 characters"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700">
                Organization <span className="text-red-600">*</span>
              </label>
              <select id="organizationId" name="organizationId" required value={form.organizationId} onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option value="">Select an organization</option>
                {organizations?.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-gray-700">Roles</legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {roles?.map((role) => (
                <label key={role.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm capitalize text-gray-700">{role.name.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end">
            <button type="submit" disabled={createUser.isPending}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
              {createUser.isPending ? 'Creating...' : 'Create user'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading users...</p>
        ) : !users?.length ? (
          <p className="p-6 text-sm text-gray-500">No users found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Roles</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 text-sm capitalize text-gray-500">
                    {user.roles?.map((r) => r.name.replace(/_/g, ' ')).join(', ') || '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button type="button"
                      onClick={() => updateUser.mutate({ id: user.id, data: { isActive: !user.isActive } })}
                      className="font-medium text-indigo-600 hover:text-indigo-500">
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
