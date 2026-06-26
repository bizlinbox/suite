'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import AutomationEditor from '@/components/AutomationEditor';
import { Loader2 } from 'lucide-react';

export default function EditAutomationPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/automations/${id}`)
      .then((res) => {
        const automation = res.data.automation;
        const nodes = res.data.nodes.map((n: any) => ({
          id: n.id,
          type: n.type,
          position: { x: n.positionX, y: n.positionY },
          data: { type: n.type, label: n.label, config: n.config || {} },
        }));
        const edges = res.data.edges.map((e: any) => ({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          label: e.label,
          animated: true,
          style: { stroke: '#6366f1' },
        }));
        setData({ name: automation.name, nodes, edges });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400">
        Automation not found
      </div>
    );
  }

  return (
    <AutomationEditor
      automationId={id}
      initialName={data.name}
      initialNodes={data.nodes}
      initialEdges={data.edges}
    />
  );
}
