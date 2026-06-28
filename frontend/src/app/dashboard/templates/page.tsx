'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Loader2,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWaba } from '@/context/WabaContext';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/Table';

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
  example?: { header_handle?: string[]; body_text?: string[][] };
}

interface Template {
  id: string;
  templateName: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  status: string;
  metaTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
  wabaAccountId: string;
}

type CategoryFilter = 'all' | 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
type StatusFilter = 'all' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';

const statusBadgeClass: Record<string, string> = {
  APPROVED: 'badge-green',
  PENDING: 'badge-amber',
  REJECTED: 'badge-red',
  PAUSED: 'badge-gray',
};

const categoryBadgeClass: Record<string, string> = {
  UTILITY: 'badge-blue',
  MARKETING: 'badge-purple',
  AUTHENTICATION: 'badge-amber',
};

function getTemplateBody(components: TemplateComponent[]): string {
  const body = components.find((c) => c.type === 'BODY');
  return body?.text || '';
}

function getTemplateHeader(components: TemplateComponent[]): string {
  const header = components.find((c) => c.type === 'HEADER');
  return header?.text || (header?.format ? `[${header.format}]` : '');
}

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

export default function TemplatesPage() {
  const { selectedWabaId } = useWaba();
  const { user } = useAuth();
  const { can, loading: authLoading } = usePermission();
  const wabaAccounts = user?.wabaAccounts || [];

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewText, setPreviewText] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/templates');
      setTemplates(res.data.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleRefresh = async () => {
    if (!selectedWabaId) return;
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await api.post('/templates/refresh', { waba_account_id: selectedWabaId });
      setRefreshMessage({ type: 'success', text: `${res.data.count} templates synced` });
      await fetchTemplates();
    } catch (err: any) {
      setRefreshMessage({ type: 'error', text: err.response?.data?.error || 'Failed to refresh templates' });
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMessage(null), 4000);
    }
  };

  const openPreview = async (template: Template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await api.post(`/templates/${template.id}/preview`);
      setPreviewText(res.data.preview || '');
    } catch {
      // Fallback to local preview
      const body = getTemplateBody(template.components);
      const text = body.replace(/\{\{(\d+)\}\}/g, (_match, num) => {
        const n = parseInt(num, 10);
        if (n === 1) return 'John';
        if (n === 2) return '12345';
        return `Value${n}`;
      });
      setPreviewText(text);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewTemplate(null);
    setPreviewText('');
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return templates.filter((t) => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (
        !t.templateName.toLowerCase().includes(q) &&
        !t.language.toLowerCase().includes(q) &&
        !t.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [templates, search, categoryFilter, statusFilter]);

  const selectedWaba = useMemo(
    () => wabaAccounts.find((w) => w.id === selectedWabaId),
    [wabaAccounts, selectedWabaId]
  );

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
        You do not have permission to view templates.
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Templates</h1>
          <p>Manage WhatsApp message templates synced from Meta</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing || !selectedWabaId}
            className="btn-secondary"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
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

      {selectedWabaId && (
        <>
          {/* Search and Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {selectedWaba?.name && (
                <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 dark:border-gray-700 dark:bg-gray-800">
                  {selectedWaba.name}
                </span>
              )}
              <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mb-3 flex flex-wrap gap-2">
            {(['all', 'UTILITY', 'MARKETING', 'AUTHENTICATION'] as CategoryFilter[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === c
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {c === 'all' ? 'All Categories' : c.charAt(0) + c.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Status Chips */}
          <div className="mb-6 flex flex-wrap gap-2">
            {(['all', 'APPROVED', 'PENDING', 'REJECTED', 'PAUSED'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s === statusFilter ? 'all' : s)}
                className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {s === 'all' ? 'All Status' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="panel overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Body Preview</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const bodyPreview = getTemplateBody(t.components);
                    const headerPreview = getTemplateHeader(t.components);
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="shrink-0 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {t.templateName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={categoryBadgeClass[t.category] || 'badge-gray'}>
                            {t.category}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            {t.language}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={statusBadgeClass[t.status] || 'badge-gray'}>
                            {t.status}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {headerPreview && <span className="font-medium text-gray-700 dark:text-gray-300">{headerPreview} &bull; </span>}
                            {bodyPreview || <em className="text-gray-400">No body text</em>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(t.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => openPreview(t)}
                            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            aria-label="Preview"
                            title="Preview"
                          >
                            <Eye size={15} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableEmpty colSpan={7}>
                      {templates.length === 0 ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileText size={32} className="text-gray-300 dark:text-gray-600" />
                          <p>No templates found for this WABA account.</p>
                          <p className="text-xs">Click Refresh to sync templates from Meta.</p>
                        </div>
                      ) : (
                        <p>No templates match your filters.</p>
                      )}
                    </TableEmpty>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewOpen && previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {previewTemplate.templateName}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {previewTemplate.language} &bull; {previewTemplate.category}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <XCircle size={20} />
              </button>
            </div>

            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {previewTemplate.components.map((comp, idx) => {
                  if (comp.type === 'HEADER' && comp.text) {
                    return (
                      <div key={idx} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Header</span>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{comp.text}</p>
                      </div>
                    );
                  }
                  if (comp.type === 'BODY' && (comp.text || previewText)) {
                    return (
                      <div key={idx} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Body</span>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                          {comp.text ? comp.text : previewText}
                        </p>
                      </div>
                    );
                  }
                  if (comp.type === 'FOOTER' && comp.text) {
                    return (
                      <div key={idx} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Footer</span>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{comp.text}</p>
                      </div>
                    );
                  }
                  if (comp.type === 'BUTTONS') {
                    return (
                      <div key={idx} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Buttons</span>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Button template</p>
                      </div>
                    );
                  }
                  return null;
                })}

                {previewText && !previewTemplate.components.some((c) => c.type === 'BODY') && (
                  <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Preview</span>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{previewText}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
