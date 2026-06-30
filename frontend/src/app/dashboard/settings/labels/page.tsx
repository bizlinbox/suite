'use client';

import { useEffect, useState } from 'react';
import { LuPenLine as Edit, LuTrash2 as Trash2, LuPlus as Plus, LuLoader as Loader2 } from 'react-icons/lu';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/Table';

interface Label {
  id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#06B6D4', '#3B82F6', '#6366F1', '#A855F7', '#EC4899',
  '#6B7280', '#1F2937',
];

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function textColorForBg(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#111827' : '#FFFFFF';
}

export default function LabelsPage() {
  const { can, loading: authLoading } = usePermission();
  const [labels, setLabels] = useState<Label[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      const res = await api.get('/labels');
      setLabels(res.data.labels || []);
    } catch {
      // ignore
    }
  };

  const openCreate = () => {
    setEditingLabel(null);
    setName('');
    setColor('#3B82F6');
    setDialogOpen(true);
  };

  const openEdit = (label: Label) => {
    setEditingLabel(label);
    setName(label.name);
    setColor(label.color);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editingLabel) {
        await api.put(`/labels/${editingLabel.id}`, { name: name.trim(), color });
      } else {
        await api.post('/labels', { name: name.trim(), color });
      }
      fetchLabels();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
      setDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this label? It will be removed from all conversations.')) return;
    try {
      await api.delete(`/labels/${id}`);
      fetchLabels();
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
        You do not have permission to view labels.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} />
          Add Label
        </button>
      </div>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {labels.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: l.color, color: textColorForBg(l.color) }}
                  >
                    {l.name}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-700" style={{ backgroundColor: l.color }} />
                    <code className="text-xs text-gray-500 dark:text-gray-400">{l.color}</code>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(l)}
                      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      aria-label="Edit"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {labels.length === 0 && <TableEmpty colSpan={3}>No labels yet</TableEmpty>}
          </TableBody>
        </Table>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingLabel ? 'Edit Label' : 'Add Label'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. Urgent"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-gray-900 dark:border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="input mt-2 w-full"
                  placeholder="#3B82F6"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDialogOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : editingLabel ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
