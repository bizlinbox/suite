'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface CannedResponseFormData {
  id?: string;
  shortcut: string;
  content: string;
}

interface CannedResponseDialogProps {
  open: boolean;
  data: CannedResponseFormData | null;
  onClose: () => void;
  onSubmit: (data: CannedResponseFormData) => void;
}

export default function CannedResponseDialog({ open, data, onClose, onSubmit }: CannedResponseDialogProps) {
  const [form, setForm] = useState<CannedResponseFormData>({ shortcut: '', content: '' });

  useEffect(() => {
    if (data) {
      setForm(data);
    } else {
      setForm({ shortcut: '', content: '' });
    }
  }, [data, open]);

  const handleChange = (field: keyof CannedResponseFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = () => {
    onSubmit(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {data?.id ? 'Edit Canned Response' : 'Create Canned Response'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Shortcut</label>
            <input
              type="text"
              value={form.shortcut}
              onChange={handleChange('shortcut')}
              required
              placeholder="/welcome"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
            <textarea
              value={form.content}
              onChange={handleChange('content')}
              required
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-primary-900 px-4 py-2 text-white hover:bg-primary-700"
          >
            {data?.id ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}


