'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { useWaba } from '@/context/WabaContext';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Users,
  FileText,
  CalendarClock,
  Megaphone,
  Building2,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
}

interface Recipient {
  phone: string;
  variables: Record<string, string>;
}

interface Template {
  id: string;
  templateName: string;
  category: string;
  language: string;
  components: Array<{ type: string; text?: string; format?: string }>;
  status: string;
}

const STEPS = ['Basics', 'Message', 'Recipients', 'Schedule'] as const;

type Step = (typeof STEPS)[number];

function formatDateForInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

export default function NewCampaignPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { can, loading: authLoading } = usePermission();
  const { selectedWabaId } = useWaba();
  const wabaAccounts = user?.wabaAccounts || [];

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Basics
  const [name, setName] = useState('');
  const [messageType, setMessageType] = useState<'utility' | 'marketing'>('utility');
  const [wabaAccountId, setWabaAccountId] = useState<string>(selectedWabaId || '');

  // Step 2: Message
  const [content, setContent] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateVarsInput, setTemplateVarsInput] = useState('');

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});

  // Step 3: Recipients
  const [recipientTab, setRecipientTab] = useState<'contacts' | 'manual'>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [manualInput, setManualInput] = useState('');
  const [parsedManualRecipients, setParsedManualRecipients] = useState<Recipient[]>([]);

  // Step 4: Schedule
  const [scheduleMode, setScheduleMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledAt, setScheduledAt] = useState<string>(formatDateForInput(new Date()));

  // Template selection screen
  const [templateSelectionMode, setTemplateSelectionMode] = useState(true);
  const [templateSearch, setTemplateSearch] = useState('');

  useEffect(() => {
    if (selectedWabaId) {
      setWabaAccountId(selectedWabaId);
    }
  }, [selectedWabaId]);

  // Fetch contacts
  useEffect(() => {
    api
      .get('/contacts')
      .then((res) => setContacts(res.data.contacts || []))
      .catch(() => setContacts([]));
  }, []);

  // Fetch templates when WABA changes
  const fetchTemplates = useCallback(async () => {
    if (!wabaAccountId) return;
    setTemplatesLoading(true);
    try {
      const res = await api.get('/templates', { params: { waba_account_id: wabaAccountId } });
      setTemplates(res.data.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [wabaAccountId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleRefreshTemplates = async () => {
    if (!wabaAccountId) return;
    setRefreshing(true);
    try {
      await api.post('/templates/refresh', { waba_account_id: wabaAccountId });
      await fetchTemplates();
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  // Parse template placeholders {{1}}, {{2}}, etc.
  function extractPlaceholders(text: string): string[] {
    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    return matches.map((m) => m.slice(2, -2)); // {{1}} -> 1
  }

  function getTemplateBody(template: Template): string {
    const body = template.components.find((c) => c.type === 'BODY');
    return body?.text || '';
  }

  // When template selected from dropdown in Message step
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setContent('');
      setTemplateName('');
      setTemplateVarsInput('');
      setTemplateVars({});
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const bodyText = getTemplateBody(template);
    setContent(bodyText);
    setTemplateName(template.templateName);

    // Extract placeholders and create variable mappings
    const placeholders = extractPlaceholders(bodyText);
    const vars: Record<string, string> = {};
    for (const p of placeholders) {
      vars[p] = '';
    }
    setTemplateVars(vars);
    setTemplateVarsInput(placeholders.map((p) => `var${p}`).join(', '));
  };

  // When template selected from template selection screen
  const handleSelectTemplateAndProceed = (templateId: string) => {
    handleSelectTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      // Auto-set message type based on template category
      const category = template.category?.toLowerCase() || '';
      if (category === 'marketing') {
        setMessageType('marketing');
      } else {
        setMessageType('utility');
      }
    }
    setTemplateSelectionMode(false);
    setCurrentStep(0);
  };

  const handleBackToTemplates = () => {
    setTemplateSelectionMode(true);
    setTemplateSearch('');
    setCurrentStep(0);
  };

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.toLowerCase();
    return templates.filter((t) =>
      t.templateName.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.language.toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  const templateVariableList = useMemo(() => {
    return Object.keys(templateVars);
  }, [templateVars]);

  // Parse manual recipients
  useEffect(() => {
    const lines = manualInput.split('\n').filter((l) => l.trim());
    const recipients: Recipient[] = [];
    const varKeys = templateVariableList;
    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length === 0) continue;
      const phone = parts[0];
      if (!phone) continue;
      const variables: Record<string, string> = {};
      for (let i = 1; i < parts.length; i++) {
        const varKey = varKeys[i - 1];
        if (varKey) {
          variables[varKey] = parts[i];
        }
      }
      recipients.push({ phone, variables });
    }
    setParsedManualRecipients(recipients);
  }, [manualInput, templateVariableList]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }, [contacts, contactSearch]);

  const selectedRecipients: Recipient[] = useMemo(() => {
    if (recipientTab === 'manual') {
      return parsedManualRecipients;
    }
    const selected: Recipient[] = [];
    for (const contact of contacts) {
      if (selectedContactIds.has(contact.id)) {
        const variables: Record<string, string> = {};
        if (templateVariableList.length > 0 && contact.name) {
          variables[templateVariableList[0]] = contact.name;
        }
        selected.push({ phone: contact.phone, variables });
      }
    }
    return selected;
  }, [recipientTab, parsedManualRecipients, contacts, selectedContactIds, templateVariableList]);

  const recipientCount = selectedRecipients.length;

  const allSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every((c) => selectedContactIds.has(c.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      const next = new Set(selectedContactIds);
      for (const c of filteredContacts) {
        next.delete(c.id);
      }
      setSelectedContactIds(next);
    } else {
      const next = new Set(selectedContactIds);
      for (const c of filteredContacts) {
        next.add(c.id);
      }
      setSelectedContactIds(next);
    }
  };

  const toggleContact = (id: string) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedContactIds(next);
  };

  const canGoNext = useCallback(() => {
    if (currentStep === 0) {
      return name.trim().length > 0 && wabaAccountId.length > 0;
    }
    if (currentStep === 1) {
      if (messageType === 'marketing') {
        return content.trim().length > 0 && selectedTemplateId.length > 0;
      }
      return content.trim().length > 0;
    }
    if (currentStep === 2) {
      return recipientCount > 0;
    }
    if (currentStep === 3) {
      if (scheduleMode === 'scheduled') {
        return scheduledAt.length > 0;
      }
      return true;
    }
    return false;
  }, [currentStep, name, wabaAccountId, content, messageType, selectedTemplateId, recipientCount, scheduleMode, scheduledAt]);

  const handleNext = () => {
    if (!canGoNext()) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canGoNext()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        message_type: messageType,
        content: content.trim(),
        template_id: selectedTemplateId || null,
        template_name: messageType === 'marketing' ? templateName.trim() || null : null,
        template_variables: templateVariableList,
        waba_account_id: wabaAccountId,
        recipients: selectedRecipients,
        scheduled_at:
          scheduleMode === 'scheduled' && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
      };
      await api.post('/campaigns', payload);
      router.push('/dashboard/campaigns');
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const selectedWaba = wabaAccounts.find((w) => w.id === wabaAccountId);

  const previewMessage = useMemo(() => {
    let msg = content;
    // Substitute {{N}} placeholders with user-provided values or defaults
    for (const [key, value] of Object.entries(templateVars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const displayValue = value || `Value ${key}`;
      msg = msg.replace(regex, displayValue);
    }
    return msg;
  }, [content, templateVars]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (!can('campaigns.manage')) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-12 text-center">
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Unauthorized
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You do not have permission to create campaigns.
        </p>
      </div>
    );
  }

  if (!selectedWabaId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-12 text-center">
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

  const categoryBadgeClass = (category: string) => {
    const c = category.toLowerCase();
    if (c === 'marketing') return 'badge-purple';
    if (c === 'utility') return 'badge-blue';
    if (c === 'authentication') return 'badge-amber';
    return 'badge-gray';
  };

  return (
    <div>
      {templateSelectionMode ? (
        <>
          <div className="mb-6 flex items-center gap-3">
            <Megaphone size={24} className="text-gray-700 dark:text-gray-300" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Select a Template
            </h1>
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose a WhatsApp template to start your campaign.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshTemplates}
                disabled={refreshing || templatesLoading}
                className="btn-secondary text-xs"
              >
                {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search templates by name, category, or language..."
                className="input pl-9"
              />
            </div>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="panel flex flex-col items-center justify-center py-12 text-center">
              <FileText size={32} className="mb-3 text-gray-300 dark:text-gray-700" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {templateSearch ? 'No templates match your search.' : 'No templates found. Click Refresh to sync from Meta.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const bodyText = getTemplateBody(template);
                return (
                  <div
                    key={template.id}
                    className="panel flex flex-col p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.templateName}</h3>
                      <span className={categoryBadgeClass(template.category)}>
                        {template.category}
                      </span>
                    </div>
                    <div className="mb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">{template.language}</span>
                      <span className="capitalize">{template.status}</span>
                    </div>
                    <p className="mb-4 flex-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-4">
                      {bodyText || 'No preview available'}
                    </p>
                    <button
                      onClick={() => handleSelectTemplateAndProceed(template.id)}
                      className="btn-primary w-full text-xs"
                    >
                      Use this Template
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Megaphone size={24} className="text-gray-700 dark:text-gray-300" />
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                New Campaign
              </h1>
            </div>
            <button
              onClick={handleBackToTemplates}
              className="btn-secondary text-xs"
            >
              <ChevronLeft size={14} />
              Back to Templates
            </button>
          </div>

          {/* Step Indicator */}
          <div className="mb-8 overflow-x-auto pb-2">
            <div className="flex min-w-max items-center gap-2">
              {STEPS.map((step, idx) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      idx <= currentStep
                        ? 'bg-[#25D366] text-white'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {idx < currentStep ? <Check size={16} /> : idx + 1}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      idx <= currentStep
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step}
                  </span>
                  {idx < STEPS.length - 1 && (
                    <div className="mx-2 h-px w-6 bg-gray-300 dark:bg-gray-700" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="panel p-6">
        {/* Step 1: Basics */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Campaign Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Summer Sale 2026"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Message Type
              </label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="radio"
                    name="messageType"
                    value="utility"
                    checked={messageType === 'utility'}
                    onChange={() => setMessageType('utility')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Utility</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="radio"
                    name="messageType"
                    value="marketing"
                    checked={messageType === 'marketing'}
                    onChange={() => setMessageType('marketing')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Marketing</span>
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                WABA Account
              </label>
              <select
                value={wabaAccountId}
                onChange={(e) => setWabaAccountId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                {wabaAccounts.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Message */}
        {currentStep === 1 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              {/* Template Selector */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    WhatsApp Template
                  </label>
                  <button
                    onClick={handleRefreshTemplates}
                    disabled={refreshing || templatesLoading}
                    className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-900/20 transition-all duration-200"
                  >
                    {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Refresh
                  </button>
                </div>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">{templatesLoading ? 'Loading templates...' : 'Select a template'}</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.templateName} ({t.language}) - {t.category}
                    </option>
                  ))}
                </select>
                {messageType === 'marketing' && !selectedTemplateId && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Marketing campaigns require an approved WhatsApp template.
                  </p>
                )}
                {templates.length === 0 && !templatesLoading && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    No templates found. Click Refresh to sync from Meta.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Message Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  readOnly={!!selectedTemplateId}
                  className={`w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-600 ${selectedTemplateId ? 'bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed' : ''}`}
                  placeholder="Hello {name}, your order {order_id} is ready!"
                />
                <div className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
                  {content.length} characters
                </div>
              </div>

              {/* Dynamic Variable Inputs */}
              {templateVariableList.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Template Variables
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {templateVariableList.map((key) => (
                      <div key={key}>
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Variable {key}
                        </label>
                        <input
                          type="text"
                          value={templateVars[key] || ''}
                          onChange={(e) => {
                            setTemplateVars((prev) => ({ ...prev, [key]: e.target.value }));
                          }}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-600"
                          placeholder={`Value for {{${key}}}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    These values will be substituted into the template for each recipient.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview
              </label>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4">
                <div className="mx-auto max-w-xs rounded-2xl rounded-tl-none bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {previewMessage || 'Your message will appear here...'}
                  </p>
                  <p className="mt-2 text-[10px] text-gray-400">
                    Mock recipient: +1 234 567 890
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Recipients */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setRecipientTab('contacts')}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  recipientTab === 'contacts'
                    ? 'border-b-2 border-primary-900 text-primary-900 dark:border-primary-400 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Import from Contacts
              </button>
              <button
                onClick={() => setRecipientTab('manual')}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  recipientTab === 'manual'
                    ? 'border-b-2 border-primary-900 text-primary-900 dark:border-primary-400 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Manual Entry
              </button>
            </div>

            {recipientTab === 'contacts' && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-600"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredContacts.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedContactIds.has(c.id)}
                              onChange={() => toggleContact(c.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{c.name}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{c.phone}</td>
                        </tr>
                      ))}
                      {filteredContacts.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            No contacts found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users size={16} className="inline mr-1 -mt-0.5" />
                  {selectedContactIds.size} selected
                </div>
              </div>
            )}

            {recipientTab === 'manual' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Manual Entry
                </label>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  One recipient per line: phone, then comma-separated variables matching your template variables.
                </p>
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="+1234567890,John,ORD-123&#10;+0987654321,Jane,ORD-456"
                />
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users size={16} className="inline mr-1 -mt-0.5" />
                  {parsedManualRecipients.length} valid recipients
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-3">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Total Recipients: {recipientCount}
              </span>
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {currentStep === 3 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  When to send?
                </label>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                      type="radio"
                      name="scheduleMode"
                      value="immediate"
                      checked={scheduleMode === 'immediate'}
                      onChange={() => setScheduleMode('immediate')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <FileText size={18} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">Send Immediately</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                      type="radio"
                      name="scheduleMode"
                      value="scheduled"
                      checked={scheduleMode === 'scheduled'}
                      onChange={() => setScheduleMode('scheduled')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <CalendarClock size={18} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">Schedule for Later</span>
                  </label>
                </div>
              </div>

              {scheduleMode === 'scheduled' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Summary
              </label>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Campaign Name</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Type</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{messageType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">WABA</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{selectedWaba?.name || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Recipients</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{recipientCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Schedule</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {scheduleMode === 'immediate' ? 'Immediately' : formatDate(scheduledAt)}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Message Preview</span>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {content}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !canGoNext()}
                className="mt-4 w-full rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {submitting ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {currentStep < STEPS.length - 1 && (
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${
              currentStep === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#128C7E] transition-all duration-200 ${
              !canGoNext() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      </>
    )}
    </div>
  );
}
