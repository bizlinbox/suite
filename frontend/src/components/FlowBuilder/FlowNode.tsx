'use client';

import React, { useCallback, useMemo } from 'react';
import { useFlowStore } from './store';
import { FlowNode as FlowNodeType } from './types';
import {
  LuMessageSquare as MessageSquare,
  LuSend as Send,
  LuImage as Image,
  LuFileText as FileText,
  LuVideo as Video,
  LuMusic as Music,
  LuMousePointerClick as MousePointerClick,
  LuList as List,
  LuClock as Clock,
  LuGitBranch as GitBranch,
  LuTag as Tag,
  LuUserCheck as UserCheck,
  LuPlay as Play,
  LuSquare as Square,
  LuCloud as Cloud,
  LuDatabase as Database,
  LuCode as Code,
  LuVariable as Variable,
  LuUpload as Upload,
  LuGlobe as Globe,
  LuWebhook as Webhook,
  LuZap as Zap,
  LuSettings as Settings,
} from 'react-icons/lu';

const ICON_MAP: Record<string, React.FC<any>> = {
  trigger_message: MessageSquare,
  trigger_conversation_opened: MessageSquare,
  trigger_webhook: Webhook,
  send_text: Send,
  send_template: Send,
  send_media_image: Image,
  send_media_video: Video,
  send_media_document: FileText,
  send_media_audio: Music,
  send_interactive_buttons: MousePointerClick,
  send_interactive_list: List,
  condition: GitBranch,
  delay: Clock,
  tag_contact: Tag,
  assign_agent: UserCheck,
  start: Play,
  end: Square,
  http_request: Cloud,
  database: Database,
  function: Code,
  variable: Variable,
  user_input: MessageSquare,
  file_upload: Upload,
  image: Image,
  audio: Music,
  video: Video,
  webhook: Webhook,
  custom: Zap,
  default: Settings,
};

const TYPE_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  trigger_message: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  trigger_conversation_opened: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  trigger_webhook: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  send_text: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  send_template: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  send_media_image: { color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
  send_media_video: { color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
  send_media_document: { color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
  send_media_audio: { color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
  send_interactive_buttons: { color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
  send_interactive_list: { color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
  condition: { color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
  delay: { color: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' },
  tag_contact: { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
  assign_agent: { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
  start: { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
  end: { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  http_request: { color: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800' },
  database: { color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800' },
  function: { color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-800/50', border: 'border-gray-200 dark:border-gray-700' },
  variable: { color: 'text-pink-700 dark:text-pink-300', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' },
  user_input: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  webhook: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
};

function getNodeStyle(type: string) {
  return TYPE_STYLE[type] || { color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-800/50', border: 'border-gray-200 dark:border-gray-700' };
}

function getNodeIcon(type: string) {
  return ICON_MAP[type] || ICON_MAP.default;
}

export default function FlowNodeComponent({ node }: { node: FlowNodeType }) {
  const selectNode = useFlowStore((s) => s.selectNode);
  const selectedNodeIds = useFlowStore((s) => s.selectedNodeIds);
  const startDragNode = useFlowStore((s) => s.startDragNode);
  const startConnect = useFlowStore((s) => s.startConnect);
  const endConnect = useFlowStore((s) => s.endConnect);
  const connecting = useFlowStore((s) => s.connecting);
  const viewport = useFlowStore((s) => s.viewport);
  const nodeTypes = useFlowStore((s) => s.nodeTypes);

  const isSelected = selectedNodeIds.has(node.id);
  const style = getNodeStyle(node.type);
  const Icon = getNodeIcon(node.type);
  const nodeTypeDef = nodeTypes.find((t) => t.type === node.type);
  const label = node.label || nodeTypeDef?.label || node.type;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const multi = e.ctrlKey || e.metaKey || e.shiftKey;
      selectNode(node.id, multi);
      startDragNode(node.id, { x: e.clientX, y: e.clientY });
    },
    [node, selectNode, startDragNode]
  );

  const inputPorts = useMemo(() => node.ports.filter((p) => p.type === 'input'), [node.ports]);
  const outputPorts = useMemo(() => node.ports.filter((p) => p.type === 'output'), [node.ports]);

  return (
    <div
      className={`absolute select-none rounded-lg border-2 shadow-sm transition-shadow ${style.bg} ${style.border} ${
        isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
      }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size.width,
        height: node.size.height,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 rounded-t-md px-3 py-2 ${style.bg}`}>
        <Icon size={16} className={`shrink-0 ${style.color}`} />
        <span className={`truncate text-xs font-semibold ${style.color}`}>{label}</span>
      </div>

      {/* Body */}
      <div className="relative px-3 pb-3">
        {/* Input ports */}
        {inputPorts.map((port, i) => (
          <div
            key={port.id}
            className="absolute -left-[7px] flex cursor-pointer items-center gap-1"
            style={{ top: 18 + i * 20 }}
            onMouseUp={(e) => {
              e.stopPropagation();
              if (connecting) endConnect(node.id, port.id);
            }}
          >
            <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500 shadow-sm ring-1 ring-blue-500 hover:scale-125 transition-transform" />
            <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{port.label}</span>
          </div>
        ))}

        {/* Output ports */}
        {outputPorts.map((port, i) => (
          <div
            key={port.id}
            className="absolute -right-[7px] flex cursor-pointer items-center gap-1"
            style={{ top: 18 + i * 20 }}
            onMouseDown={(e) => {
              e.stopPropagation();
              startConnect(node.id, port.id);
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              if (connecting) endConnect(node.id, port.id);
            }}
          >
            <span className="mr-1 text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{port.label}</span>
            <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm ring-1 ring-emerald-500 hover:scale-125 transition-transform" />
          </div>
        ))}

        {/* Config preview */}
        {Object.keys(node.data).length > 0 && (
          <div className="mt-2 max-h-16 overflow-hidden text-[10px] text-gray-500 dark:text-gray-400">
            {Object.entries(node.data)
              .slice(0, 2)
              .map(([k, v]) => (
                <div key={k} className="truncate">
                  {k}: {String(v).slice(0, 30)}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
