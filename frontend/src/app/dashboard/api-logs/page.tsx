'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Server,
  Trash2,
} from 'lucide-react';
import { toastError, toastSuccess } from '@/components/Toaster';
import { useSocket } from '@/hooks/useSocket';
import ConfirmDialog from '@/components/ConfirmDialog';
import { usePermission } from '@/hooks/usePermission';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/Table';

interface ApiLog {
  id: string;
  orgId: string;
  conversationId: string | null;
  direction: 'outgoing' | 'incoming';
  provider: string;
  endpoint: string;
  method: string;
  requestBody: Record<string, unknown> | null;
  responseBody: Record<string, unknown> | null;
  statusCode: number | null;
  durationMs: number | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export default function ApiLogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [directionFilter, setDirectionFilter] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { can } = usePermission();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      if (directionFilter) params.set('direction', directionFilter);
      if (providerFilter) params.set('provider', providerFilter);

      const res = await api.get(`/api-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to load API logs');
    } finally {
      setLoading(false);
    }
  }, [offset, limit, directionFilter, providerFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewApiLog = (log: ApiLog) => {
      const matchesDirection = !directionFilter || log.direction === directionFilter;
      const matchesProvider = !providerFilter || log.provider === providerFilter;
      if (!matchesDirection || !matchesProvider) return;

      setTotal((prev) => prev + 1);

      if (offset !== 0) return;

      setLogs((prev) => {
        if (prev.some((l) => l.id === log.id)) return prev;
        const next = [log, ...prev];
        if (next.length > limit) next.pop();
        return next;
      });
    };

    socket.on('new_api_log', handleNewApiLog);
    return () => {
      socket.off('new_api_log', handleNewApiLog);
    };
  }, [socket, offset, limit, directionFilter, providerFilter]);

  const handleClearLogs = async () => {
    setClearing(true);
    try {
      await api.delete('/api-logs');
      toastSuccess('API logs cleared');
      fetchLogs();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to clear API logs');
    } finally {
      setClearing(false);
      setShowClearDialog(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">API Logs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Platform API calls to third-party services
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('settings.manage') && total > 0 && (
            <button
              onClick={() => setShowClearDialog(true)}
              disabled={clearing}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          )}
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={directionFilter}
            onChange={(e) => { setDirectionFilter(e.target.value); setOffset(0); }}
            className="input text-sm"
          >
            <option value="">All directions</option>
            <option value="outgoing">Outgoing</option>
            <option value="incoming">Incoming</option>
          </select>
        </div>
        <div>
          <select
            value={providerFilter}
            onChange={(e) => { setProviderFilter(e.target.value); setOffset(0); }}
            className="input text-sm"
          >
            <option value="">All providers</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="meta">Meta</option>
          </select>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {total} total logs
        </span>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Direction</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && !loading && <TableEmpty colSpan={8}>No API logs found</TableEmpty>}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    log.direction === 'outgoing'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}>
                    {log.direction === 'outgoing' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                    {log.direction}
                  </span>
                </TableCell>
                <TableCell className="capitalize">{log.provider}</TableCell>
                <TableCell>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {log.method}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs truncate" title={log.endpoint}>
                  {log.endpoint}
                </TableCell>
                <TableCell>
                  {log.success ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle size={14} />
                      {log.statusCode || 'OK'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                      <AlertCircle size={14} />
                      {log.statusCode || 'Error'}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {log.durationMs ? `${log.durationMs}ms` : '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    title="View details"
                  >
                    <ExternalLink size={16} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
            disabled={offset === 0}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setOffset((prev) => prev + limit)}
            disabled={offset + limit >= total}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showClearDialog}
        title="Clear All API Logs"
        message="This will permanently delete all API logs for your organization. This action cannot be undone."
        confirmLabel="Clear All"
        onConfirm={handleClearLogs}
        onCancel={() => setShowClearDialog(false)}
      />

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedLog(null); }}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">API Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <span className="text-gray-500 dark:text-gray-400">Direction</span>
                  <p className="mt-1 font-medium text-gray-900 dark:text-gray-100 capitalize">{selectedLog.direction}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <span className="text-gray-500 dark:text-gray-400">Provider</span>
                  <p className="mt-1 font-medium text-gray-900 dark:text-gray-100 capitalize">{selectedLog.provider}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <span className="text-gray-500 dark:text-gray-400">Method</span>
                  <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{selectedLog.method}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <p className={`mt-1 font-medium ${selectedLog.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {selectedLog.success ? 'Success' : 'Failed'} {selectedLog.statusCode ? `(${selectedLog.statusCode})` : ''}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <span className="text-gray-500 dark:text-gray-400">Duration</span>
                  <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{selectedLog.durationMs ? `${selectedLog.durationMs}ms` : '—'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <span className="text-gray-500 dark:text-gray-400">Time</span>
                  <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Endpoint</span>
                <p className="mt-1 break-all rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                  {selectedLog.endpoint}
                </p>
              </div>

              {selectedLog.requestBody && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Request Body</span>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                    {JSON.stringify(selectedLog.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.responseBody && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Response Body</span>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                    {JSON.stringify(selectedLog.responseBody, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.errorMessage && (
                <div>
                  <span className="text-sm text-red-500 dark:text-red-400">Error</span>
                  <p className="mt-1 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
