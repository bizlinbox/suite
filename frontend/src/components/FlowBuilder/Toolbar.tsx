'use client';

import React from 'react';
import { useFlowStore } from './store';
import {
  ChevronLeft, Save, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize,
  Grid3X3, Play, Download, Upload, Search,
} from 'lucide-react';
import Link from 'next/link';

interface ToolbarProps {
  title?: string;
  onSave?: () => void;
  saving?: boolean;
  onRun?: () => void;
}

export default function Toolbar({ title = 'Flow Builder', onSave, saving, onRun }: ToolbarProps) {
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const deleteSelected = useFlowStore((s) => s.deleteSelected);
  const selectedNodeIds = useFlowStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useFlowStore((s) => s.selectedEdgeIds);
  const viewport = useFlowStore((s) => s.viewport);
  const setZoom = useFlowStore((s) => s.setZoom);
  const setViewport = useFlowStore((s) => s.setViewport);
  const snapToGrid = useFlowStore((s) => s.snapToGrid);
  const toggleSnap = useFlowStore((s) => s.toggleSnap);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const importFlow = useFlowStore((s) => s.importFlow);

  const hasSelection = selectedNodeIds.size > 0 || selectedEdgeIds.size > 0;

  const handleExport = () => {
    const data = { nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          if (data.nodes && data.edges) importFlow(data.nodes, data.edges);
        } catch {}
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
      <Link href="/dashboard/automations" className="mr-2 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
        <ChevronLeft size={18} />
      </Link>
      <h1 className="mr-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h1>

      <div className="flex items-center gap-1">
        <button onClick={undo} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" title="Undo (Ctrl+Z)">
          <Undo2 size={16} />
        </button>
        <button onClick={redo} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={16} />
        </button>
      </div>

      <div className="mx-2 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <button
        onClick={deleteSelected}
        disabled={!hasSelection}
        className="rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-900/20"
        title="Delete selected"
      >
        <Trash2 size={16} />
      </button>

      <div className="mx-2 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <div className="flex items-center gap-1">
        <button onClick={() => setZoom(viewport.zoom + 0.1)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <span className="w-12 text-center text-xs text-gray-500 dark:text-gray-400">{Math.round(viewport.zoom * 100)}%</span>
        <button onClick={() => setZoom(viewport.zoom - 0.1)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" title="Fit View">
          <Maximize size={16} />
        </button>
      </div>

      <div className="mx-2 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <button
        onClick={toggleSnap}
        className={`rounded-md p-1.5 ${snapToGrid ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
        title="Toggle Snap to Grid"
      >
        <Grid3X3 size={16} />
      </button>

      <div className="mx-2 h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <button onClick={handleExport} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" title="Export JSON">
        <Download size={16} />
      </button>
      <button onClick={handleImport} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" title="Import JSON">
        <Upload size={16} />
      </button>

      <div className="ml-auto flex items-center gap-2">
        {onRun && (
          <button onClick={onRun} className="btn-secondary text-xs">
            <Play size={14} />
            Run
          </button>
        )}
        {onSave && (
          <button onClick={onSave} disabled={saving} className="btn-primary text-xs">
            {saving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save size={14} />}
            Save
          </button>
        )}
      </div>
    </div>
  );
}
