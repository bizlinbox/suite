'use client';

import { useEffect, useState } from 'react';
import { Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import QuickReplyDialog, { QuickReplyFormData, QuickMessageType } from '@/components/QuickReplyDialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/Table';

interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
  messageType?: string;
  metadata?: {
    mediaUrl?: string;
    filename?: string;
    buttons?: { type: 'reply'; title: string; id?: string }[];
    listOptions?: {
      button: string;
      sections: { title: string; rows: { id: string; title: string; description?: string }[] }[];
    };
  };
}

export default function QuickRepliesPage() {
  const { can, loading: authLoading } = usePermission();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [quickDialogOpen, setQuickDialogOpen] = useState(false);
  const [editingQuick, setEditingQuick] = useState<QuickReply | null>(null);

  useEffect(() => {
    fetchQuickReplies();
  }, []);

  const fetchQuickReplies = async () => {
    try {
      const res = await api.get('/quick-replies');
      setQuickReplies(res.data.quickReplies || []);
    } catch {
      // ignore
    }
  };

  const handleQuickSubmit = async (form: QuickReplyFormData) => {
    try {
      if (editingQuick) {
        await api.put(`/quick-replies/${editingQuick.id}`, form);
      } else {
        await api.post('/quick-replies', form);
      }
      fetchQuickReplies();
    } catch {
      // ignore
    } finally {
      setQuickDialogOpen(false);
      setEditingQuick(null);
    }
  };

  const handleDeleteQuick = async (id: string) => {
    if (!confirm('Delete this quick reply?')) return;
    try {
      await api.delete(`/quick-replies/${id}`);
      fetchQuickReplies();
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
        You do not have permission to view quick replies.
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Quick Replies</h1>
          <p>Manage quick reply shortcuts for your team</p>
        </div>
        <button
          onClick={() => { setEditingQuick(null); setQuickDialogOpen(true); }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Quick Reply
        </button>
      </div>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Shortcut</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Content</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {quickReplies.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <code className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {c.shortcut}
                  </code>
                </TableCell>
                <TableCell>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {c.messageType || 'text'}
                  </span>
                </TableCell>
                <TableCell className="max-w-md truncate">{c.content}</TableCell>
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            ))}
            {quickReplies.length === 0 && <TableEmpty colSpan={4}>No quick replies yet</TableEmpty>}
          </TableBody>
        </Table>
      </div>

      <QuickReplyDialog
        open={quickDialogOpen}
        data={editingQuick ? {
          id: editingQuick.id,
          shortcut: editingQuick.shortcut,
          content: editingQuick.content,
          messageType: (editingQuick.messageType || 'text') as QuickMessageType,
          metadata: editingQuick.metadata || {},
        } : null}
        onClose={() => { setQuickDialogOpen(false); setEditingQuick(null); }}
        onSubmit={handleQuickSubmit}
      />
    </div>
  );
}
