'use client';

import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  MessageSquare, Send, Image, FileText, Video, Music,
  MousePointerClick, List, Clock, GitBranch, Tag, UserCheck,
  ChevronLeft, Save, Trash2, Loader2, Plus, X, SlidersHorizontal,
  HelpCircle, AlertCircle, MousePointer, ArrowDown, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const NODE_COLORS: Record<string, { bg: string; border: string; handle: string; iconBg: string; text: string }> = {
  trigger_message: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', handle: 'bg-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300', text: 'text-amber-800 dark:text-amber-200' },
  trigger_conversation_opened: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', handle: 'bg-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300', text: 'text-amber-800 dark:text-amber-200' },
  send_text: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', handle: 'bg-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300', text: 'text-blue-800 dark:text-blue-200' },
  send_template: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', handle: 'bg-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300', text: 'text-blue-800 dark:text-blue-200' },
  send_media_image: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-300 dark:border-indigo-700', handle: 'bg-indigo-500', iconBg: 'bg-indigo-100 dark:bg-indigo-800/40 text-indigo-700 dark:text-indigo-300', text: 'text-indigo-800 dark:text-indigo-200' },
  send_media_video: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-300 dark:border-indigo-700', handle: 'bg-indigo-500', iconBg: 'bg-indigo-100 dark:bg-indigo-800/40 text-indigo-700 dark:text-indigo-300', text: 'text-indigo-800 dark:text-indigo-200' },
  send_media_document: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-300 dark:border-indigo-700', handle: 'bg-indigo-500', iconBg: 'bg-indigo-100 dark:bg-indigo-800/40 text-indigo-700 dark:text-indigo-300', text: 'text-indigo-800 dark:text-indigo-200' },
  send_media_audio: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-300 dark:border-indigo-700', handle: 'bg-indigo-500', iconBg: 'bg-indigo-100 dark:bg-indigo-800/40 text-indigo-700 dark:text-indigo-300', text: 'text-indigo-800 dark:text-indigo-200' },
  send_interactive_buttons: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700', handle: 'bg-purple-500', iconBg: 'bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300', text: 'text-purple-800 dark:text-purple-200' },
  send_interactive_list: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700', handle: 'bg-purple-500', iconBg: 'bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300', text: 'text-purple-800 dark:text-purple-200' },
  condition: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700', handle: 'bg-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-800/40 text-orange-700 dark:text-orange-300', text: 'text-orange-800 dark:text-orange-200' },
  delay: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-300 dark:border-cyan-700', handle: 'bg-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-800/40 text-cyan-700 dark:text-cyan-300', text: 'text-cyan-800 dark:text-cyan-200' },
  tag_contact: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-700', handle: 'bg-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300', text: 'text-emerald-800 dark:text-emerald-200' },
  assign_agent: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-700', handle: 'bg-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300', text: 'text-emerald-800 dark:text-emerald-200' },
};

const NODE_ICONS: Record<string, React.FC<any>> = {
  trigger_message: MessageSquare, trigger_conversation_opened: MessageSquare,
  send_text: Send, send_template: Send,
  send_media_image: Image, send_media_video: Video, send_media_document: FileText, send_media_audio: Music,
  send_interactive_buttons: MousePointerClick, send_interactive_list: List,
  condition: GitBranch, delay: Clock, tag_contact: Tag, assign_agent: UserCheck,
};

const NODE_LABELS: Record<string, string> = {
  trigger_message: 'Message Received', trigger_conversation_opened: 'Conversation Opened',
  send_text: 'Send Text', send_template: 'Send Template',
  send_media_image: 'Send Image', send_media_video: 'Send Video', send_media_document: 'Send Document', send_media_audio: 'Send Audio',
  send_interactive_buttons: 'Button Menu', send_interactive_list: 'List Menu',
  condition: 'Condition', delay: 'Delay', tag_contact: 'Tag Contact', assign_agent: 'Assign Agent',
};

const NODE_DESCRIPTIONS: Record<string, string> = {
  trigger_message: 'Starts when a message is received',
  trigger_conversation_opened: 'Starts when a conversation is opened',
  send_text: 'Sends a plain text message',
  send_template: 'Sends an approved WhatsApp template',
  send_media_image: 'Sends an image with optional caption',
  send_media_video: 'Sends a video with optional caption',
  send_media_document: 'Sends a document file',
  send_media_audio: 'Sends an audio file',
  send_interactive_buttons: 'Sends a message with up to 3 buttons',
  send_interactive_list: 'Sends a message with a list menu',
  condition: 'Branches flow based on a condition',
  delay: 'Waits for a specified duration',
  tag_contact: 'Adds a tag to the contact',
  assign_agent: 'Assigns the conversation to an agent',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Triggers: 'Events that start the automation',
  Messages: 'Send messages and media to contacts',
  Logic: 'Control flow with conditions and delays',
  Actions: 'Update contact data or assign agents',
};

function BaseNode({ data, id, children }: { data: any; id: string; children: React.ReactNode }) {
  const colors = NODE_COLORS[data.type] || NODE_COLORS.send_text;
  const Icon = NODE_ICONS[data.type] || Send;
  const isTrigger = data.type?.startsWith('trigger_');
  const [hovered, setHovered] = useState(false);
  const deleteNode = (window as any).__deleteNode;

  return (
    <div
      className={`relative w-56 rounded-xl border-2 ${colors.border} ${colors.bg} p-4 shadow-sm transition-shadow duration-200 hover:shadow-md`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isTrigger && <Handle type="target" position={Position.Top} className={`h-3 w-3 ${colors.handle}`} />}
      <Handle type="source" position={Position.Bottom} className={`h-3 w-3 ${colors.handle}`} />
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${colors.iconBg}`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <span className={`block text-sm font-semibold ${colors.text}`}>{data.label || NODE_LABELS[data.type]}</span>
          {children}
        </div>
      </div>
      {hovered && deleteNode && (
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
          title="Delete node"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function ConditionNode({ data, id }: { data: any; id: string }) {
  const colors = NODE_COLORS.condition;
  const [hovered, setHovered] = useState(false);
  const deleteNode = (window as any).__deleteNode;

  return (
    <div
      className={`relative w-56 rounded-xl border-2 ${colors.border} ${colors.bg} p-4 shadow-sm transition-shadow duration-200 hover:shadow-md`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={Position.Top} className={`h-3 w-3 ${colors.handle}`} />
      <Handle type="source" position={Position.Bottom} id="true" className={`h-3 w-3 ${colors.handle}`} style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="false" className={`h-3 w-3 ${colors.handle}`} style={{ left: '70%' }} />
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${colors.iconBg}`}>
          <GitBranch size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <span className={`block text-sm font-semibold ${colors.text}`}>{data.label || 'Condition'}</span>
          {data.config?.field && (
            <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{data.config.field} {data.config.operator} {data.config.value}</p>
          )}
        </div>
      </div>
      <div className="absolute -bottom-5 left-[30%] -translate-x-1/2 text-[10px] font-medium text-gray-500 dark:text-gray-400">Yes</div>
      <div className="absolute -bottom-5 left-[70%] -translate-x-1/2 text-[10px] font-medium text-gray-500 dark:text-gray-400">No</div>
      {hovered && deleteNode && (
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
          title="Delete node"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function TriggerNode({ data, id }: { data: any; id: string }) {
  return (
    <BaseNode data={data} id={id}>
      {data.config?.keyword && <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">Keyword: {data.config.keyword}</p>}
    </BaseNode>
  );
}

function MessageNode({ data, id }: { data: any; id: string }) {
  return (
    <BaseNode data={data} id={id}>
      {data.config?.content && <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{data.config.content}</p>}
      {data.config?.templateName && <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">Template: {data.config.templateName}</p>}
      {data.config?.caption && <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{data.config.caption}</p>}
      {data.config?.body && <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{data.config.body}</p>}
      {data.config?.durationMs && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{Math.round(data.config.durationMs / 1000)}s</p>}
      {data.config?.tag && <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">Tag: {data.config.tag}</p>}
    </BaseNode>
  );
}

const nodeTypes: Record<string, React.FC<any>> = {
  trigger_message: TriggerNode,
  trigger_conversation_opened: TriggerNode,
  send_text: MessageNode,
  send_template: MessageNode,
  send_media_image: MessageNode,
  send_media_video: MessageNode,
  send_media_document: MessageNode,
  send_media_audio: MessageNode,
  send_interactive_buttons: MessageNode,
  send_interactive_list: MessageNode,
  condition: ConditionNode,
  delay: MessageNode,
  tag_contact: MessageNode,
  assign_agent: MessageNode,
};

const NODE_CATEGORIES = [
  { label: 'Triggers', items: [{ type: 'trigger_message', icon: MessageSquare }, { type: 'trigger_conversation_opened', icon: MessageSquare }] },
  { label: 'Messages', items: [{ type: 'send_text', icon: Send }, { type: 'send_template', icon: Send }, { type: 'send_media_image', icon: Image }, { type: 'send_media_video', icon: Video }, { type: 'send_media_document', icon: FileText }, { type: 'send_media_audio', icon: Music }, { type: 'send_interactive_buttons', icon: MousePointerClick }, { type: 'send_interactive_list', icon: List }] },
  { label: 'Logic', items: [{ type: 'condition', icon: GitBranch }, { type: 'delay', icon: Clock }] },
  { label: 'Actions', items: [{ type: 'tag_contact', icon: Tag }, { type: 'assign_agent', icon: UserCheck }] },
];


function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: { node: Node; onUpdate: (config: Record<string, any>) => void; onDelete: () => void; onClose?: () => void }) {
  const config: any = node.data.config || {};
  const type = node.type || '';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{NODE_LABELS[type]}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{NODE_DESCRIPTIONS[type]}</p>
        </div>
        <div className="flex items-center gap-1">
          {onClose && (
            <button onClick={onClose} className="btn-ghost rounded-md p-1.5">
              <X size={16} />
            </button>
          )}
          <button onClick={onDelete} className="btn-danger rounded-md p-1.5">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {type === 'trigger_message' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Keyword <span className="text-xs font-normal text-gray-400">(optional)</span></label>
          <input type="text" value={config.keyword || ''} onChange={(e) => onUpdate({ keyword: e.target.value })} placeholder="e.g. help, start" className="input" />
          <p className="text-xs text-gray-400">Leave empty to trigger on any message</p>
        </div>
      )}

      {type === 'send_text' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message Content</label>
          <textarea value={config.content || ''} onChange={(e) => onUpdate({ content: e.target.value })} rows={4} className="input" />
        </div>
      )}

      {type === 'send_template' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Name</label>
            <input type="text" value={config.templateName || ''} onChange={(e) => onUpdate({ templateName: e.target.value })} className="input" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
            <input type="text" value={config.language || 'en'} onChange={(e) => onUpdate({ language: e.target.value })} className="input" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Variables (JSON)</label>
            <textarea value={JSON.stringify(config.variables || {}, null, 2)}
              onChange={(e) => { try { onUpdate({ variables: JSON.parse(e.target.value) }); } catch {} }}
              rows={3} className="input font-mono text-xs" />
          </div>
        </div>
      )}

      {type.startsWith('send_media_') && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Media URL</label>
            <input type="text" value={config.mediaUrl || ''} onChange={(e) => onUpdate({ mediaUrl: e.target.value })} placeholder="https://example.com/image.jpg" className="input" />
          </div>
          {type !== 'send_media_audio' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Caption</label>
              <input type="text" value={config.caption || ''} onChange={(e) => onUpdate({ caption: e.target.value })} className="input" />
            </div>
          )}
        </div>
      )}

      {(type === 'send_interactive_buttons' || type === 'send_interactive_list') && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Body Text</label>
            <textarea value={config.body || ''} onChange={(e) => onUpdate({ body: e.target.value })} rows={3} className="input" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Footer <span className="text-xs font-normal text-gray-400">(optional)</span></label>
            <input type="text" value={config.footer || ''} onChange={(e) => onUpdate({ footer: e.target.value })} className="input" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Options <span className="text-xs font-normal text-gray-400">(one per line)</span></label>
            <textarea value={(config.buttons || []).join('\n')}
              onChange={(e) => onUpdate({ buttons: e.target.value.split('\n').filter(Boolean) })} rows={4} className="input" />
          </div>
        </div>
      )}

      {type === 'condition' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Field</label>
            <select value={config.field || 'message'} onChange={(e) => onUpdate({ field: e.target.value })} className="input">
              <option value="message">Message Text</option><option value="contact_name">Contact Name</option><option value="contact_tag">Contact Tag</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Operator</label>
            <select value={config.operator || 'contains'} onChange={(e) => onUpdate({ operator: e.target.value })} className="input">
              <option value="contains">Contains</option><option value="equals">Equals</option><option value="starts_with">Starts With</option><option value="not_empty">Not Empty</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value</label>
            <input type="text" value={config.value || ''} onChange={(e) => onUpdate({ value: e.target.value })} className="input" />
          </div>
        </div>
      )}

      {type === 'delay' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Delay (seconds)</label>
          <input type="number" min={1} value={Math.round((config.durationMs || 5000) / 1000)} onChange={(e) => onUpdate({ durationMs: parseInt(e.target.value || '1') * 1000 })} className="input" />
        </div>
      )}

      {type === 'tag_contact' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag Name</label>
          <input type="text" value={config.tag || ''} onChange={(e) => onUpdate({ tag: e.target.value })} placeholder="e.g. VIP, Support" className="input" />
        </div>
      )}

      {type === 'assign_agent' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Agent ID</label>
          <input type="text" value={config.agentId || ''} onChange={(e) => onUpdate({ agentId: e.target.value })} className="input" />
        </div>
      )}
    </div>
  );
}

interface AutomationEditorProps {
  automationId?: string;
  initialName?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
}

export default function AutomationEditor({
  automationId,
  initialName = '',
  initialNodes = [],
  initialEdges = [],
}: AutomationEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    (window as any).__deleteNode = (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedNode(null);
    };
    return () => { (window as any).__deleteNode = undefined; };
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1' } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowInstance) return;
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: { type, label: NODE_LABELS[type], config: {} },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter an automation name');
      return;
    }
    if (nodes.length === 0) {
      setError('Add at least one node');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        triggerType: 'message_received',
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: n.data.label,
          positionX: n.position.x,
          positionY: n.position.y,
          config: n.data.config || {},
        })),
        edges: edges.map((e) => ({
          id: e.id,
          sourceNodeId: e.source,
          targetNodeId: e.target,
          label: e.label || '',
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
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/automations" className="btn-ghost rounded-lg p-2">
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
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      <div className="flex flex-1 gap-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        {/* Sidebar */}
        <div className={`flex flex-col border-r border-gray-200 bg-gray-50/80 transition-all dark:border-gray-800 dark:bg-gray-900/50 ${sidebarOpen ? 'w-64 px-3 py-3' : 'w-0 overflow-hidden'}`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nodes</h3>
            <button onClick={() => setSidebarOpen(false)} className="btn-ghost rounded-md p-1"><X size={14} /></button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto">
            {NODE_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{cat.label}</h4>
                <div className="space-y-1">
                  {cat.items.map((item) => (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('application/reactflow', item.type)}
                      className="flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <item.icon size={14} />
                      {NODE_LABELS[item.type]}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="absolute left-4 top-24 z-10 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800">
            <Plus size={14} />
            Nodes
          </button>
        )}

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap className="!bottom-2 !right-2 !w-40 !h-24" />
          </ReactFlow>
        </div>

        {/* Config panel */}
        {selectedNode && (
          <div className="w-80 overflow-y-auto border-l border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <NodeConfigPanel
              node={selectedNode}
              onUpdate={(config) => {
                setNodes((nds) =>
                  nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, config } } : n))
                );
                setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, config } } : prev));
              }}
              onDelete={() => {
                setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
                setSelectedNode(null);
              }}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
