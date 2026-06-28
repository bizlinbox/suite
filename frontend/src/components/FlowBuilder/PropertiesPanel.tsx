'use client';

import React from 'react';
import { useFlowStore } from './store';
import { X } from 'lucide-react';

export default function PropertiesPanel() {
  const selectedNodeIds = useFlowStore((s) => s.selectedNodeIds);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNode = useFlowStore((s) => s.updateNode);
  const nodeTypes = useFlowStore((s) => s.nodeTypes);
  const clearSelection = useFlowStore((s) => s.clearSelection);

  const ids = [...selectedNodeIds];
  if (ids.length !== 1) return null;

  const node = nodes.find((n) => n.id === ids[0]);
  if (!node) return null;

  const nodeTypeDef = nodeTypes.find((t) => t.type === node.type);
  const label = node.label || nodeTypeDef?.label || node.type;

  const setData = (patch: Record<string, any>) => {
    updateNode(node.id, { data: { ...node.data, ...patch } });
  };

  const setLabel = (value: string) => {
    updateNode(node.id, { label: value });
  };

  return (
    <div className="flex h-full w-72 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Properties</h3>
        <button onClick={clearSelection} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input w-full text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</label>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {nodeTypeDef?.label || node.type}
          </div>
        </div>

        {nodeTypeDef?.fields?.map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={node.data[field.key] || ''}
                onChange={(e) => setData({ [field.key]: e.target.value })}
                rows={3}
                className="input w-full text-sm resize-none"
                placeholder={field.placeholder}
              />
            ) : field.type === 'select' ? (
              <select
                value={node.data[field.key] || ''}
                onChange={(e) => setData({ [field.key]: e.target.value })}
                className="input w-full text-sm"
              >
                {field.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={!!node.data[field.key]}
                onChange={(e) => setData({ [field.key]: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
              />
            ) : field.type === 'number' ? (
              <input
                type="number"
                value={node.data[field.key] || 0}
                onChange={(e) => setData({ [field.key]: Number(e.target.value) })}
                className="input w-full text-sm"
              />
            ) : (
              <input
                type="text"
                value={node.data[field.key] || ''}
                onChange={(e) => setData({ [field.key]: e.target.value })}
                className="input w-full text-sm"
                placeholder={field.placeholder}
              />
            )}
          </div>
        ))}

        {!nodeTypeDef?.fields?.length && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              JSON Config
            </label>
            <textarea
              value={JSON.stringify(node.data, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setData(parsed);
                } catch {}
              }}
              rows={8}
              className="input w-full text-xs font-mono resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
