'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import Link from 'next/link';
import {
  Play,
  Pause,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  Users,
  Send,
  MailCheck,
  Eye,
  AlertCircle,
  Megaphone,
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/Table';

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

interface CampaignRecipient {
  id: string;
  phone: string;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: string | null;
  error: string | null;
}

const statusBadgeStyles: Record<Campaign['status'], string> = {
  draft:
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  scheduled:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  running:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  paused:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  completed:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const recipientStatusBadgeStyles: Record<CampaignRecipient['status'], string> = {
  pending:
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  queued:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  sent:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delivered:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  read:
    'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  failed:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
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

const PAGE_SIZE = 20;

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { can } = usePermission();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [recipientsPage, setRecipientsPage] = useState(1);
  const [recipientsTotal, setRecipientsTotal] = useState(0);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await api.get(`/campaigns/${id}`);
      setCampaign(res.data.campaign || res.data);
    } catch {
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRecipients = useCallback(async () => {
    try {
      const res = await api.get(`/campaigns/${id}/recipients`, {
        params: { page: recipientsPage, limit: PAGE_SIZE },
      });
      setRecipients(res.data.recipients || []);
      setRecipientsTotal(res.data.total || 0);
    } catch {
      setRecipients([]);
      setRecipientsTotal(0);
    }
  }, [id, recipientsPage]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const handleAction = async (action: string) => {
    try {
      await api.post(`/campaigns/${id}/${action}`);
      fetchCampaign();
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.delete(`/campaigns/${id}`);
      router.push('/dashboard/campaigns');
    } catch {
      // ignore
    }
  };

  const totalPages = Math.max(1, Math.ceil(recipientsTotal / PAGE_SIZE));

  const deliveryRate = campaign
    ? campaign.totalRecipients > 0
      ? ((campaign.deliveredCount + campaign.readCount) / campaign.totalRecipients) * 100
      : 0
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Campaign not found.</p>
        <Link
          href="/dashboard/campaigns"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-700 dark:text-primary-400 hover:underline"
        >
          <ChevronLeft size={16} />
          Back to Campaigns
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/campaigns"
            className="rounded-md p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {campaign.name}
              </h1>
              <span
                className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium ${statusBadgeStyles[campaign.status]}`}
              >
                {campaign.status === 'running' && <RunningDot />}
                {campaign.status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Created {formatDate(campaign.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {can('campaigns.manage') && (
            <>
              {campaign.status === 'draft' && (
                <>
                  <button
                    onClick={() => handleAction('start')}
                    className="rounded-md p-1 transition-all duration-200 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                    title="Start"
                  >
                    <Play size={18} />
                  </button>
                  <button
                    onClick={() => { /* edit not implemented on detail page */ }}
                    className="rounded-md p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="rounded-md p-1 transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
              {campaign.status === 'scheduled' && (
                <>
                  <button
                    onClick={() => handleAction('start')}
                    className="rounded-md p-1 transition-all duration-200 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                    title="Start now"
                  >
                    <Play size={18} />
                  </button>
                  <button
                    onClick={() => handleAction('cancel')}
                    className="rounded-md p-1 transition-all duration-200 text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="rounded-md p-1 transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
              {campaign.status === 'running' && (
                <>
                  <button
                    onClick={() => handleAction('pause')}
                    className="rounded-md p-1 transition-all duration-200 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                    title="Pause"
                  >
                    <Pause size={18} />
                  </button>
                  <button
                    onClick={() => handleAction('cancel')}
                    className="rounded-md p-1 transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </>
              )}
              {campaign.status === 'paused' && (
                <>
                  <button
                    onClick={() => handleAction('resume')}
                    className="rounded-md p-1 transition-all duration-200 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                    title="Resume"
                  >
                    <Play size={18} />
                  </button>
                  <button
                    onClick={() => handleAction('cancel')}
                    className="rounded-md p-1 transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </>
              )}
              {(campaign.status === 'completed' || campaign.status === 'cancelled') && (
                <button
                  onClick={handleDelete}
                  className="rounded-md p-1 transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Users size={16} className="text-blue-500" />
            Total Recipients
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {campaign.totalRecipients}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Send size={16} className="text-indigo-500" />
            Sent
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {campaign.sentCount}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <MailCheck size={16} className="text-green-500" />
            Delivered
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {campaign.deliveredCount}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Eye size={16} className="text-teal-500" />
            Read
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {campaign.readCount}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <AlertCircle size={16} className="text-red-500" />
            Failed
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {campaign.failedCount}
          </div>
        </div>
      </div>

      {/* Delivery Progress */}
      <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Delivery Rate</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {deliveryRate.toFixed(1)}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-md bg-primary-600 dark:bg-primary-500 transition-all"
            style={{ width: `${deliveryRate}%` }}
          />
        </div>
      </div>

      {/* Message Content */}
      <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Message Content</h2>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-950 p-4">
          <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{campaign.content}</p>
        </div>
        {campaign.templateName && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Megaphone size={14} />
            Template: {campaign.templateName}
            {campaign.templateVariables.length > 0 && (
              <span className="ml-1">({campaign.templateVariables.join(', ')})</span>
            )}
          </div>
        )}
      </div>

      {/* Recipients Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recipients</h2>
        </div>
        <div className="panel overflow-hidden">
          <Table className="min-w-full">
            <TableHeader>
              <tr>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Error</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {recipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">{r.phone}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium ${recipientStatusBadgeStyles[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDate(r.sentAt)}
                  </TableCell>
                  <TableCell className="text-red-600 dark:text-red-400 text-xs">
                    {r.error || '-'}
                  </TableCell>
                </TableRow>
              ))}
              {recipients.length === 0 && <TableEmpty colSpan={4}>No recipients found</TableEmpty>}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {recipientsTotal > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-4 py-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {recipientsPage} of {totalPages} ({recipientsTotal} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setRecipientsPage((p) => Math.max(1, p - 1))}
                disabled={recipientsPage <= 1}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>
              <button
                onClick={() => setRecipientsPage((p) => Math.min(totalPages, p + 1))}
                disabled={recipientsPage >= totalPages}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
