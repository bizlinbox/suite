'use client';

import { useEffect, useState } from 'react';
import { Edit, Trash2, Plug, CheckCircle2, XCircle, Loader2, Copy, Link as LinkIcon, Radio, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';

interface WabaAccount {
  id: string;
  name: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  isActive: boolean;
  createdAt: string;
}

interface WebhookConfig {
  callbackUrl: string;
  verifyToken: string;
}

export default function WabaAccountsPage() {
  const { can, loading: authLoading } = usePermission();
  const canManageSettings = can('settings.manage');

  const [wabaAccounts, setWabaAccounts] = useState<WabaAccount[]>([]);
  const [wabaDialogOpen, setWabaDialogOpen] = useState(false);
  const [editingWaba, setEditingWaba] = useState<WabaAccount | null>(null);
  const [wabaForm, setWabaForm] = useState({
    name: '',
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    isActive: true,
  });
  const [testingWabaId, setTestingWabaId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [dialogTestResult, setDialogTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dialogTesting, setDialogTesting] = useState(false);

  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [subscribeResult, setSubscribeResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedWabaId, setExpandedWabaId] = useState<string | null>(null);
  const [webhookConfigs, setWebhookConfigs] = useState<Record<string, WebhookConfig>>({});
  const [webhookConfigLoading, setWebhookConfigLoading] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWabaAccounts();
  }, []);

  const fetchWabaAccounts = async () => {
    try {
      const res = await api.get('/waba-accounts');
      setWabaAccounts(res.data.wabaAccounts || []);
    } catch {
      // ignore
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  };

  const fetchWebhookConfig = async (id: string) => {
    setWebhookConfigLoading(id);
    try {
      const res = await api.get(`/waba-accounts/${id}/webhook-config`);
      setWebhookConfigs((prev) => ({ ...prev, [id]: res.data }));
    } catch {
      // ignore
    } finally {
      setWebhookConfigLoading(null);
    }
  };

  const toggleExpandWaba = (id: string) => {
    if (expandedWabaId === id) {
      setExpandedWabaId(null);
    } else {
      setExpandedWabaId(id);
      if (!webhookConfigs[id]) {
        fetchWebhookConfig(id);
      }
    }
  };

  const handleSubscribe = async (id: string) => {
    setSubscribingId(id);
    setSubscribeResult(null);
    try {
      const res = await api.post(`/waba-accounts/${id}/subscribe`);
      setSubscribeResult({ id, success: true, message: res.data.message || 'Subscribed' });
      // Refresh webhook config after successful subscribe (callbackUrl may be returned)
      if (res.data.callbackUrl) {
        setWebhookConfigs((prev) => ({
          ...prev,
          [id]: { ...prev[id], callbackUrl: res.data.callbackUrl },
        }));
      }
    } catch (err: any) {
      setSubscribeResult({
        id,
        success: false,
        message: err.response?.data?.message || err.response?.data?.error || 'Subscription failed',
      });
    } finally {
      setSubscribingId(null);
    }
  };

  const handleWabaSubmit = async () => {
    try {
      const payload = {
        name: wabaForm.name,
        phone_number_id: wabaForm.phoneNumberId,
        business_account_id: wabaForm.businessAccountId,
        access_token: wabaForm.accessToken,
        is_active: wabaForm.isActive,
      };
      if (editingWaba) {
        await api.put(`/waba-accounts/${editingWaba.id}`, payload);
      } else {
        await api.post('/waba-accounts', payload);
      }
      fetchWabaAccounts();
    } catch {
      // ignore
    } finally {
      setWabaDialogOpen(false);
      setEditingWaba(null);
      setWabaForm({ name: '', phoneNumberId: '', businessAccountId: '', accessToken: '', isActive: true });
    }
  };

  const handleDeleteWaba = async (id: string) => {
    if (!confirm('Delete this WABA account? This will also remove agent access.')) return;
    try {
      await api.delete(`/waba-accounts/${id}`);
      fetchWabaAccounts();
    } catch {
      // ignore
    }
  };

  const handleToggleActive = async (id: string, nextActive: boolean) => {
    setTogglingId(id);
    try {
      await api.put(`/waba-accounts/${id}`, { is_active: nextActive });
      fetchWabaAccounts();
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
    }
  };

  const handleEditWaba = (w: WabaAccount) => {
    setEditingWaba(w);
    setWabaForm({
      name: w.name || '',
      phoneNumberId: w.phoneNumberId || '',
      businessAccountId: w.businessAccountId || '',
      accessToken: '',
      isActive: w.isActive,
    });
    setDialogTestResult(null);
    setWabaDialogOpen(true);
  };

  const handleAddWaba = () => {
    setEditingWaba(null);
    setWabaForm({ name: '', phoneNumberId: '', businessAccountId: '', accessToken: '', isActive: true });
    setDialogTestResult(null);
    setWabaDialogOpen(true);
  };

  const handleTestWaba = async (id: string) => {
    setTestingWabaId(id);
    setTestResult(null);
    try {
      const res = await api.post(`/waba-accounts/${id}/test`);
      setTestResult({ id, success: res.data.success, message: res.data.message });
    } catch (err: any) {
      setTestResult({
        id,
        success: false,
        message: err.response?.data?.error || 'Connection test failed',
      });
    } finally {
      setTestingWabaId(null);
    }
  };

  const handleDialogTest = async () => {
    if (!wabaForm.businessAccountId || !wabaForm.accessToken) {
      setDialogTestResult({ success: false, message: 'Business Account ID and Access Token are required' });
      return;
    }
    setDialogTesting(true);
    setDialogTestResult(null);
    try {
      if (editingWaba) {
        const res = await api.post(`/waba-accounts/${editingWaba.id}/test`);
        setDialogTestResult({ success: res.data.success, message: res.data.message });
      } else {
        const res = await api.post('/waba-accounts/test', {
          business_account_id: wabaForm.businessAccountId,
          access_token: wabaForm.accessToken,
        });
        setDialogTestResult({ success: res.data.success, message: res.data.message });
      }
    } catch (err: any) {
      setDialogTestResult({
        success: false,
        message: err.response?.data?.error || 'Connection test failed',
      });
    } finally {
      setDialogTesting(false);
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
        You do not have permission to manage WABA accounts.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <button onClick={handleAddWaba} className="btn-primary">
          <Plus size={16} />
          Add WABA Account
        </button>
      </div>

      <div className="panel overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone Number ID</th>
              <th>Business Account ID</th>
              <th>Status</th>
              <th>Connection</th>
              <th className="w-40 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {wabaAccounts.map((waba) => (
              <>
                <tr key={waba.id}>
                  <td className="font-medium text-gray-900 dark:text-gray-100">{waba.name}</td>
                  <td className="font-mono text-xs text-gray-500 dark:text-gray-400">{waba.phoneNumberId}</td>
                  <td className="font-mono text-xs text-gray-500 dark:text-gray-400">{waba.businessAccountId}</td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(waba.id, !waba.isActive)}
                      disabled={togglingId === waba.id}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                        waba.isActive
                          ? 'bg-primary-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      } ${togglingId === waba.id ? 'opacity-50' : ''}`}
                      title={waba.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-150 ${
                          waba.isActive ? 'translate-x-[18px]' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestWaba(waba.id)}
                        disabled={testingWabaId === waba.id}
                        className="btn-secondary px-2.5 py-1.5 text-xs"
                      >
                        {testingWabaId === waba.id ? <Loader2 size={12} className="animate-spin" /> : <Plug size={12} />}
                        Test
                      </button>
                      {testResult?.id === waba.id && (
                        <span className={`text-xs font-medium ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {testResult.message}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleExpandWaba(waba.id)}
                        className={`rounded-md p-1.5 text-xs font-medium transition-colors ${
                          expandedWabaId === waba.id
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                        title="Webhook config"
                      >
                        <LinkIcon size={15} />
                      </button>
                      <button
                        onClick={() => handleSubscribe(waba.id)}
                        disabled={subscribingId === waba.id}
                        className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 disabled:opacity-50"
                        title="Subscribe to Meta webhooks"
                      >
                        {subscribingId === waba.id ? <Loader2 size={15} className="animate-spin" /> : <Radio size={15} />}
                      </button>
                      {subscribeResult?.id === waba.id && (
                        <span className={`text-xs font-medium ${subscribeResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {subscribeResult.message}
                        </span>
                      )}
                      <button onClick={() => handleEditWaba(waba)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800" aria-label="Edit">
                        <Edit size={15} />
                      </button>
                      <button onClick={() => handleDeleteWaba(waba.id)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedWabaId === waba.id && (
                  <tr className="bg-gray-50/70 dark:bg-gray-800/40">
                    <td colSpan={6} className="px-4 py-5">
                      <div className="mb-3 flex items-center gap-2">
                        <Radio size={14} className="text-primary-600 dark:text-primary-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">Meta Webhook Configuration</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-500">Paste into Meta App Dashboard</span>
                      </div>
                      {webhookConfigLoading === waba.id ? (
                        <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
                          <Loader2 size={14} className="animate-spin" />
                          Loading webhook config...
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Callback URL</label>
                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                              <LinkIcon size={14} className="shrink-0 text-gray-400" />
                              <code className="truncate text-xs font-mono text-gray-700 dark:text-gray-300">{webhookConfigs[waba.id]?.callbackUrl || '—'}</code>
                              <button
                                onClick={() => webhookConfigs[waba.id]?.callbackUrl && handleCopy(webhookConfigs[waba.id].callbackUrl, `url-${waba.id}`)}
                                className="ml-auto rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                                title="Copy URL"
                                disabled={!webhookConfigs[waba.id]?.callbackUrl}
                              >
                                {copiedField === `url-${waba.id}` ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Verify Token</label>
                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                              <span className="shrink-0 text-[10px] font-medium text-gray-400">TOKEN</span>
                              <code className="truncate text-xs font-mono text-gray-700 dark:text-gray-300">{webhookConfigs[waba.id]?.verifyToken || waba.webhookVerifyToken || 'Not generated'}</code>
                              <button
                                onClick={() => {
                                  const token = webhookConfigs[waba.id]?.verifyToken || waba.webhookVerifyToken;
                                  token && handleCopy(token, `token-${waba.id}`);
                                }}
                                className="ml-auto rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                                title="Copy token"
                                disabled={!webhookConfigs[waba.id]?.verifyToken && !waba.webhookVerifyToken}
                              >
                                {copiedField === `token-${waba.id}` ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {wabaAccounts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400 dark:text-gray-500">
                  No WABA accounts configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={wabaDialogOpen} onClose={() => { setWabaDialogOpen(false); setEditingWaba(null); setDialogTestResult(null); }} title={editingWaba ? 'Edit WABA Account' : 'Add WABA Account'}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Name <span className="text-red-500">*</span></label>
            <input type="text" value={wabaForm.name} onChange={(e) => setWabaForm({ ...wabaForm, name: e.target.value })} placeholder="e.g. Main Business Account" required className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number ID <span className="text-red-500">*</span></label>
            <input type="text" value={wabaForm.phoneNumberId} onChange={(e) => setWabaForm({ ...wabaForm, phoneNumberId: e.target.value })} placeholder="From Meta Developer Dashboard" required className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Business Account ID <span className="text-red-500">*</span></label>
            <input type="text" value={wabaForm.businessAccountId} onChange={(e) => setWabaForm({ ...wabaForm, businessAccountId: e.target.value })} placeholder="From Meta Business Manager" required className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Access Token <span className="text-red-500">*</span></label>
            <input type="password" value={wabaForm.accessToken} onChange={(e) => setWabaForm({ ...wabaForm, accessToken: e.target.value })} placeholder="Permanent token from Meta" required={!editingWaba} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select value={wabaForm.isActive ? 'true' : 'false'} onChange={(e) => setWabaForm({ ...wabaForm, isActive: e.target.value === 'true' })} className="input">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {editingWaba && (
            <div className="flex items-center gap-2">
              <button onClick={handleDialogTest} disabled={dialogTesting} className="btn-secondary">
                {dialogTesting ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
                Test Connection
              </button>
              {dialogTestResult && (
                <span className={`text-xs font-medium ${dialogTestResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {dialogTestResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {dialogTestResult.message}
                </span>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setWabaDialogOpen(false); setEditingWaba(null); setDialogTestResult(null); }} className="btn-secondary">Cancel</button>
            <button
              onClick={handleWabaSubmit}
              disabled={!wabaForm.name || !wabaForm.phoneNumberId || !wabaForm.businessAccountId || (!editingWaba && !wabaForm.accessToken)}
              className="btn-primary"
            >
              {editingWaba ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {children}
      </div>
    </div>
  );
}
