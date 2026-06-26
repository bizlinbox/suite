'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ContactFormData {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string;
}

interface ContactDialogProps {
  open: boolean;
  contact: ContactFormData | null;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => void;
}

export default function ContactDialog({ open, contact, onClose, onSubmit }: ContactDialogProps) {
  const [form, setForm] = useState<ContactFormData>({ name: '', phone: '', email: '', tags: '' });

  useEffect(() => {
    if (contact) {
      setForm(contact);
    } else {
      setForm({ name: '', phone: '', email: '', tags: '' });
    }
  }, [contact, open]);

  const handleChange = (field: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = () => {
    onSubmit(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {contact?.id ? 'Edit Contact' : 'Create Contact'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              required
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={handleChange('phone')}
              required
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={handleChange('email')}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
            <input
              type="text"
              value={form.tags || ''}
              onChange={handleChange('tags')}
              placeholder="e.g. vip, support"
              className="input"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
          >
            {contact?.id ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
