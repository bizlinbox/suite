'use client';

import React, { useEffect, useCallback } from 'react';
import { useFlowStore } from './store';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import Sidebar, { DEFAULT_NODE_TYPES } from './Sidebar';
import PropertiesPanel from './PropertiesPanel';
import { FlowNode, FlowEdge } from './types';

interface FlowBuilderProps {
  title?: string;
  initialNodes?: FlowNode[];
  initialEdges?: FlowEdge[];
  onSave?: (data: { nodes: FlowNode[]; edges: FlowEdge[] }) => void;
  saving?: boolean;
}

export default function FlowBuilder({ title, initialNodes, initialEdges, onSave, saving }: FlowBuilderProps) {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setNodeTypes = useFlowStore((s) => s.setNodeTypes);
  const importFlow = useFlowStore((s) => s.importFlow);
  const reset = useFlowStore((s) => s.reset);
  const addNode = useFlowStore((s) => s.addNode);
  const deleteSelected = useFlowStore((s) => s.deleteSelected);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const clearSelection = useFlowStore((s) => s.clearSelection);
  const pushHistory = useFlowStore((s) => s.pushHistory);

  useEffect(() => {
    reset();
    setNodeTypes(DEFAULT_NODE_TYPES);
    if (initialNodes && initialEdges) {
      importFlow(initialNodes, initialEdges);
    }
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(() => {
    onSave?.({ nodes, edges });
  }, [nodes, edges, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key === 'Escape') {
        clearSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        // select all nodes
        const allIds = nodes.map((n) => n.id);
        useFlowStore.setState({ selectedNodeIds: new Set(allIds), selectedEdgeIds: new Set() });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelected, clearSelection, undo, redo, nodes, handleSave]);

  // Drag from sidebar onto canvas
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      try {
        const typeDef = JSON.parse(data);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const viewport = useFlowStore.getState().viewport;
        const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
        const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
        const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        addNode({
          id,
          type: typeDef.type,
          position: { x, y },
          size: typeDef.defaultSize,
          data: { ...typeDef.defaultData },
          ports: typeDef.defaultPorts.map((p: any) => ({ ...p })),
        });
        pushHistory();
      } catch {}
    },
    [addNode, pushHistory]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <Toolbar title={title} onSave={handleSave} saving={saving} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1" onDrop={handleDrop} onDragOver={handleDragOver}>
          <Canvas />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}
