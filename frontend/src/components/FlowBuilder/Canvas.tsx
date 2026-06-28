'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useFlowStore } from './store';
import FlowNode from './FlowNode';
import FlowEdge from './FlowEdge';
import { Point } from './types';

function getEventPoint(e: React.MouseEvent | MouseEvent): Point {
  return { x: e.clientX, y: e.clientY };
}

function getLocalPoint(clientPoint: Point, viewport: { x: number; y: number; zoom: number }, rect: DOMRect): Point {
  return {
    x: (clientPoint.x - rect.left - viewport.x) / viewport.zoom,
    y: (clientPoint.y - rect.top - viewport.y) / viewport.zoom,
  };
}

export default function Canvas({ children }: { children?: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewport = useFlowStore((s) => s.viewport);
  const pan = useFlowStore((s) => s.pan);
  const zoomAt = useFlowStore((s) => s.zoomAt);
  const clearSelection = useFlowStore((s) => s.clearSelection);
  const endDragNode = useFlowStore((s) => s.endDragNode);
  const moveDragNode = useFlowStore((s) => s.moveDragNode);
  const cancelConnect = useFlowStore((s) => s.cancelConnect);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const connecting = useFlowStore((s) => s.connecting);
  const snapToGrid = useFlowStore((s) => s.snapToGrid);
  const gridSize = useFlowStore((s) => s.gridSize);

  const [panning, setPanning] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectRect, setSelectRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [connectMouse, setConnectMouse] = useState<{ x: number; y: number } | null>(null);
  const panStart = useRef<Point | null>(null);
  const selectStart = useRef<Point | null>(null);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current!.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      zoomAt(point, delta);
    },
    [zoomAt]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        // Middle mouse or Shift+Left = pan
        e.preventDefault();
        setPanning(true);
        panStart.current = getEventPoint(e);
        return;
      }
      if (e.button === 0) {
        // Left click on canvas background = start rectangle select
        e.preventDefault();
        const rect = containerRef.current!.getBoundingClientRect();
        const local = getLocalPoint(getEventPoint(e), viewport, rect);
        selectStart.current = local;
        setSelecting(true);
        setSelectRect({ x: local.x, y: local.y, w: 0, h: 0 });
        clearSelection();
        return;
      }
    },
    [viewport, clearSelection]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (panning && panStart.current) {
        const p = getEventPoint(e);
        const dx = p.x - panStart.current.x;
        const dy = p.y - panStart.current.y;
        pan(dx, dy);
        panStart.current = p;
        return;
      }
      if (selecting && selectStart.current) {
        const rect = containerRef.current!.getBoundingClientRect();
        const local = getLocalPoint(getEventPoint(e), viewport, rect);
        setSelectRect({
          x: Math.min(selectStart.current.x, local.x),
          y: Math.min(selectStart.current.y, local.y),
          w: Math.abs(local.x - selectStart.current.x),
          h: Math.abs(local.y - selectStart.current.y),
        });
        return;
      }
      // Node dragging
      moveDragNode({ x: e.clientX, y: e.clientY });

      // Connection mouse tracking
      if (connecting) {
        const rect = containerRef.current!.getBoundingClientRect();
        const local = getLocalPoint(getEventPoint(e), viewport, rect);
        setConnectMouse(local);
      }
    },
    [panning, selecting, pan, viewport, moveDragNode]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (panning) {
        setPanning(false);
        panStart.current = null;
        return;
      }
      if (selecting && selectRect) {
        // Select nodes inside rectangle
        const inside = nodes.filter((n) => {
          const nx = n.position.x;
          const ny = n.position.y;
          const nw = n.size.width;
          const nh = n.size.height;
          return (
            nx < selectRect.x + selectRect.w &&
            nx + nw > selectRect.x &&
            ny < selectRect.y + selectRect.h &&
            ny + nh > selectRect.y
          );
        });
        if (inside.length > 0) {
          useFlowStore.setState({ selectedNodeIds: new Set(inside.map((n) => n.id)) });
        }
        setSelecting(false);
        setSelectRect(null);
        selectStart.current = null;
        return;
      }
      endDragNode();
      if (connecting) {
        cancelConnect();
      }
      setConnectMouse(null);
    },
    [panning, selecting, endDragNode, connecting, cancelConnect, selectRect, nodes]
  );

  useEffect(() => {
    const onMouseUp = () => {
      setPanning(false);
      setSelecting(false);
      endDragNode();
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [endDragNode]);

  const gridBg = snapToGrid
    ? `repeating-linear-gradient(0deg, transparent, transparent ${gridSize * viewport.zoom - 1}px, rgba(148,163,184,0.12) ${gridSize * viewport.zoom - 1}px, rgba(148,163,184,0.12) ${gridSize * viewport.zoom}px), repeating-linear-gradient(90deg, transparent, transparent ${gridSize * viewport.zoom - 1}px, rgba(148,163,184,0.12) ${gridSize * viewport.zoom - 1}px, rgba(148,163,184,0.12) ${gridSize * viewport.zoom}px)`
    : 'none';

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-950"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: panning ? 'grabbing' : selecting ? 'crosshair' : 'default' }}
    >
      {/* World */}
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          width: 1,
          height: 1,
        }}
      >
        {/* Grid background layer */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: -viewport.x / viewport.zoom,
            top: -viewport.y / viewport.zoom,
            width: 10000,
            height: 10000,
            background: gridBg,
          }}
        />

        {/* Edges SVG layer */}
        <svg
          className="pointer-events-auto absolute"
          style={{ left: 0, top: 0, width: 1, height: 1, overflow: 'visible' }}
        >
          {edges.map((edge) => (
            <FlowEdge key={edge.id} edge={edge} />
          ))}
          {connecting && <ConnectingEdge sourceNodeId={connecting.sourceNodeId} sourcePortId={connecting.sourcePortId} mouse={connectMouse} />}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <FlowNode key={node.id} node={node} />
        ))}

        {/* Selection rectangle */}
        {selectRect && (
          <div
            className="pointer-events-none absolute border border-blue-500 bg-blue-500/10"
            style={{
              left: selectRect.x,
              top: selectRect.y,
              width: selectRect.w,
              height: selectRect.h,
            }}
          />
        )}

        {children}
      </div>
    </div>
  );
}

function ConnectingEdge({ sourceNodeId, sourcePortId, mouse }: { sourceNodeId: string; sourcePortId: string; mouse: { x: number; y: number } | null }) {
  const nodes = useFlowStore((s) => s.nodes);
  const sourceNode = nodes.find((n) => n.id === sourceNodeId);
  if (!sourceNode) return null;

  const port = sourceNode.ports.find((p) => p.id === sourcePortId);
  if (!port) return null;

  const sx = sourceNode.position.x + (port.type === 'output' ? sourceNode.size.width : 0);
  const sy = sourceNode.position.y + sourceNode.size.height / 2;
  const tx = mouse?.x ?? sx + 100;
  const ty = mouse?.y ?? sy;
  const dx = Math.abs(tx - sx) * 0.5;
  const d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

  return (
    <path
      d={d}
      fill="none"
      stroke="#94a3b8"
      strokeWidth={2}
      strokeDasharray="6 4"
    />
  );
}
