'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ContactFormData {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  birthday?: string;
  language?: string;
  tags?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

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

  const handleChange = (field: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
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
          <div className="flex flex-col gap-5">
            {/* Basic Info */}
            <Section title="Basic Info">
              <Field label="Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange('name')}
                  required
                  className="input"
                  placeholder="Full name"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="text"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  required
                  className="input"
                  placeholder="+1 234 567 8900"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={handleChange('email')}
                  className="input"
                  placeholder="email@example.com"
                />
              </Field>
            </Section>

            {/* Work */}
            <Section title="Work">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company">
                  <input
                    type="text"
                    value={form.company || ''}
                    onChange={handleChange('company')}
                    className="input"
                    placeholder="Acme Inc."
                  />
                </Field>
                <Field label="Job Title">
                  <input
                    type="text"
                    value={form.jobTitle || ''}
                    onChange={handleChange('jobTitle')}
                    className="input"
                    placeholder="Manager"
                  />
                </Field>
              </div>
            </Section>

            {/* Location */}
            <Section title="Location">
              <Field label="Street Address">
                <input
                  type="text"
                  value={form.address || ''}
                  onChange={handleChange('address')}
                  className="input"
                  placeholder="123 Main St"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input
                    type="text"
                    value={form.city || ''}
                    onChange={handleChange('city')}
                    className="input"
                    placeholder="New York"
                  />
                </Field>
                <Field label="State / Province">
                  <input
                    type="text"
                    value={form.state || ''}
                    onChange={handleChange('state')}
                    className="input"
                    placeholder="NY"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country">
                  <input
                    type="text"
                    value={form.country || ''}
                    onChange={handleChange('country')}
                    className="input"
                    placeholder="United States"
                  />
                </Field>
                <Field label="ZIP / Postal">
                  <input
                    type="text"
                    value={form.zipCode || ''}
                    onChange={handleChange('zipCode')}
                    className="input"
                    placeholder="10001"
                  />
                </Field>
              </div>
            </Section>

            {/* Other */}
            <Section title="Other">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Birthday">
                  <input
                    type="date"
                    value={form.birthday || ''}
                    onChange={handleChange('birthday')}
                    className="input"
                  />
                </Field>
                <Field label="Language">
                  <input
                    type="text"
                    value={form.language || ''}
                    onChange={handleChange('language')}
                    className="input"
                    placeholder="en"
                  />
                </Field>
              </div>
              <Field label="Tags">
                <input
                  type="text"
                  value={form.tags || ''}
                  onChange={handleChange('tags')}
                  className="input"
                  placeholder="vip, support, prospect"
                />
              </Field>
              <Field label="Notes">
                <textarea
                  value={form.notes || ''}
                  onChange={handleChange('notes')}
                  rows={3}
                  className="input resize-none"
                  placeholder="Any additional notes..."
                />
              </Field>
            </Section>
          </div>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-5 last:border-0 dark:border-gray-800">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
    </div>
  );
}
