'use client';

import React from 'react';
import { useFlowStore } from './store';
import { FlowEdge as FlowEdgeType } from './types';

export default function FlowEdgeComponent({ edge }: { edge: FlowEdgeType }) {
  const nodes = useFlowStore((s) => s.nodes);
  const selectedEdgeIds = useFlowStore((s) => s.selectedEdgeIds);
  const selectEdge = useFlowStore((s) => s.selectEdge);
  const isSelected = selectedEdgeIds.has(edge.id);

  const sourceNode = nodes.find((n) => n.id === edge.sourceNodeId);
  const targetNode = nodes.find((n) => n.id === edge.targetNodeId);
  if (!sourceNode || !targetNode) return null;

  const sourcePort = sourceNode.ports.find((p) => p.id === edge.sourcePortId);
  const targetPort = targetNode.ports.find((p) => p.id === edge.targetPortId);
  if (!sourcePort || !targetPort) return null;

  const sx = sourceNode.position.x + (sourcePort.type === 'output' ? sourceNode.size.width : 0);
  const sy = sourceNode.position.y + sourceNode.size.height / 2;
  const tx = targetNode.position.x + (targetPort.type === 'input' ? 0 : targetNode.size.width);
  const ty = targetNode.position.y + targetNode.size.height / 2;

  const dx = Math.abs(tx - sx) * 0.5;
  const d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={isSelected ? '#3b82f6' : '#94a3b8'}
        strokeWidth={isSelected ? 3 : 2}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          selectEdge(edge.id);
        }}
      />
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          selectEdge(edge.id);
        }}
      />
    </g>
  );
}
