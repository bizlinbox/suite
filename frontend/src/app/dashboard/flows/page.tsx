'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  Edit,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Send,
  Eye,
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TableLoading } from '@/components/Table';
import { api } from '@/lib/api';
import { useWaba } from '@/context/WabaContext';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/hooks/useAuth';

interface Flow {
  id: string;
  name: string;
  flowId: string;
  category: string;
  status: string;
  flowJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  wabaAccountId: string;
}

interface FlowSubmission {
  id: string;
  flowId: string | null;
  flowName?: string;
  conversationId: string;
  contactId: string;
  contactName: string;
  flowToken: string | null;
  responseJson: Record<string, unknown>;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

const statusBadgeClass: Record<string, string> = {
  DRAFT: 'badge-amber',
  PUBLISHED: 'badge-green',
  DEPRECATED: 'badge-gray',
  THROTTLED: 'badge-red',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FlowsPage() {
  const { selectedWabaId } = useWaba();
  const { user } = useAuth();
  const { can, loading: authLoading } = usePermission();
  const wabaAccounts = user?.wabaAccounts || [];

  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [dialogForm, setDialogForm] = useState({
    name: '',
    category: 'OTHER',
    flowJson: '{}',
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFlow, setPreviewFlow] = useState<Flow | null>(null);

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendingFlow, setSendingFlow] = useState<Flow | null>(null);
  const [sendForm, setSendForm] = useState({
    conversationId: '',
    body: '',
    header: '',
    footer: '',
    flowToken: '',
    screen: '',
    data: '',
  });
  const [conversations, setConversations] = useState<{ id: string; contactName: string }[]>([]);
  const [sendLoading, setSendLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'flows' | 'submissions'>('flows');
  const [submissions, setSubmissions] = useState<FlowSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionDetailOpen, setSubmissionDetailOpen] = useState(false);
  const [submissionDetail, setSubmissionDetail] = useState<FlowSubmission | null>(null);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/flows');
      setFlows(res.data.flows || []);
    } catch {
      setFlows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setSubmissionsLoading(true);
    try {
      const res = await api.get('/flows/submissions/all');
      setSubmissions(res.data.submissions || []);
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(
        (res.data.conversations || []).map((c: any) => ({
          id: c.id,
          contactName: c.contactName || 'Unknown',
        }))
      );
    } catch {
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
    fetchConversations();
  }, [fetchFlows, fetchConversations]);

  const handleSync = async () => {
    if (!selectedWabaId) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.post('/flows/sync', { waba_account_id: selectedWabaId });
      setSyncMessage({ type: 'success', text: `${res.data.count} flows synced` });
      await fetchFlows();
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.response?.data?.error || 'Failed to sync flows' });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const openEdit = (flow: Flow) => {
    setEditingFlow(flow);
    setDialogForm({
      name: flow.name,
      category: flow.category || 'OTHER',
      flowJson: JSON.stringify(flow.flowJson || {}, null, 2),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const parsedJson = JSON.parse(dialogForm.flowJson);
      if (editingFlow) {
        await api.put(`/flows/${editingFlow.id}`, {
          name: dialogForm.name,
          category: dialogForm.category,
          flowJson: parsedJson,
        });
      } else {
        await api.post('/flows', {
          name: dialogForm.name,
          category: dialogForm.category,
          flowJson: parsedJson,
          waba_account_id: selectedWabaId,
        });
      }
      setDialogOpen(false);
      fetchFlows();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to save flow');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this flow?')) return;
    try {
      await api.delete(`/flows/${id}`);
      fetchFlows();
    } catch {
      // ignore
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/flows/${id}/publish`);
      fetchFlows();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to publish flow');
    }
  };

  const openSend = (flow: Flow) => {
    setSendingFlow(flow);
    setSendForm({
      conversationId: '',
      body: `Please complete: ${flow.name}`,
      header: '',
      footer: '',
      flowToken: `flow-${Date.now()}`,
      screen: '',
      data: '',
    });
    setSendDialogOpen(true);
  };

  const handleSend = async () => {
    if (!sendingFlow || !sendForm.conversationId) return;
    setSendLoading(true);
    try {
      const payload: Record<string, unknown> = {
        conversation_id: sendForm.conversationId,
        body: sendForm.body,
        header: sendForm.header || undefined,
        footer: sendForm.footer || undefined,
        flow_token: sendForm.flowToken,
      };
      if (sendForm.screen) {
        payload.screen = sendForm.screen;
      }
      if (sendForm.data) {
        try {
          payload.data = JSON.parse(sendForm.data);
        } catch {
          alert('Flow data is not valid JSON');
          setSendLoading(false);
          return;
        }
      }
      await api.post(`/flows/${sendingFlow.id}/send`, payload);
      setSendDialogOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send flow');
    } finally {
      setSendLoading(false);
    }
  };

  const openPreview = (flow: Flow) => {
    setPreviewFlow(flow);
    setPreviewOpen(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (!can('settings.read')) {
    return (
      <div className="panel p-8 text-center text-sm text-gray-400 dark:text-gray-500">
        You do not have permission to view flows.
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Flows</h1>
          <p>Manage WhatsApp Flow forms synced from Meta</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing || !selectedWabaId}
            className="btn-secondary"
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sync
          </button>
        </div>
      </div>

      {syncMessage && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            syncMessage.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {syncMessage.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {syncMessage.text}
        </div>
      )}

      {!selectedWabaId && (
        <div className="panel flex flex-col items-center justify-center p-12 text-center">
          <Building2 size={48} className="mb-4 text-gray-400 dark:text-gray-500" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Please select a WABA account
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use the WABA dropdown in the sidebar to choose an account.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('flows')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'flows'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Flows ({flows.length})
        </button>
        <button
          onClick={() => { setActiveTab('submissions'); fetchSubmissions(); }}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'submissions'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Submissions ({submissions.length})
        </button>
      </div>

      {selectedWabaId && activeTab === 'flows' && (
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {flows.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>
                    <span className="badge badge-blue">{f.category || 'OTHER'}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`badge ${statusBadgeClass[f.status] || 'badge-gray'}`}>
                      {f.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(f.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openPreview(f)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        title="Preview JSON"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openSend(f)}
                        className="rounded-md p-1.5 text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                        title="Send"
                      >
                        <Send size={15} />
                      </button>
                      {f.status !== 'PUBLISHED' && (
                        <button
                          onClick={() => handlePublish(f.id)}
                          className="rounded-md p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                          title="Publish"
                        >
                          <Play size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(f)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        title="Edit"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {flows.length === 0 && !loading && <TableEmpty colSpan={5}>No flows yet. Sync from Meta or create one.</TableEmpty>}
              {loading && <TableLoading colSpan={5} />}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Flow</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.flowName || 'Unknown Flow'}</TableCell>
                  <TableCell>{s.contactName || 'Unknown'}</TableCell>
                  <TableCell>
                    <span className={`badge ${s.status === 'completed' ? 'badge-green' : s.status === 'failed' ? 'badge-red' : 'badge-amber'}`}>
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(s.completedAt || s.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => { setSubmissionDetail(s); setSubmissionDetailOpen(true); }}
                      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                      title="View submission"
                    >
                      <Eye size={15} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {submissions.length === 0 && !submissionsLoading && <TableEmpty colSpan={5}>No submissions yet. Send a flow and wait for responses.</TableEmpty>}
              {submissionsLoading && <TableLoading colSpan={5} />}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Submission Detail Dialog */}
      {submissionDetailOpen && submissionDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSubmissionDetailOpen(false); }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Submission from {submissionDetail.contactName}
              </h2>
              <button onClick={() => setSubmissionDetailOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <XCircle size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Flow: <span className="font-medium text-gray-700 dark:text-gray-300">{submissionDetail.flowName || 'Unknown'}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Status: <span className="font-medium text-gray-700 dark:text-gray-300">{submissionDetail.status}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Completed: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(submissionDetail.completedAt || submissionDetail.createdAt)}</span>
              </p>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs dark:bg-gray-800">
              {JSON.stringify(submissionDetail.responseJson || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingFlow ? 'Edit Flow' : 'Create Flow'}
              </h2>
              <button onClick={() => setDialogOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <XCircle size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  type="text"
                  value={dialogForm.name}
                  onChange={(e) => setDialogForm((p) => ({ ...p, name: e.target.value }))}
                  className="input w-full"
                  placeholder="e.g. Customer Feedback Form"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select
                  value={dialogForm.category}
                  onChange={(e) => setDialogForm((p) => ({ ...p, category: e.target.value }))}
                  className="input w-full"
                >
                  <option value="OTHER">Other</option>
                  <option value="SIGN_UP">Sign Up</option>
                  <option value="SIGN_IN">Sign In</option>
                  <option value="LEAD_GENERATION">Lead Generation</option>
                  <option value="BOOKING">Booking</option>
                  <option value="APPOINTMENT">Appointment</option>
                  <option value="FEEDBACK">Feedback</option>
                  <option value="SURVEY">Survey</option>
                  <option value="QUIZ">Quiz</option>
                  <option value="RESERVATION">Reservation</option>
                  <option value="ORDER">Order</option>
                  <option value="REGISTRATION">Registration</option>
                  <option value="TICKETING">Ticketing</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Flow JSON Definition
                </label>
                <textarea
                  value={dialogForm.flowJson}
                  onChange={(e) => setDialogForm((p) => ({ ...p, flowJson: e.target.value }))}
                  rows={12}
                  className="input w-full font-mono text-xs"
                  placeholder={`{\n  "version": "6.0",\n  "screens": [...]\n}`}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setDialogOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} className="btn-primary">
                  {editingFlow ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      {previewOpen && previewFlow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false); }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {previewFlow.name} — JSON
              </h2>
              <button onClick={() => setPreviewOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <XCircle size={20} />
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs dark:bg-gray-800">
              {JSON.stringify(previewFlow.flowJson || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Send Dialog */}
      {sendDialogOpen && sendingFlow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSendDialogOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Send Flow: {sendingFlow.name}
              </h2>
              <button onClick={() => setSendDialogOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <XCircle size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Conversation</label>
                <select
                  value={sendForm.conversationId}
                  onChange={(e) => setSendForm((p) => ({ ...p, conversationId: e.target.value }))}
                  className="input w-full"
                >
                  <option value="">Select conversation...</option>
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>{c.contactName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Header (optional)</label>
                <input
                  type="text"
                  value={sendForm.header}
                  onChange={(e) => setSendForm((p) => ({ ...p, header: e.target.value }))}
                  className="input w-full"
                  placeholder="Form header..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Body</label>
                <textarea
                  value={sendForm.body}
                  onChange={(e) => setSendForm((p) => ({ ...p, body: e.target.value }))}
                  rows={2}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Footer (optional)</label>
                <input
                  type="text"
                  value={sendForm.footer}
                  onChange={(e) => setSendForm((p) => ({ ...p, footer: e.target.value }))}
                  className="input w-full"
                  placeholder="Powered by BizlInbox"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Flow Token</label>
                <input
                  type="text"
                  value={sendForm.flowToken}
                  onChange={(e) => setSendForm((p) => ({ ...p, flowToken: e.target.value }))}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Screen (optional)</label>
                <input
                  type="text"
                  value={sendForm.screen}
                  onChange={(e) => setSendForm((p) => ({ ...p, screen: e.target.value }))}
                  className="input w-full"
                  placeholder="e.g. SIGN_UP"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Screen Data (optional)</label>
                <textarea
                  value={sendForm.data}
                  onChange={(e) => setSendForm((p) => ({ ...p, data: e.target.value }))}
                  rows={3}
                  className="input w-full font-mono text-xs"
                  placeholder='{"key": "value"}'
                />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setSendDialogOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSend} disabled={!sendForm.conversationId || sendLoading} className="btn-primary">
                  {sendLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send Flow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
