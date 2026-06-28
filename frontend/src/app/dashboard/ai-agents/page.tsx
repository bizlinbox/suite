'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import {
  Plus, Edit, Trash2, Loader2, Save, X, Sparkles, Send,
  MessageSquare, Check, AlertCircle, Brain,
} from 'lucide-react';

interface AIAgent {
  id: string;
  name: string;
  provider: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  autoReplyEnabled: boolean;
  triggerKeywords: string[];
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'] },
  { value: 'google', label: 'Google', models: ['gemini-1.5-flash', 'gemini-1.5-pro'] },
];

export default function AIAgentsPage() {
  const { can } = usePermission();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testAgent, setTestAgent] = useState<AIAgent | null>(null);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful customer support assistant. Respond concisely and professionally.',
    temperature: 0.7,
    maxTokens: 1024,
    autoReplyEnabled: false,
    triggerKeywords: '',
  });

  const fetchAgents = async () => {
    try {
      const res = await api.get('/ai-agents');
      setAgents(res.data.agents || []);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const openCreate = () => {
    setEditingAgent(null);
    setForm({
      name: '', provider: 'openai', apiKey: '', model: 'gpt-4o-mini',
      systemPrompt: 'You are a helpful customer support assistant. Respond concisely and professionally.',
      temperature: 0.7, maxTokens: 1024, autoReplyEnabled: false, triggerKeywords: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      provider: agent.provider,
      apiKey: '',
      model: agent.model,
      systemPrompt: agent.systemPrompt,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      autoReplyEnabled: agent.autoReplyEnabled,
      triggerKeywords: (agent.triggerKeywords || []).join(', '),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        provider: form.provider,
        api_key: form.apiKey || undefined,
        model: form.model,
        system_prompt: form.systemPrompt,
        temperature: form.temperature,
        max_tokens: form.maxTokens,
        auto_reply_enabled: form.autoReplyEnabled,
        trigger_keywords: form.triggerKeywords.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editingAgent) {
        await api.put(`/ai-agents/${editingAgent.id}`, payload);
      } else {
        await api.post('/ai-agents', payload);
      }
      setDialogOpen(false);
      fetchAgents();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this AI agent?')) return;
    try {
      await api.delete(`/ai-agents/${id}`);
      fetchAgents();
    } catch {
      // ignore
    }
  };

  const handleTest = async () => {
    if (!testAgent) return;
    setTestLoading(true);
    setTestResponse('');
    try {
      const res = await api.post(`/ai-agents/${testAgent.id}/test`, {
        messages: [{ role: 'user', content: testPrompt }],
      });
      setTestResponse(res.data.response);
    } catch (err: any) {
      setTestResponse(`Error: ${err.response?.data?.error || 'Failed'}`);
    } finally {
      setTestLoading(false);
    }
  };

  const models = PROVIDERS.find((p) => p.value === form.provider)?.models || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Agents</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure BYOK AI assistants for automated and assisted replies</p>
        </div>
        {can('settings.manage') && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} />
            New Agent
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
        </div>
      ) : agents.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center py-16 text-center">
          <Brain size={40} className="mb-4 text-gray-300 dark:text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No AI Agents yet</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Bring your own API key from OpenAI, Anthropic, or Google to enable AI-powered replies in conversations.
          </p>
          {can('settings.manage') && (
            <button onClick={openCreate} className="btn-primary mt-4">
              <Plus size={16} />
              Create AI Agent
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="panel flex flex-col p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${agent.isActive ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{agent.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{agent.provider} &middot; {agent.model}</p>
                  </div>
                </div>
                <span className={`badge ${agent.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {agent.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mb-4 flex-1 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Brain size={14} />
                  <span className="truncate">{agent.systemPrompt.slice(0, 60)}...</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <MessageSquare size={14} />
                  <span>Temp: {agent.temperature} &middot; Max: {agent.maxTokens} tokens</span>
                </div>
                {agent.autoReplyEnabled && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <Check size={14} />
                    <span>Auto-reply enabled</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => { setTestAgent(agent); setTestPrompt(''); setTestResponse(''); setTestOpen(true); }}
                  className="btn-secondary flex-1 text-xs py-2"
                >
                  <Send size={14} />
                  Test
                </button>
                {can('settings.manage') && (
                  <>
                    <button onClick={() => openEdit(agent)} className="btn-ghost p-2" title="Edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(agent.id)} className="btn-ghost p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}>
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingAgent ? 'Edit AI Agent' : 'New AI Agent'}
              </h2>
              <button onClick={() => setDialogOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Support Bot" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Provider</label>
                  <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value, model: PROVIDERS.find((p) => p.value === e.target.value)?.models[0] || '' })} className="input">
                    {PROVIDERS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Model</label>
                  <select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="input">
                    {models.map((m) => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">API Key</label>
                <input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} className="input" placeholder={editingAgent ? 'Leave blank to keep existing' : 'sk-...'} />
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Your key is encrypted and never shared. We only use it to generate replies.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">System Prompt</label>
                <textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} rows={3} className="input" placeholder="You are a helpful assistant..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Temperature</label>
                  <input type="number" min={0} max={2} step={0.1} value={form.temperature} onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })} className="input" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Max Tokens</label>
                  <input type="number" min={1} max={8192} value={form.maxTokens} onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })} className="input" />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <input
                  id="autoReply"
                  type="checkbox"
                  checked={form.autoReplyEnabled}
                  onChange={(e) => setForm({ ...form, autoReplyEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="autoReply" className="text-sm text-gray-700 dark:text-gray-300">
                  Enable auto-reply
                  <span className="block text-xs text-gray-400 dark:text-gray-500">Automatically respond to incoming messages matching keywords</span>
                </label>
              </div>

              {form.autoReplyEnabled && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trigger Keywords <span className="font-normal normal-case text-gray-400">(comma separated, empty = all messages)</span></label>
                  <input type="text" value={form.triggerKeywords} onChange={(e) => setForm({ ...form, triggerKeywords: e.target.value })} className="input" placeholder="support, help, question" />
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setDialogOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Dialog */}
      {testOpen && testAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setTestOpen(false); }}>
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Test {testAgent.name}</h2>
              <button onClick={() => setTestOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your message</label>
                <textarea value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} rows={3} className="input" placeholder="Hello, I need help with..." />
              </div>
              <button onClick={handleTest} disabled={testLoading || !testPrompt.trim()} className="btn-primary w-full">
                {testLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Generate Response
              </button>
              {testResponse && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Response</label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {testResponse}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
