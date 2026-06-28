'use client';

import { useState, useCallback } from 'react';
import {
  ChevronLeft, Save, Trash2, Loader2, Plus, X, GripVertical,
  MessageSquare, Send, Image, FileText, Video, Music,
  MousePointerClick, List, Clock, GitBranch, Tag, UserCheck,
  AlertCircle, Sparkles, ChevronDown, ChevronUp, MoveUp, MoveDown,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const STEP_CATEGORIES = [
  {
    label: 'Triggers',
    items: [
      { type: 'trigger_message', label: 'Message Received', icon: MessageSquare, desc: 'When a contact sends any message' },
      { type: 'trigger_conversation_opened', label: 'Conversation Opened', icon: MessageSquare, desc: 'When a new conversation starts' },
      { type: 'trigger_webhook', label: 'Webhook Event', icon: Sparkles, desc: 'When a webhook is received' },
    ],
  },
  {
    label: 'Messages',
    items: [
      { type: 'send_text', label: 'Send Text', icon: Send, desc: 'Send a plain text message' },
      { type: 'send_template', label: 'Send Template', icon: Send, desc: 'Send an approved template' },
      { type: 'send_media_image', label: 'Send Image', icon: Image, desc: 'Send an image' },
      { type: 'send_media_video', label: 'Send Video', icon: Video, desc: 'Send a video' },
      { type: 'send_media_document', label: 'Send Document', icon: FileText, desc: 'Send a document' },
      { type: 'send_media_audio', label: 'Send Audio', icon: Music, desc: 'Send an audio file' },
      { type: 'send_interactive_buttons', label: 'Button Menu', icon: MousePointerClick, desc: 'Send buttons' },
      { type: 'send_interactive_list', label: 'List Menu', icon: List, desc: 'Send a list menu' },
    ],
  },
  {
    label: 'Logic',
    items: [
      { type: 'condition', label: 'Condition', icon: GitBranch, desc: 'Branch based on a rule' },
      { type: 'delay', label: 'Delay', icon: Clock, desc: 'Wait for a duration' },
    ],
  },
  {
    label: 'Actions',
    items: [
      { type: 'tag_contact', label: 'Tag Contact', icon: Tag, desc: 'Add a tag' },
      { type: 'assign_agent', label: 'Assign Agent', icon: UserCheck, desc: 'Assign to an agent' },
    ],
  },
];

const STEP_TYPE_MAP: Record<string, { label: string; icon: React.FC<any>; color: string; bg: string; border: string }> = {};
for (const cat of STEP_CATEGORIES) {
  for (const item of cat.items) {
    STEP_TYPE_MAP[item.type] = {
      label: item.label,
      icon: item.icon,
      color: 'text-gray-700 dark:text-gray-200',
      bg: 'bg-gray-50 dark:bg-gray-800/50',
      border: 'border-gray-200 dark:border-gray-700',
    };
  }
}

// Override colors for specific types
STEP_TYPE_MAP.trigger_message = { ...STEP_TYPE_MAP.trigger_message, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' };
STEP_TYPE_MAP.trigger_conversation_opened = { ...STEP_TYPE_MAP.trigger_conversation_opened, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' };
STEP_TYPE_MAP.trigger_webhook = { ...STEP_TYPE_MAP.trigger_webhook, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' };
STEP_TYPE_MAP.send_text = { ...STEP_TYPE_MAP.send_text, color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' };
STEP_TYPE_MAP.send_template = { ...STEP_TYPE_MAP.send_template, color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' };
STEP_TYPE_MAP.send_media_image = { ...STEP_TYPE_MAP.send_media_image, color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' };
STEP_TYPE_MAP.send_media_video = { ...STEP_TYPE_MAP.send_media_video, color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' };
STEP_TYPE_MAP.send_media_document = { ...STEP_TYPE_MAP.send_media_document, color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' };
STEP_TYPE_MAP.send_media_audio = { ...STEP_TYPE_MAP.send_media_audio, color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' };
STEP_TYPE_MAP.send_interactive_buttons = { ...STEP_TYPE_MAP.send_interactive_buttons, color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' };
STEP_TYPE_MAP.send_interactive_list = { ...STEP_TYPE_MAP.send_interactive_list, color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' };
STEP_TYPE_MAP.condition = { ...STEP_TYPE_MAP.condition, color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' };
STEP_TYPE_MAP.delay = { ...STEP_TYPE_MAP.delay, color: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' };
STEP_TYPE_MAP.tag_contact = { ...STEP_TYPE_MAP.tag_contact, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' };
STEP_TYPE_MAP.assign_agent = { ...STEP_TYPE_MAP.assign_agent, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' };

interface Step {
  id: string;
  type: string;
  label?: string;
  config: Record<string, any>;
}

function StepConfigPanel({ step, onUpdate }: { step: Step; onUpdate: (config: Record<string, any>) => void }) {
  const { type, config } = step;
  const set = (patch: Record<string, any>) => onUpdate({ ...config, ...patch });

  return (
    <div className="space-y-4 pt-3">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Step Label</label>
        <input
          type="text"
          value={step.label || ''}
          onChange={(e) => onUpdate({ ...config, __label: e.target.value })}
          placeholder={STEP_TYPE_MAP[type]?.label || type}
          className="input"
        />
      </div>

      {(type === 'send_text' || type === 'send_template') && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Message</label>
          <textarea value={config.text || ''} onChange={(e) => set({ text: e.target.value })} rows={3} className="input" placeholder="Enter message text..." />
        </div>
      )}

      {(type.startsWith('send_media_') && type !== 'send_media_audio') && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Media URL</label>
            <input type="text" value={config.mediaUrl || ''} onChange={(e) => set({ mediaUrl: e.target.value })} className="input" placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Caption</label>
            <input type="text" value={config.caption || ''} onChange={(e) => set({ caption: e.target.value })} className="input" />
          </div>
        </div>
      )}

      {type === 'send_media_audio' && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Audio URL</label>
          <input type="text" value={config.mediaUrl || ''} onChange={(e) => set({ mediaUrl: e.target.value })} className="input" placeholder="https://..." />
        </div>
      )}

      {(type === 'send_interactive_buttons' || type === 'send_interactive_list') && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Body Text</label>
            <textarea value={config.body || ''} onChange={(e) => set({ body: e.target.value })} rows={3} className="input" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Footer <span className="text-xs font-normal text-gray-400">(optional)</span></label>
            <input type="text" value={config.footer || ''} onChange={(e) => set({ footer: e.target.value })} className="input" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options <span className="text-xs font-normal text-gray-400">(one per line)</span></label>
            <textarea value={(config.buttons || []).join('\n')}
              onChange={(e) => set({ buttons: e.target.value.split('\n').filter(Boolean) })} rows={4} className="input" />
          </div>
        </div>
      )}

      {type === 'condition' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Field</label>
            <select value={config.field || 'message'} onChange={(e) => set({ field: e.target.value })} className="input">
              <option value="message">Message Text</option><option value="contact_name">Contact Name</option><option value="contact_tag">Contact Tag</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Operator</label>
            <select value={config.operator || 'contains'} onChange={(e) => set({ operator: e.target.value })} className="input">
              <option value="contains">Contains</option><option value="equals">Equals</option><option value="starts_with">Starts With</option><option value="not_empty">Not Empty</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</label>
            <input type="text" value={config.value || ''} onChange={(e) => set({ value: e.target.value })} className="input" />
          </div>
        </div>
      )}

      {type === 'delay' && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delay (seconds)</label>
          <input type="number" min={1} value={Math.round((config.durationMs || 5000) / 1000)} onChange={(e) => set({ durationMs: parseInt(e.target.value || '1') * 1000 })} className="input" />
        </div>
      )}

      {type === 'tag_contact' && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tag Name</label>
          <input type="text" value={config.tag || ''} onChange={(e) => set({ tag: e.target.value })} placeholder="e.g. VIP, Support" className="input" />
        </div>
      )}

      {type === 'assign_agent' && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agent ID</label>
          <input type="text" value={config.agentId || ''} onChange={(e) => set({ agentId: e.target.value })} className="input" />
        </div>
      )}
    </div>
  );
}

interface AutomationEditorProps {
  automationId?: string;
  initialName?: string;
  initialSteps?: Step[];
}

export default function AutomationEditor({
  automationId,
  initialName = '',
  initialSteps = [],
}: AutomationEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [steps, setSteps] = useState<Step[]>(initialSteps.length > 0 ? initialSteps : [{ id: `step_${Date.now()}`, type: 'trigger_message', config: {} }]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(initialSteps.length > 0 ? null : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addMenuIndex, setAddMenuIndex] = useState<number | null>(null);

  const updateStepConfig = useCallback((index: number, config: Record<string, any>) => {
    setSteps((prev) => {
      const next = [...prev];
      const label = config.__label;
      const cleanConfig = { ...config };
      delete cleanConfig.__label;
      next[index] = { ...next[index], config: cleanConfig, ...(label !== undefined ? { label } : {}) };
      return next;
    });
  }, []);

  const addStep = useCallback((index: number, type: string) => {
    const newStep: Step = { id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, config: {} };
    setSteps((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, newStep);
      return next;
    });
    setAddMenuIndex(null);
    setExpandedIndex(index + 1);
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    setExpandedIndex(null);
  }, []);

  const moveStep = useCallback((index: number, direction: -1 | 1) => {
    setSteps((prev) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter an automation name');
      return;
    }
    if (steps.length === 0) {
      setError('Add at least one step');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        steps: steps.map((s) => ({
          id: s.id,
          type: s.type,
          label: s.label,
          config: s.config || {},
        })),
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
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-1 pb-4">
        <Link href="/dashboard/automations" className="btn-ghost rounded-xl p-2">
          <ChevronLeft size={18} />
        </Link>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Automation name..."
          className="input flex-1 text-lg font-semibold"
        />
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Steps */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-2 pb-8">
          {steps.map((step, index) => {
            const meta = STEP_TYPE_MAP[step.type] || STEP_TYPE_MAP.send_text;
            const Icon = meta.icon;
            const isExpanded = expandedIndex === index;
            const isFirst = index === 0;
            const isTrigger = step.type.startsWith('trigger_');

            return (
              <div key={step.id}>
                {/* Connector line */}
                {!isFirst && (
                  <div className="flex justify-center py-1">
                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                )}

                <div className={`rounded-2xl border ${meta.border} ${meta.bg} overflow-hidden transition-shadow duration-200 ${isExpanded ? 'shadow-sm' : ''}`}>
                  {/* Step header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/60 text-sm font-bold text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                      {index + 1}
                    </div>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg} border ${meta.border}`}>
                      <Icon size={16} className={meta.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold ${meta.color}`}>
                        {step.label || meta.label}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isTrigger && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStep(index, -1); }}
                            disabled={isFirst}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/60 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-gray-900/40 dark:hover:text-gray-200"
                            title="Move up"
                          >
                            <MoveUp size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStep(index, 1); }}
                            disabled={index === steps.length - 1}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/60 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-gray-900/40 dark:hover:text-gray-200"
                            title="Move down"
                          >
                            <MoveDown size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedIndex(isExpanded ? null : index); }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-white/60 hover:text-gray-700 dark:hover:bg-gray-900/40 dark:hover:text-gray-200"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {!isTrigger && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeStep(index); }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title="Remove step"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded config */}
                  {isExpanded && (
                    <div className="border-t border-gray-200/60 px-4 pb-4 dark:border-gray-700/60">
                      <StepConfigPanel step={step} onUpdate={(config) => updateStepConfig(index, config)} />
                    </div>
                  )}
                </div>

                {/* Add step button */}
                <div className="flex justify-center py-1">
                  <div className="relative">
                    <button
                      onClick={() => setAddMenuIndex(addMenuIndex === index ? null : index)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400"
                    >
                      <Plus size={14} />
                    </button>
                    {addMenuIndex === index && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setAddMenuIndex(null)} />
                        <div className="absolute left-1/2 top-full z-40 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                          {STEP_CATEGORIES.map((cat) => (
                            <div key={cat.label}>
                              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{cat.label}</div>
                              <div className="space-y-0.5">
                                {cat.items.map((item) => (
                                  <button
                                    key={item.type}
                                    onClick={() => addStep(index, item.type)}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60"
                                  >
                                    <item.icon size={16} className="shrink-0 text-gray-400" />
                                    <div>
                                      <div className="text-sm font-medium">{item.label}</div>
                                      <div className="text-xs text-gray-400">{item.desc}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
