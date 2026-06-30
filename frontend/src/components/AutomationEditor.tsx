'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  LuChevronLeft as ChevronLeft,
  LuPlus as Plus,
  LuTrash2 as Trash2,
  LuArrowUp as ArrowUp,
  LuArrowDown as ArrowDown,
  LuCircleAlert as AlertCircle,
  LuSave as Save,
  LuMessageSquare as MessageSquare,
  LuWebhook as Webhook,
  LuPlay as Play,
  LuSend as Send,
  LuImage as Image,
  LuVideo as Video,
  LuFileText as FileText,
  LuMusic as Music,
  LuMousePointerClick as MousePointerClick,
  LuList as List,
  LuClock as Clock,
  LuGitBranch as GitBranch,
  LuTag as Tag,
  LuUserCheck as UserCheck,
  LuZap as Zap,
} from 'react-icons/lu';
import { useWaba } from '@/context/WabaContext';
import Link from 'next/link';

interface Step {
  id: string;
  type: string;
  label?: string;
  config: Record<string, any>;
}

interface AutomationEditorProps {
  automationId?: string;
  initialName?: string;
  initialSteps?: Step[];
}

interface TriggerConfig {
  type: string;
  keywords: string;
  matchType: string;
}

interface Condition {
  id: string;
  type: string;
  value: string;
}

interface ActionItem {
  id: string;
  type: string;
  config: Record<string, any>;
}

const TRIGGER_OPTIONS = [
  { value: 'trigger_new_chat', label: 'New Chat', icon: MessageSquare },
  { value: 'trigger_schedule', label: 'On Schedule', icon: Clock },
];

const CONDITION_OPTIONS = [
  { value: 'contains', label: 'Message contains' },
  { value: 'exact', label: 'Message is exactly' },
  { value: 'starts_with', label: 'Message starts with' },
  { value: 'ends_with', label: 'Message ends with' },
];

const ACTION_OPTIONS = [
  { value: 'send_text', label: 'Send Text', icon: Send },
  { value: 'send_template', label: 'Send Template', icon: Send },
  { value: 'send_media_image', label: 'Send Image', icon: Image },
  { value: 'send_media_video', label: 'Send Video', icon: Video },
  { value: 'send_media_document', label: 'Send Document', icon: FileText },
  { value: 'send_media_audio', label: 'Send Audio', icon: Music },
  { value: 'send_interactive_buttons', label: 'Button Menu', icon: MousePointerClick },
  { value: 'send_interactive_list', label: 'List Menu', icon: List },
  { value: 'delay', label: 'Delay', icon: Clock },
  { value: 'tag_contact', label: 'Tag Contact', icon: Tag },
  { value: 'assign_agent', label: 'Assign Agent', icon: UserCheck },
];

const ACTION_FIELDS: Record<string, { key: string; label: string; type: string; placeholder?: string }[]> = {
  send_text: [{ key: 'text', label: 'Message', type: 'textarea' }],
  send_template: [
    { key: 'template_name', label: 'Template Name', type: 'text' },
    { key: 'variables', label: 'Variables', type: 'text' },
  ],
  send_media_image: [
    { key: 'mediaUrl', label: 'Media URL', type: 'text' },
    { key: 'caption', label: 'Caption', type: 'text' },
  ],
  send_media_video: [
    { key: 'mediaUrl', label: 'Media URL', type: 'text' },
    { key: 'caption', label: 'Caption', type: 'text' },
  ],
  send_media_document: [
    { key: 'mediaUrl', label: 'Media URL', type: 'text' },
    { key: 'caption', label: 'Caption', type: 'text' },
  ],
  send_media_audio: [{ key: 'mediaUrl', label: 'Audio URL', type: 'text' }],
  send_interactive_buttons: [
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'buttons', label: 'Buttons (comma separated)', type: 'text' },
  ],
  send_interactive_list: [
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'button', label: 'Button', type: 'text' },
    { key: 'sections', label: 'Sections (JSON)', type: 'textarea', placeholder: '[{"title":"...","rows":[{"id":"1","title":"Option 1"}]}]' },
  ],
  delay: [{ key: 'seconds', label: 'Seconds', type: 'number' }],
  tag_contact: [{ key: 'tag', label: 'Tag', type: 'text' }],
  assign_agent: [{ key: 'user_id', label: 'Agent ID', type: 'text' }],
};

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function parseSteps(steps: Step[]): { trigger: TriggerConfig; conditions: Condition[]; actions: ActionItem[] } {
  const triggerStep = steps.find((s) => s.type.startsWith('trigger_'));
  const trigger: TriggerConfig = {
    type: triggerStep?.type || 'trigger_new_chat',
    keywords: triggerStep?.config?.keywords || '',
    matchType: triggerStep?.config?.match_type || 'contains',
  };

  const conditions: Condition[] = steps
    .filter((s) => s.type === 'condition')
    .map((s) => ({
      id: s.id || generateId(),
      type: s.config?.condition_type || 'contains',
      value: s.config?.value || '',
    }));

  const actions: ActionItem[] = steps
    .filter((s) => !s.type.startsWith('trigger_') && s.type !== 'condition')
    .map((s) => ({
      id: s.id || generateId(),
      type: s.type,
      config: s.config || {},
    }));

  return { trigger, conditions, actions };
}

function buildSteps(trigger: TriggerConfig, conditions: Condition[], actions: ActionItem[]): Step[] {
  const steps: Step[] = [];

  steps.push({
    id: generateId(),
    type: trigger.type,
    config: {
      keywords: trigger.keywords || undefined,
      match_type: trigger.matchType || 'contains',
    },
  });

  for (const cond of conditions) {
    if (!cond.value.trim()) continue;
    steps.push({
      id: generateId(),
      type: 'condition',
      config: {
        condition_type: cond.type,
        value: cond.value,
      },
    });
  }

  for (const action of actions) {
    steps.push({
      id: generateId(),
      type: action.type,
      config: action.config,
    });
  }

  return steps;
}

function getActionIcon(type: string) {
  const opt = ACTION_OPTIONS.find((a) => a.value === type);
  return opt?.icon || Zap;
}

export default function AutomationEditor({ automationId, initialName, initialSteps }: AutomationEditorProps) {
  const router = useRouter();
  const { selectedWabaId } = useWaba();
  const [name, setName] = useState(initialName || '');
  const [trigger, setTrigger] = useState<TriggerConfig>({
    type: 'trigger_new_chat',
    keywords: '',
    matchType: 'contains',
  });
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialSteps && initialSteps.length > 0) {
      const parsed = parseSteps(initialSteps);
      setTrigger(parsed.trigger);
      setConditions(parsed.conditions);
      setActions(parsed.actions);
    }
  }, [initialSteps]);

  const handleAddCondition = () => {
    setConditions((prev) => [...prev, { id: generateId(), type: 'contains', value: '' }]);
  };

  const handleUpdateCondition = (id: string, patch: Partial<Condition>) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleRemoveCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddAction = () => {
    setActions((prev) => [...prev, { id: generateId(), type: 'send_text', config: { text: '' } }]);
  };

  const handleUpdateAction = (id: string, patch: Partial<ActionItem>) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const handleUpdateActionConfig = (id: string, patch: Record<string, any>) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, config: { ...a.config, ...patch } } : a)));
  };

  const handleRemoveAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleMoveAction = (id: string, direction: -1 | 1) => {
    setActions((prev) => {
      const idx = prev.findIndex((a) => a.id === id);
      if (idx === -1) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter an automation name');
      return;
    }
    const steps = buildSteps(trigger, conditions, actions);
    if (actions.length === 0) {
      setError('Add at least one action');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        waba_account_id: selectedWabaId,
        steps,
      };
      if (automationId) {
        await api.put(`/automations/${automationId}`, payload);
      } else {
        await api.post('/automations', payload);
      }
      router.push('/dashboard/automations');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save automation');
    } finally {
      setSaving(false);
    }
  }, [name, trigger, conditions, actions, automationId, router, selectedWabaId]);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <Link
          href="/dashboard/automations"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ChevronLeft size={18} />
        </Link>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Automation name..."
          className="input flex-1 text-lg font-semibold"
        />
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
          {saving ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save size={14} />
          )}
          Save
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 dark:bg-gray-950/50">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Trigger */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Play size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Trigger</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">When this event occurs</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Event
                </label>
                <select
                  value={trigger.type}
                  onChange={(e) => setTrigger({ ...trigger, type: e.target.value })}
                  className="input w-full text-sm"
                >
                  {TRIGGER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {trigger.type === 'trigger_new_chat' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Keywords
                    </label>
                    <input
                      type="text"
                      value={trigger.keywords}
                      onChange={(e) => setTrigger({ ...trigger, keywords: e.target.value })}
                      placeholder="Comma separated keywords..."
                      className="input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Match Type
                    </label>
                    <select
                      value={trigger.matchType}
                      onChange={(e) => setTrigger({ ...trigger, matchType: e.target.value })}
                      className="input w-full text-sm"
                    >
                      <option value="contains">Contains</option>
                      <option value="exact">Exact</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Conditions */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  <GitBranch size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Conditions</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">All must be met for actions to run</p>
                </div>
              </div>
              <button onClick={handleAddCondition} className="btn-secondary text-xs">
                <Plus size={14} />
                Add
              </button>
            </div>

            {conditions.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
                No conditions. Actions will run whenever the trigger fires.
              </div>
            )}

            <div className="space-y-3">
              {conditions.map((cond) => (
                <div
                  key={cond.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <select
                    value={cond.type}
                    onChange={(e) => handleUpdateCondition(cond.id, { type: e.target.value })}
                    className="input w-48 shrink-0 text-sm"
                  >
                    {CONDITION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={cond.value}
                    onChange={(e) => handleUpdateCondition(cond.id, { value: e.target.value })}
                    placeholder="Value to match..."
                    className="input flex-1 text-sm"
                  />
                  <button
                    onClick={() => handleRemoveCondition(cond.id)}
                    className="mt-1 rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Executed in order when conditions pass</p>
                </div>
              </div>
              <button onClick={handleAddAction} className="btn-secondary text-xs">
                <Plus size={14} />
                Add
              </button>
            </div>

            {actions.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
                No actions yet. Add at least one action.
              </div>
            )}

            <div className="space-y-4">
              {actions.map((action, idx) => {
                const Icon = getActionIcon(action.type);
                const fields = ACTION_FIELDS[action.type] || [];
                return (
                  <div
                    key={action.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className="text-gray-500 dark:text-gray-400" />
                        <select
                          value={action.type}
                          onChange={(e) => {
                            const newType = e.target.value;
                            const defaultConfig: Record<string, any> = {};
                            const newFields = ACTION_FIELDS[newType] || [];
                            for (const f of newFields) {
                              defaultConfig[f.key] = f.type === 'number' ? 0 : '';
                            }
                            handleUpdateAction(action.id, { type: newType, config: defaultConfig });
                          }}
                          className="input w-56 text-sm font-medium"
                        >
                          {ACTION_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveAction(action.id, -1)}
                          disabled={idx === 0}
                          className="rounded-md p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveAction(action.id, 1)}
                          disabled={idx === actions.length - 1}
                          className="rounded-md p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveAction(action.id)}
                          className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {fields.map((field) => (
                        <div key={field.key}>
                          <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                            {field.label}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={action.config[field.key] || ''}
                              onChange={(e) => handleUpdateActionConfig(action.id, { [field.key]: e.target.value })}
                              rows={3}
                              className="input w-full text-sm resize-none"
                              placeholder={field.placeholder}
                            />
                          ) : field.type === 'number' ? (
                            <input
                              type="number"
                              value={action.config[field.key] || 0}
                              onChange={(e) => handleUpdateActionConfig(action.id, { [field.key]: Number(e.target.value) })}
                              className="input w-full text-sm"
                            />
                          ) : (
                            <input
                              type="text"
                              value={action.config[field.key] || ''}
                              onChange={(e) => handleUpdateActionConfig(action.id, { [field.key]: e.target.value })}
                              className="input w-full text-sm"
                              placeholder={field.placeholder}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spacer for scroll */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
