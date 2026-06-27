'use client';

import { useEffect, useState } from 'react';
import { Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import CannedResponseDialog, { CannedResponseFormData } from '@/components/CannedResponseDialog';

interface CannedResponse {
  id: string;
  shortcut: string;
  content: string;
}

export default function CannedResponsesPage() {
  const { can, loading: authLoading } = usePermission();
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [cannedDialogOpen, setCannedDialogOpen] = useState(false);
  const [editingCanned, setEditingCanned] = useState<CannedResponse | null>(null);

  useEffect(() => {
    fetchCannedResponses();
  }, []);

  const fetchCannedResponses = async () => {
    try {
      const res = await api.get('/canned-responses');
      setCannedResponses(res.data.cannedResponses || []);
    } catch {
      // ignore
    }
  };

  const handleCannedSubmit = async (form: CannedResponseFormData) => {
    try {
      if (editingCanned) {
        await api.put(`/canned-responses/${editingCanned.id}`, form);
      } else {
        await api.post('/canned-responses', form);
      }
      fetchCannedResponses();
    } catch {
      // ignore
    } finally {
      setCannedDialogOpen(false);
      setEditingCanned(null);
    }
  };

  const handleDeleteCanned = async (id: string) => {
    if (!confirm('Delete this canned response?')) return;
    try {
      await api.delete(`/canned-responses/${id}`);
      fetchCannedResponses();
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
        You do not have permission to view canned responses.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => { setEditingCanned(null); setCannedDialogOpen(true); }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Canned Response
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
            {cannedResponses.map((c) => (
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
                      onClick={() => { setEditingCanned(c); setCannedDialogOpen(true); }}
                      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      aria-label="Edit"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteCanned(c.id)}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cannedResponses.length === 0 && (
              <tr>
                <td colSpan={3} className="py-10 text-center text-gray-400 dark:text-gray-500">
                  No canned responses yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CannedResponseDialog
        open={cannedDialogOpen}
        data={editingCanned ? { id: editingCanned.id, shortcut: editingCanned.shortcut, content: editingCanned.content } : null}
        onClose={() => { setCannedDialogOpen(false); setEditingCanned(null); }}
        onSubmit={handleCannedSubmit}
      />
    </div>
  );
}
