'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useWaba } from '@/context/WabaContext';
import { usePermission } from '@/hooks/usePermission';
import {
  LuPlus as Plus,
  LuPlay as Play,
  LuPause as Pause,
  LuPencil as Pencil,
  LuTrash2 as Trash2,
  LuX as X,
  LuBuilding2 as Building2,
  LuRefreshCw as RefreshCw,
  LuLoader as Loader2,
  LuCircleCheck as CheckCircle2,
  LuCircleX as XCircle,
} from 'react-icons/lu';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableLoading, TableEmpty } from '@/components/Table';

interface Campaign {
  id: string;
  name: string;
  messageType: 'utility' | 'marketing';
  content: string;
  templateName: string | null;
  templateVariables: string[];
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
}

type MessageTypeFilter = 'all' | 'utility' | 'marketing';
type StatusFilter = Campaign['status'] | null;

const statusOrder: Campaign['status'][] = [
  'draft',
  'scheduled',
  'running',
  'paused',
  'completed',
  'cancelled',
];

const statusBadgeClass: Record<Campaign['status'], string> = {
  draft: 'badge-gray',
  scheduled: 'badge-amber',
  running: 'badge-green',
  paused: 'badge-amber',
  completed: 'badge-blue',
  cancelled: 'badge-red',
};

const typeBadgeClass: Record<Campaign['messageType'], string> = {
  utility: 'badge-blue',
  marketing: 'badge-purple',
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

function RunningDot() {
  return (
    <span className="relative mr-1.5 inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
    </span>
  );
}

export default function CampaignsPage() {
  const router = useRouter();
  const { selectedWabaId } = useWaba();
  const { can } = usePermission();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<MessageTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [refreshingTemplates, setRefreshingTemplates] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await api.get('/campaigns');
      setCampaigns(res.data.campaigns || []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchCampaigns]);

  const handleAction = async (id: string, action: string) => {
    try {
      await api.post(`/campaigns/${id}/${action}`);
      fetchCampaigns();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.delete(`/campaigns/${id}`);
      fetchCampaigns();
    } catch {
      // ignore
    }
  };

  const handleRefreshTemplates = async () => {
    if (!selectedWabaId) return;
    setRefreshingTemplates(true);
    setRefreshMessage(null);
    try {
      const res = await api.post('/templates/refresh', { waba_account_id: selectedWabaId });
      setRefreshMessage({ type: 'success', text: `Templates refreshed: ${res.data.count} synced` });
    } catch (err: any) {
      setRefreshMessage({ type: 'error', text: err.response?.data?.error || 'Failed to refresh templates' });
    } finally {
      setRefreshingTemplates(false);
      setTimeout(() => setRefreshMessage(null), 4000);
    }
  };

  const filtered = campaigns.filter((c) => {
    if (typeFilter !== 'all' && c.messageType !== typeFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  if (!selectedWabaId) {
    return (
      <div className="panel flex flex-col items-center justify-center p-12 text-center">
        <Building2 size={48} className="mb-4 text-gray-400 dark:text-gray-500" />
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Please select a WABA account
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Use the WABA dropdown in the top navigation to choose an account.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage and monitor your messaging campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshTemplates}
            disabled={refreshingTemplates}
            className="btn-secondary"
          >
            {refreshingTemplates ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh Templates
          </button>
          {can('campaigns.manage') && (
            <Link
              href="/dashboard/campaigns/new"
              className="btn-primary"
            >
              <Plus size={16} />
              New Campaign
            </Link>
          )}
        </div>
      </div>

      {refreshMessage && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            refreshMessage.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {refreshMessage.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {refreshMessage.text}
        </div>
      )}

      {/* Type Tabs */}
      <div className="mb-4 flex gap-2">
        {(['all', 'utility', 'marketing'] as MessageTypeFilter[]).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
              typeFilter === t
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Status Chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter(null)}
          className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
            statusFilter === null
              ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          All Status
        </button>
        {statusOrder.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === statusFilter ? null : s)}
            className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Scheduled At</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {loading && <TableLoading colSpan={7} />}
            {!loading && filtered.length === 0 && <TableEmpty colSpan={7}>No campaigns found</TableEmpty>}
            {filtered.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
              >
                <TableCell>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {c.name}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={typeBadgeClass[c.messageType]}>
                    {c.messageType}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={statusBadgeClass[c.status]}>
                    {c.status === 'running' && <RunningDot />}
                    {c.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-gray-900 dark:text-gray-100">
                    {c.sentCount}/{c.totalRecipients} sent
                  </div>
                  {(c.status === 'running' || c.status === 'paused' || c.status === 'completed') && (
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-md bg-primary-600 dark:bg-primary-500 transition-all"
                        style={{ width: `${c.totalRecipients > 0 ? (c.sentCount / c.totalRecipients) * 100 : 0}%` }}
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {formatDate(c.scheduledAt)}
                </TableCell>
                <TableCell>
                  {formatDate(c.createdAt)}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  {can('campaigns.manage') && (
                    <div className="flex items-center justify-end gap-1">
                      {c.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleAction(c.id, 'start')}
                            className="rounded-md p-1 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                            title="Start"
                          >
                            <Play size={16} />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
                            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {c.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handleAction(c.id, 'start')}
                            className="rounded-md p-1 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                            title="Start now"
                          >
                            <Play size={16} />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
                            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleAction(c.id, 'cancel')}
                            className="rounded-md p-1 text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {c.status === 'running' && (
                        <>
                          <button
                            onClick={() => handleAction(c.id, 'pause')}
                            className="rounded-md p-1 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                            title="Pause"
                          >
                            <Pause size={16} />
                          </button>
                          <button
                            onClick={() => handleAction(c.id, 'cancel')}
                            className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      {c.status === 'paused' && (
                        <>
                          <button
                            onClick={() => handleAction(c.id, 'resume')}
                            className="rounded-md p-1 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                            title="Resume"
                          >
                            <Play size={16} />
                          </button>
                          <button
                            onClick={() => handleAction(c.id, 'cancel')}
                            className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      {(c.status === 'completed' || c.status === 'cancelled') && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
