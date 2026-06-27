'use client';

import { useEffect, useState } from 'react';
import { Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import QuickResponseDialog, { QuickResponseFormData } from '@/components/QuickResponseDialog';

interface QuickResponse {
  id: string;
  shortcut: string;
  content: string;
}

export default function QuickResponsesPage() {
  const { can, loading: authLoading } = usePermission();
  const [quickResponses, setQuickResponses] = useState<QuickResponse[]>([]);
  const [quickDialogOpen, setQuickDialogOpen] = useState(false);
  const [editingQuick, setEditingQuick] = useState<QuickResponse | null>(null);

  useEffect(() => {
    fetchQuickResponses();
  }, []);

  const fetchQuickResponses = async () => {
    try {
      const res = await api.get('/quick-responses');
      setQuickResponses(res.data.quickResponses || []);
    } catch {
      // ignore
    }
  };

  const handleQuickSubmit = async (form: QuickResponseFormData) => {
    try {
      if (editingQuick) {
        await api.put(`/quick-responses/${editingQuick.id}`, form);
      } else {
        await api.post('/quick-responses', form);
      }
      fetchQuickResponses();
    } catch {
      // ignore
    } finally {
      setQuickDialogOpen(false);
      setEditingQuick(null);
    }
  };

  const handleDeleteQuick = async (id: string) => {
    if (!confirm('Delete this quick response?')) return;
    try {
      await api.delete(`/quick-responses/${id}`);
      fetchQuickResponses();
    } catch {
      // ignore
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (!can('settings.read')) {
    return (
      <div className="panel p-8 text-center text-sm text-gray-400 dark:text-gray-500">
        You do not have permission to view quick responses.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => { setEditingQuick(null); setQuickDialogOpen(true); }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Quick Response
        </button>
      </div>

      <div className="panel overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Shortcut</th>
              <th>Content</th>
              <th className="w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {quickResponses.map((c) => (
              <tr key={c.id}>
                <td>
                  <code className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {c.shortcut}
                  </code>
                </td>
                <td className="max-w-md truncate">{c.content}</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => { setEditingQuick(c); setQuickDialogOpen(true); }}
                      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      aria-label="Edit"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteQuick(c.id)}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {quickResponses.length === 0 && (
              <tr>
                <td colSpan={3} className="py-10 text-center text-gray-400 dark:text-gray-500">
                  No quick responses yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <QuickResponseDialog
        open={quickDialogOpen}
        data={editingQuick ? { id: editingQuick.id, shortcut: editingQuick.shortcut, content: editingQuick.content } : null}
        onClose={() => { setQuickDialogOpen(false); setEditingQuick(null); }}
        onSubmit={handleQuickSubmit}
      />
    </div>
  );
}
