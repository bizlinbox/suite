'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import FlowBuilder from './FlowBuilder';
import { FlowNode, FlowEdge } from './FlowBuilder/types';
import { AlertCircle } from 'lucide-react';
import { useWaba } from '@/context/WabaContext';

interface Step {
  id: string;
  type: string;
  label?: string;
  config: Record<string, any>;
}

interface AutomationEditorProps {
  automationId?: string;
  initialName?: string;
  initialSteps?: Step[];
}

const NODE_HEIGHTS: Record<string, number> = {
  trigger_message: 80,
  trigger_conversation_opened: 80,
  trigger_webhook: 80,
  condition: 110,
  delay: 90,
  send_interactive_buttons: 120,
  send_interactive_list: 120,
  default: 100,
};

function stepsToFlow(steps: Step[]): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = steps.map((step, i) => {
    const isTrigger = step.type.startsWith('trigger_');
    const isCondition = step.type === 'condition';
    const ports: { id: string; type: 'input' | 'output'; label: string }[] = [];
    if (!isTrigger) ports.push({ id: 'in', type: 'input', label: '' });
    if (isCondition) {
      ports.push({ id: 'true', type: 'output', label: 'True' });
      ports.push({ id: 'false', type: 'output', label: 'False' });
    } else {
      ports.push({ id: 'out', type: 'output', label: '' });
    }
    return {
      id: step.id,
      type: step.type,
      position: { x: i * 260, y: isCondition ? 100 : 120 },
      size: { width: 200, height: NODE_HEIGHTS[step.type] || NODE_HEIGHTS.default },
      data: step.config || {},
      ports,
      label: step.label,
    };
  });

  const edges: FlowEdge[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const source = nodes[i];
    const target = nodes[i + 1];
    const sourcePort = source.ports.find((p) => p.type === 'output')?.id || 'out';
    const targetPort = target.ports.find((p) => p.type === 'input')?.id || 'in';
    edges.push({
      id: `edge-${source.id}-${target.id}`,
      sourceNodeId: source.id,
      sourcePortId: sourcePort,
      targetNodeId: target.id,
      targetPortId: targetPort,
    });
  }

  return { nodes, edges };
}

function flowToSteps(nodes: FlowNode[], edges: FlowEdge[]): Step[] {
  // Sort by x position for a left-to-right reading order
  const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
  return sorted.map((node) => ({
    id: node.id,
    type: node.type,
    label: node.label,
    config: node.data,
  }));
}

export default function AutomationEditor({ automationId, initialName, initialSteps }: AutomationEditorProps) {
  const router = useRouter();
  const { selectedWabaId } = useWaba();
  const [name, setName] = useState(initialName || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initial = initialSteps && initialSteps.length > 0 ? stepsToFlow(initialSteps) : undefined;

  const handleSave = useCallback(
    async ({ nodes, edges }: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
      if (!name.trim()) {
        setError('Please enter an automation name');
        return;
      }
      if (nodes.length === 0) {
        setError('Add at least one node');
        return;
      }
      const steps = flowToSteps(nodes, edges);
      setSaving(true);
      setError(null);
      try {
        const payload = { 
          name: name.trim(), 
          waba_account_id: selectedWabaId,
          steps 
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
    },
    [name, automationId, router, selectedWabaId]
  );

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Automation name..."
          className="input flex-1 text-lg font-semibold"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <FlowBuilder
          title={name || 'Automation'}
          initialNodes={initial?.nodes}
          initialEdges={initial?.edges}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </div>
  );
}
