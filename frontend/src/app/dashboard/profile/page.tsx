'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/components/Toaster';
import {
  LuUser as User,
  LuMail as Mail,
  LuLock as Lock,
  LuLoader as Loader2,
  LuSave as Save,
  LuShield as Shield,
  LuBuilding2 as Building2,
  LuCircleCheck as CheckCircle2,
  LuEye as Eye,
  LuEyeOff as EyeOff,
} from 'react-icons/lu';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      toastError('New passwords do not match');
      return;
    }

    if (newPassword && newPassword.length < 8) {
      toastError('New password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (name !== user?.name) payload.name = name;
      if (email !== user?.email) payload.email = email;
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        toastSuccess('No changes to save');
        setSaving(false);
        return;
      }

      await api.patch('/auth/me', payload);
      toastSuccess('Profile updated');
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  const roleLabel = user.role === 'admin' ? 'Administrator' : user.role === 'agent' ? 'Agent' : user.role;
  const roleColor = user.role === 'admin'
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';

  return (
    <div className="mx-auto max-w-3xl">
      {/* Profile Header Card */}
      <div className="panel mb-6 overflow-hidden">
        <div className="relative h-24 bg-gradient-to-r from-primary-600 to-primary-500">
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative -mt-10 px-6 pb-6">
          <div className="flex items-end gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-600 text-2xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-gray-900">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="mb-1 flex-1">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{user.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{user.email}</span>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleColor}`}>
              {roleLabel}
            </span>
          </div>

          {user.wabaAccounts && user.wabaAccounts.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {user.wabaAccounts.map((waba) => (
                <span
                  key={waba.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <Building2 size={12} />
                  {waba.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Info */}
        <div className="panel">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <User size={16} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Account Information</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Security */}
        <div className="panel">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Shield size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Security</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pl-9 pr-10"
                  placeholder="Required to change password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pl-9 pr-10"
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-9 pr-10"
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Passwords do not match
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 size={12} />
                  Passwords match
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || (!!newPassword && (newPassword.length < 8 || newPassword !== confirmPassword))}
                className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Lock size={16} />
                )}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
