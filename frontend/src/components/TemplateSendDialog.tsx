'use client';

import { useEffect, useState, useMemo } from 'react';
import { LuX as X, LuSearch as Search, LuLoader as Loader2, LuSend as Send, LuFileText as FileText } from 'react-icons/lu';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/components/Toaster';

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
}

interface Template {
  id: string;
  templateName: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  status: string;
  wabaAccountId: string;
}

interface TemplateSendDialogProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  onSent?: () => void;
}

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{(\d+)\}\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ''))));
}

function getTemplateBody(components: TemplateComponent[]): string {
  const body = components.find((c) => c.type === 'BODY');
  return body?.text || '';
}

export default function TemplateSendDialog({ open, conversationId, onClose, onSent }: TemplateSendDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearch('');
    setSelectedTemplate(null);
    setVariables({});
    api.get('/templates')
      .then((res) => {
        const all = res.data.templates || [];
        // Only show APPROVED templates
        setTemplates(all.filter((t: Template) => t.status === 'APPROVED'));
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return templates.filter((t) =>
      t.templateName.toLowerCase().includes(q) ||
      t.language.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const handleSelect = (template: Template) => {
    setSelectedTemplate(template);
    const bodyText = getTemplateBody(template.components);
    const placeholders = extractPlaceholders(bodyText);
    const vars: Record<string, string> = {};
    for (const p of placeholders) {
      vars[p] = '';
    }
    setVariables(vars);
  };

  const handleSend = async () => {
    if (!selectedTemplate || !conversationId) return;
    setSending(true);
    try {
      const templateVars = Object.values(variables);
      await api.post('/messages', {
        conversationId,
        messageType: 'template',
        templateName: selectedTemplate.templateName,
        templateLanguage: selectedTemplate.language,
        templateVariables: templateVars,
        content: getTemplateBody(selectedTemplate.components),
      });
      toastSuccess('Template sent');
      onSent?.();
      onClose();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const categoryBadgeClass = (category: string) => {
    const c = category.toLowerCase();
    if (c === 'marketing') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    if (c === 'utility') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (c === 'authentication') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="mx-4 flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Send Template</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {selectedTemplate ? (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-sm text-primary-600 hover:underline dark:text-primary-400"
              >
                &larr; Back to templates
              </button>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${categoryBadgeClass(selectedTemplate.category)}`}>
                    {selectedTemplate.category}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{selectedTemplate.language}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedTemplate.templateName}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                  {getTemplateBody(selectedTemplate.components)}
                </p>
              </div>

              {Object.keys(variables).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Template Variables</h3>
                  {Object.keys(variables).map((key) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Variable {key}
                      </label>
                      <input
                        type="text"
                        value={variables[key]}
                        onChange={(e) => setVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="input w-full"
                        placeholder={`Value for {{${key}}}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input w-full pl-9"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {search ? 'No matching templates' : 'No approved templates available'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className="flex w-full flex-col rounded-lg border border-gray-100 bg-white p-3 text-left transition-colors hover:border-primary-200 hover:bg-primary-50/50 dark:border-gray-800 dark:bg-gray-800/30 dark:hover:border-primary-800 dark:hover:bg-primary-900/10"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <FileText size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{template.templateName}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${categoryBadgeClass(template.category)}`}>
                          {template.category}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                        {getTemplateBody(template.components)}
                      </p>
                      <span className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{template.language}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Back
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send Template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
