'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import AutomationEditor from '@/components/AutomationEditor';
import { LuLoader as Loader2 } from 'react-icons/lu';

export default function EditAutomationPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/automations/${id}`)
      .then((res) => {
        setData({
          name: res.data.automation.name,
          steps: res.data.steps || [],
        });
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
      initialSteps={data.steps}
    />
  );
}
