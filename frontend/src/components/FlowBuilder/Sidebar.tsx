'use client';

import React, { useState } from 'react';
import { useFlowStore } from './store';
import { NodeTypeDef } from './types';
import { Search } from 'lucide-react';
import {
  MessageSquare, Send, Image, FileText, Video, Music,
  MousePointerClick, List, Clock, GitBranch, Tag, UserCheck,
  Sparkles, Play, Square, Cloud, Database, Code, Variable,
  Upload, Globe, Webhook, Zap,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<any>> = {
  MessageSquare, Send, Image, FileText, Video, Music,
  MousePointerClick, List, Clock, GitBranch, Tag, UserCheck,
  Sparkles, Play, Square, Cloud, Database, Code, Variable,
  Upload, Globe, Webhook, Zap,
};

function getIcon(type: string) {
  // map type strings to icons
  const map: Record<string, string> = {
    trigger_message: 'MessageSquare',
    trigger_conversation_opened: 'MessageSquare',
    trigger_webhook: 'Webhook',
    send_text: 'Send',
    send_template: 'Send',
    send_media_image: 'Image',
    send_media_video: 'Video',
    send_media_document: 'FileText',
    send_media_audio: 'Music',
    send_interactive_buttons: 'MousePointerClick',
    send_interactive_list: 'List',
    condition: 'GitBranch',
    delay: 'Clock',
    tag_contact: 'Tag',
    assign_agent: 'UserCheck',
    ai_agent: 'Sparkles',
  };
  const name = map[type] || 'Zap';
  return ICON_MAP[name] || Zap;
}

const NODE_CATEGORIES: { label: string; types: string[] }[] = [
  { label: 'Triggers', types: ['trigger_message', 'trigger_conversation_opened', 'trigger_webhook'] },
  { label: 'Messages', types: ['send_text', 'send_template', 'send_media_image', 'send_media_video', 'send_media_document', 'send_media_audio', 'send_interactive_buttons', 'send_interactive_list'] },
  { label: 'Logic', types: ['condition', 'delay'] },
  { label: 'Actions', types: ['tag_contact', 'assign_agent', 'ai_agent'] },
];

export const DEFAULT_NODE_TYPES: NodeTypeDef[] = [
  // Triggers
  { type: 'trigger_message', label: 'Message Received', category: 'Triggers', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', defaultSize: { width: 200, height: 80 }, defaultPorts: [{ id: 'out', type: 'output', label: '' }], defaultData: {}, fields: [] },
  { type: 'trigger_conversation_opened', label: 'Conversation Opened', category: 'Triggers', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', defaultSize: { width: 200, height: 80 }, defaultPorts: [{ id: 'out', type: 'output', label: '' }], defaultData: {}, fields: [] },
  { type: 'trigger_webhook', label: 'Webhook Event', category: 'Triggers', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', defaultSize: { width: 200, height: 80 }, defaultPorts: [{ id: 'out', type: 'output', label: '' }], defaultData: {}, fields: [] },
  // Messages
  { type: 'send_text', label: 'Send Text', category: 'Messages', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', defaultSize: { width: 200, height: 100 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { text: '' }, fields: [{ key: 'text', label: 'Message', type: 'textarea', placeholder: 'Enter message...' }] },
  { type: 'send_template', label: 'Send Template', category: 'Messages', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', defaultSize: { width: 200, height: 100 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { templateName: '', variables: '' }, fields: [{ key: 'templateName', label: 'Template Name', type: 'text' }, { key: 'variables', label: 'Variables', type: 'text' }] },
  { type: 'send_media_image', label: 'Send Image', category: 'Messages', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', defaultSize: { width: 200, height: 100 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { mediaUrl: '', caption: '' }, fields: [{ key: 'mediaUrl', label: 'Media URL', type: 'text' }, { key: 'caption', label: 'Caption', type: 'text' }] },
  { type: 'send_media_video', label: 'Send Video', category: 'Messages', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', defaultSize: { width: 200, height: 100 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { mediaUrl: '', caption: '' }, fields: [{ key: 'mediaUrl', label: 'Media URL', type: 'text' }, { key: 'caption', label: 'Caption', type: 'text' }] },
  { type: 'send_media_document', label: 'Send Document', category: 'Messages', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', defaultSize: { width: 200, height: 100 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { mediaUrl: '', caption: '' }, fields: [{ key: 'mediaUrl', label: 'Media URL', type: 'text' }, { key: 'caption', label: 'Caption', type: 'text' }] },
  { type: 'send_media_audio', label: 'Send Audio', category: 'Messages', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', defaultSize: { width: 200, height: 100 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { mediaUrl: '' }, fields: [{ key: 'mediaUrl', label: 'Audio URL', type: 'text' }] },
  { type: 'send_interactive_buttons', label: 'Button Menu', category: 'Messages', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', defaultSize: { width: 200, height: 120 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { body: '', buttons: '' }, fields: [{ key: 'body', label: 'Body', type: 'textarea' }, { key: 'buttons', label: 'Buttons (comma sep)', type: 'text' }] },
  { type: 'send_interactive_list', label: 'List Menu', category: 'Messages', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', defaultSize: { width: 200, height: 120 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { body: '', button: '', sections: '' }, fields: [{ key: 'body', label: 'Body', type: 'textarea' }, { key: 'button', label: 'Button', type: 'text' }] },
  // Logic
  { type: 'condition', label: 'Condition', category: 'Logic', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', defaultSize: { width: 200, height: 110 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'true', type: 'output', label: 'True' }, { id: 'false', type: 'output', label: 'False' }], defaultData: { condition: '' }, fields: [{ key: 'condition', label: 'Expression', type: 'text', placeholder: '{{variable}} == value' }] },
  { type: 'delay', label: 'Delay', category: 'Logic', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', defaultSize: { width: 200, height: 90 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { duration: 5, unit: 'minutes' }, fields: [{ key: 'duration', label: 'Duration', type: 'number' }, { key: 'unit', label: 'Unit', type: 'select', options: ['seconds', 'minutes', 'hours', 'days'] }] },
  // Actions
  { type: 'tag_contact', label: 'Tag Contact', category: 'Actions', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', defaultSize: { width: 200, height: 90 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { tags: '' }, fields: [{ key: 'tags', label: 'Tags (comma sep)', type: 'text' }] },
  { type: 'assign_agent', label: 'Assign Agent', category: 'Actions', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', defaultSize: { width: 200, height: 90 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { agentId: '' }, fields: [{ key: 'agentId', label: 'Agent ID', type: 'text' }] },
  { type: 'ai_agent', label: 'AI Agent', category: 'Actions', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', defaultSize: { width: 200, height: 90 }, defaultPorts: [{ id: 'in', type: 'input', label: '' }, { id: 'out', type: 'output', label: '' }], defaultData: { agentId: '' }, fields: [{ key: 'agentId', label: 'AI Agent ID', type: 'text' }] },
];

export default function Sidebar() {
  const addNode = useFlowStore((s) => s.addNode);
  const nodeTypes = useFlowStore((s) => s.nodeTypes);
  const [search, setSearch] = useState('');

  const types = nodeTypes.length > 0 ? nodeTypes : DEFAULT_NODE_TYPES;
  const filtered = types.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()));

  const handleDragStart = (e: React.DragEvent, typeDef: NodeTypeDef) => {
    e.dataTransfer.setData('application/json', JSON.stringify(typeDef));
  };

  const handleAdd = (typeDef: NodeTypeDef) => {
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    addNode({
      id,
      type: typeDef.type,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 100 },
      size: typeDef.defaultSize,
      data: { ...typeDef.defaultData },
      ports: typeDef.defaultPorts.map((p) => ({ ...p })),
    });
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="input w-full pl-7 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {NODE_CATEGORIES.map((cat) => {
          const catTypes = filtered.filter((t) => cat.types.includes(t.type));
          if (catTypes.length === 0) return null;
          return (
            <div key={cat.label} className="mb-3">
              <h4 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {cat.label}
              </h4>
              <div className="space-y-1">
                {catTypes.map((typeDef) => {
                  const Icon = getIcon(typeDef.type);
                  return (
                    <div
                      key={typeDef.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, typeDef)}
                      onClick={() => handleAdd(typeDef)}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors hover:shadow-sm ${typeDef.bg} ${typeDef.border} ${typeDef.color}`}
                    >
                      <Icon size={14} className="shrink-0" />
                      <span className="truncate">{typeDef.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
