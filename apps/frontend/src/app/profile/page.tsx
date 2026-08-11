'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useCurrentUser } from '@/lib/auth-api';
import { useUpdateUser } from '@/lib/admin-api';
import {
  EMAIL_PREFERENCE_LABELS,
  EmailPreferenceKey,
  useEmailPreferences,
  useUpdateEmailPreferences,
} from '@/lib/email-preferences-api';

export default function ProfilePage() {
  const { user, updateUser: updateStoredUser } = useAuthStore();
  const { data: profile } = useCurrentUser();
  const updateUser = useUpdateUser();
  const { data: emailPrefs, isLoading: prefsLoading } = useEmailPreferences();
  const updateEmailPrefs = useUpdateEmailPreferences();

  const [details, setDetails] = useState({ firstName: '', lastName: '', phone: '' });
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const source = profile || user;
    if (source) {
      setDetails({
        firstName: source.firstName || '',
        lastName: source.lastName || '',
        phone: (source as any).phone || '',
      });
    }
  }, [profile, user]);

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!user?.id) return;
    try {
      await updateUser.mutateAsync({ id: user.id, data: details });
      updateStoredUser({ firstName: details.firstName, lastName: details.lastName });
      setMessage('Profile updated.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (passwords.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!user?.id) return;
    try {
      await updateUser.mutateAsync({ id: user.id, data: { password: passwords.newPassword } });
      setPasswords({ newPassword: '', confirmPassword: '' });
      setMessage('Password updated.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password.');
    }
  };

  const inputClass =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
      </div>

      {message && <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">{message}</div>}
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <form onSubmit={saveDetails} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900">Personal details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First name</label>
            <input id="firstName" value={details.firstName}
              onChange={(e) => setDetails({ ...details, firstName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last name</label>
            <input id="lastName" value={details.lastName}
              onChange={(e) => setDetails({ ...details, lastName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
            <input id="phone" value={details.phone}
              onChange={(e) => setDetails({ ...details, phone: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={updateUser.isPending}
            className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            Save changes
          </button>
        </div>
      </form>

      <form onSubmit={savePassword} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900">Change password</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New password</label>
            <input id="newPassword" type="password" value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              placeholder="Min. 8 characters" className={inputClass} />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm password</label>
            <input id="confirmPassword" type="password" value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={updateUser.isPending}
            className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            Update password
          </button>
        </div>
      </form>

      <section className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Email notifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            In-app notifications are always on. These control email only, and each
            change saves immediately.
          </p>
        </div>

        {prefsLoading ? (
          <p className="text-sm text-gray-500">Loading preferences...</p>
        ) : !emailPrefs ? (
          <p className="text-sm text-gray-500">Preferences are unavailable right now.</p>
        ) : (
          <ul className="space-y-3">
            {EMAIL_PREFERENCE_LABELS.map(({ key, label }) => (
              <li key={key}>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={emailPrefs[key]}
                    disabled={updateEmailPrefs.isPending}
                    onChange={(e) =>
                      updateEmailPrefs.mutate({ [key as EmailPreferenceKey]: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900">Roles</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {user?.roles?.map((role: any) => (
            <li key={role.id || role.name}
              className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium capitalize text-indigo-800">
              {String(role.name).replace(/_/g, ' ')}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
