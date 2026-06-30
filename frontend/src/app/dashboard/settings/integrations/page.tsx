'use client';

import { useEffect, useState } from 'react';
import {
  LuPlus as Plus,
  LuPenLine as Edit,
  LuTrash2 as Trash2,
  LuLoader as Loader2,
  LuWebhook as WebhookIcon,
  LuLink as LinkIcon,
  LuToggleLeft as ToggleLeft,
  LuToggleRight as ToggleRight,
  LuX as X,
  LuSave as Save,
} from 'react-icons/lu';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { toastError, toastSuccess } from '@/components/Toaster';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/Table';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Integration {
  id: string;
  orgId: string;
  type: string;
  name: string;
  config: {
    urls?: string[];
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function IntegrationsPage() {
  const { can, loading: authLoading } = usePermission();
  const canManageSettings = can('settings.manage');

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/integrations');
      setIntegrations(res.data.integrations || []);
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setUrls(['']);
    setIsActive(true);
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: Integration) => {
    setEditing(item);
    setName(item.name);
    setUrls(item.config?.urls?.length ? item.config.urls : ['']);
    setIsActive(item.isActive);
    setDialogOpen(true);
  };

  const handleAddUrl = () => {
    setUrls((prev) => [...prev, '']);
  };

  const handleRemoveUrl = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUrlChange = (index: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  };

  const validate = () => {
    if (!name.trim()) {
      toastError('Name is required');
      return false;
    }
    const validUrls = urls.map((u) => u.trim()).filter((u) => u.length > 0);
    if (validUrls.length === 0) {
      toastError('At least one URL is required');
      return false;
    }
    for (const url of validUrls) {
      try {
        new URL(url);
      } catch {
        toastError(`Invalid URL: ${url}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      type: 'webhook_forward',
      name: name.trim(),
      config: { urls: urls.map((u) => u.trim()).filter((u) => u.length > 0) },
      is_active: isActive,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/integrations/${editing.id}`, payload);
        toastSuccess('Integration updated');
      } else {
        await api.post('/integrations', payload);
        toastSuccess('Integration created');
      }
      setDialogOpen(false);
      resetForm();
      fetchIntegrations();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to save integration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: Integration) => {
    try {
      await api.put(`/integrations/${item.id}`, {
        is_active: !item.isActive,
      });
      setIntegrations((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isActive: !i.isActive } : i))
      );
      toastSuccess(item.isActive ? 'Integration disabled' : 'Integration enabled');
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to update integration');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/integrations/${deleteId}`);
      toastSuccess('Integration deleted');
      fetchIntegrations();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to delete integration');
    } finally {
      setDeleteId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (!canManageSettings) {
    return (
      <div className="panel p-8 text-center text-sm text-gray-400 dark:text-gray-500">
        You do not have permission to manage integrations.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Integrations</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Configure webhook forwarding to send raw WhatsApp webhook payloads to external services.
            </p>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} />
            Add Integration
          </button>
        </div>

        <div className="panel overflow-hidden p-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Name</TableHead>
                <TableHead>URLs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <td colSpan={4} className="py-10 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Loading integrations...
                    </div>
                  </td>
                </TableRow>
              )}
              {!loading && integrations.length === 0 && (
                <TableEmpty colSpan={4}>No integrations configured yet</TableEmpty>
              )}
              {!loading &&
                integrations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                          <WebhookIcon size={16} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {(item.config?.urls || []).map((url, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <LinkIcon size={12} className="shrink-0 text-gray-400" />
                            <span className="truncate max-w-xs" title={url}>
                              {url}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(item)}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                        title={item.isActive ? 'Active' : 'Inactive'}
                      >
                        {item.isActive ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-green-700 dark:text-green-400">Active</span>
                          </>
                        ) : (
                          <>
                            <span className="h-2 w-2 rounded-full bg-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Inactive</span>
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          aria-label="Edit"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          aria-label="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editing ? 'Edit Integration' : 'Add Integration'}
              </h3>
              <button
                onClick={() => { setDialogOpen(false); resetForm(); }}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CRM Webhook"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Forward URLs
                </label>
                <div className="space-y-2">
                  {urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        placeholder="https://example.com/webhook"
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      />
                      {urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUrl(index)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddUrl}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  <Plus size={14} />
                  Add another URL
                </button>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  style={{ backgroundColor: isActive ? '#22c55e' : '#d1d5db' }}
                  role="switch"
                  aria-checked={isActive}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setDialogOpen(false); resetForm(); }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary inline-flex items-center gap-1 disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  <Save size={14} />
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Integration"
        message="Are you sure you want to delete this integration? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
