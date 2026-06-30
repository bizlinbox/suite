'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/components/Toaster';
import {
  LuBuilding2 as Building2,
  LuLoader as Loader2,
  LuSave as Save,
  LuCalendar as Calendar,
  LuFingerprint as Fingerprint,
  LuGlobe as Globe,
  LuImage as ImageIcon,
  LuUpload as UploadIcon,
  LuToggleLeft as ToggleLeft,
  LuToggleRight as ToggleRight,
  LuEye as Eye,
  LuX as X,
} from 'react-icons/lu';

interface Organization {
  id: string;
  name: string;
  timezone: string;
  platform_name: string;
  platform_logo: string | null;
  enable_public_registration: boolean;
  created_at: string;
}

const TIMEZONES = [
  'UTC',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Chicago',
  'America/Denver',
  'America/Lima',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Phoenix',
  'America/Sao_Paulo',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Kolkata',
  'Asia/Manila',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Australia/Brisbane',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Europe/Berlin',
  'Europe/Brussels',
  'Europe/Budapest',
  'Europe/Copenhagen',
  'Europe/Dublin',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Prague',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Zurich',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'Pacific/Sydney',
];

export default function GeneralSettingsPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [platformName, setPlatformName] = useState('BizlInbox');
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);
  const [enablePublicRegistration, setEnablePublicRegistration] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchOrganization();
  }, [user]);

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations');
      const organization = res.data.organizations?.[0] as Organization | undefined;
      if (organization) {
        setOrg(organization);
        setName(organization.name);
        setTimezone(organization.timezone || 'UTC');
        setPlatformName(organization.platform_name || 'BizlInbox');
        setPlatformLogo(organization.platform_logo || null);
        setEnablePublicRegistration(organization.enable_public_registration ?? true);
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastError('Please upload an image file');
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPlatformLogo(res.data.url);
      toastSuccess('Logo uploaded');
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  }, []);

  const handleRemoveLogo = () => {
    setPlatformLogo(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!org) return;

    if (!name.trim()) {
      toastError('Organization name is required');
      return;
    }
    if (!platformName.trim()) {
      toastError('Platform name is required');
      return;
    }

    const payload = {
      name: name.trim(),
      timezone,
      platform_name: platformName.trim(),
      platform_logo: platformLogo,
      enable_public_registration: enablePublicRegistration,
    };

    const hasChanges =
      payload.name !== org.name ||
      payload.timezone !== org.timezone ||
      payload.platform_name !== org.platform_name ||
      payload.platform_logo !== org.platform_logo ||
      payload.enable_public_registration !== org.enable_public_registration;

    if (!hasChanges) {
      toastSuccess('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put(`/organizations/${org.id}`, payload);
      const updated = res.data.organization as Organization;
      setOrg(updated);
      setName(updated.name);
      setTimezone(updated.timezone || 'UTC');
      setPlatformName(updated.platform_name || 'BizlInbox');
      setPlatformLogo(updated.platform_logo || null);
      setEnablePublicRegistration(updated.enable_public_registration ?? true);
      toastSuccess('Settings saved');
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="panel p-8 text-center text-sm text-gray-400 dark:text-gray-500">
        Organization not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">General</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your organization details and platform preferences.</p>
      </div>

      {/* Organization Header Card */}
      <div className="panel overflow-hidden">
        <div className="relative h-20 bg-gradient-to-r from-primary-600 to-primary-500">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative -mt-8 px-6 pb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-gray-900">
              {platformName?.charAt(0)?.toUpperCase() || 'O'}
            </div>
            <div className="mb-1 flex-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{platformName}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{name}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        {/* Organization Details */}
        <div className="panel">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <Building2 size={16} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Organization Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="org-name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Organization Name
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="org-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="org-timezone" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Timezone
              </label>
              <div className="relative">
                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  id="org-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="input appearance-none pl-9"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Branding */}
        <div className="panel">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <ImageIcon size={16} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Platform Branding</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="platform-name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform Name
              </label>
              <input
                id="platform-name"
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform Logo
              </span>
              <div className="flex flex-wrap items-center gap-4">
                {platformLogo ? (
                  <div className="relative">
                    <img
                      src={platformLogo}
                      alt="Platform logo"
                      className="h-16 w-16 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                      title="Remove logo"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                    <ImageIcon size={24} className="text-gray-400" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                  />
                  <span className={`btn-secondary inline-flex items-center gap-1.5 text-sm ${logoUploading ? 'opacity-60' : ''}`}>
                    {logoUploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <UploadIcon size={14} />
                    )}
                    {logoUploading ? 'Uploading...' : 'Upload Logo'}
                  </span>
                </label>
              </div>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Recommended: 512x512 PNG or JPG. Max 10MB.
              </p>
            </div>
          </div>
        </div>

        {/* Access & Registration */}
        <div className="panel lg:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
              <Eye size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Access & Registration</h2>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  enablePublicRegistration
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {enablePublicRegistration ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {enablePublicRegistration ? 'Public registration enabled' : 'Public registration disabled'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {enablePublicRegistration
                    ? 'Anyone can create an account from the login page'
                    : 'The register link is hidden and registration is blocked'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEnablePublicRegistration((v) => !v)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                enablePublicRegistration ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
              }`}
              role="switch"
              aria-checked={enablePublicRegistration}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  enablePublicRegistration ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Read-only Info */}
        <div className="panel lg:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800">
              <Fingerprint size={16} className="text-gray-500 dark:text-gray-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Organization Info</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Organization ID
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Fingerprint size={14} className="shrink-0 text-gray-400" />
                <span className="truncate font-mono">{org.id}</span>
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Created At
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Calendar size={14} className="shrink-0 text-gray-400" />
                <span>
                  {new Date(org.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="lg:col-span-2">
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
  );
}
