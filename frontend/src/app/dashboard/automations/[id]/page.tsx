'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import AutomationEditor from '@/components/AutomationEditor';
import { LuLoader as Loader2, LuPlay as Play, LuCircleCheck as CheckCircle2, LuCircleX as XCircle, LuClock as Clock } from 'react-icons/lu';

interface Step {
  id: string;
  type: string;
  label?: string;
  config: Record<string, any>;
}

interface Execution {
  id: string;
  triggerType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  context: Record<string, any>;
  result: any;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export default function EditAutomationPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'editor' | 'executions'>('editor');
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [execLoading, setExecLoading] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.get(`/automations/${id}`)
      .then((res) => {
        setData({
          name: res.data.automation.name,
          steps: res.data.steps || [],
        });
        setExecutions(res.data.executions || []);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchExecutions = async () => {
    setExecLoading(true);
    try {
      const res = await api.get(`/automations/${id}/executions`);
      setExecutions(res.data.executions || []);
    } catch {
      // ignore
    } finally {
      setExecLoading(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      await api.post(`/automations/${id}/execute`);
      setTimeout(() => {
        fetchExecutions();
        setRunning(false);
      }, 800);
    } catch {
      setRunning(false);
    }
  };

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
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('editor')}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'editor'
                ? 'border-primary-700 text-primary-700 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => {
              setActiveTab('executions');
              fetchExecutions();
            }}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'executions'
                ? 'border-primary-700 text-primary-700 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Executions
            {executions.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {executions.length}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="mb-2 flex items-center gap-1.5 rounded-lg bg-primary-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
          title="Manually run automation"
        >
          <Play size={14} />
          {running ? 'Running...' : 'Run'}
        </button>
      </div>

      {activeTab === 'editor' && (
        <div className="min-h-0 flex-1">
          <AutomationEditor
            automationId={id}
            initialName={data.name}
            initialSteps={data.steps}
          />
        </div>
      )}

      {activeTab === 'executions' && (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {execLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          )}

          {!execLoading && executions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <Clock size={32} className="mb-3 opacity-50" />
              <p className="text-sm">No executions yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Automations run automatically when triggered, or click Run to test.</p>
            </div>
          )}

          {!execLoading && executions.length > 0 && (
            <div className="space-y-3">
              {executions.map((ex) => {
                const isFailed = ex.status === 'failed';
                const isRunning = ex.status === 'running';
                const isCompleted = ex.status === 'completed';
                const duration = ex.completedAt && ex.startedAt
                  ? Math.round((new Date(ex.completedAt).getTime() - new Date(ex.startedAt).getTime()) / 1000)
                  : null;

                return (
                  <div
                    key={ex.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isFailed
                        ? 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20'
                        : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isCompleted && <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />}
                        {isFailed && <XCircle size={16} className="text-red-600 dark:text-red-400" />}
                        {isRunning && <Loader2 size={16} className="animate-spin text-primary-600 dark:text-primary-400" />}
                        <span className="text-sm font-medium capitalize text-gray-900 dark:text-gray-100">
                          {ex.triggerType.replace(/_/g, ' ')}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          isCompleted
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : isFailed
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>
                          {ex.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(ex.createdAt).toLocaleString()}
                        {duration !== null && ` · ${duration}s`}
                      </div>
                    </div>

                    {ex.errorMessage && (
                      <div className="mt-2 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                        {ex.errorMessage}
                      </div>
                    )}

                    {ex.result && isCompleted && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                          View result
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-gray-100 p-3 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {JSON.stringify(ex.result, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
