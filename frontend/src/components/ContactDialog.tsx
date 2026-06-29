'use client';

import { useState, useEffect } from 'react';
import { LuX as X } from 'react-icons/lu';
import ContactForm, { ContactFormData } from './ContactForm';

export type { ContactFormData } from './ContactForm';

interface ContactDialogProps {
  open: boolean;
  contact: ContactFormData | null;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => void;
}

export default function ContactDialog({ open, contact, onClose, onSubmit }: ContactDialogProps) {
  const [form, setForm] = useState<ContactFormData>({
    name: '',
    phone: '',
    email: '',
    company: '',
    jobTitle: '',
    notes: '',
    birthday: '',
    language: '',
    tags: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
  });

  useEffect(() => {
    if (contact) {
      setForm(contact);
    } else {
      setForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        jobTitle: '',
        notes: '',
        birthday: '',
        language: '',
        tags: '',
        address: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
      });
    }
  }, [contact, open]);

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSubmit(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4">
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

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <ContactForm value={form} onChange={handleChange} />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 px-6 py-4">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            {contact?.id ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
