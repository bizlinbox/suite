'use client';

import { useEffect, useState } from 'react';
import { X, Phone, Mail, Building2, MapPin, Calendar, Tag, FileText } from 'lucide-react';
import { api } from '@/lib/api';

interface ContactProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  birthday?: string;
  language?: string;
  tags?: string[];
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

interface ContactProfilePopupProps {
  contactId: string;
  open: boolean;
  onClose: () => void;
}

export default function ContactProfilePopup({ contactId, open, onClose }: ContactProfilePopupProps) {
  const [contact, setContact] = useState<ContactProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !contactId) return;
    setLoading(true);
    api.get(`/contacts/${contactId}`)
      .then((res) => {
        setContact(res.data.contact);
      })
      .catch(() => {
        setContact(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, contactId]);

  // Close on ESC key
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contact Profile</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
            </div>
          )}

          {!loading && !contact && (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Contact not found</p>
          )}

          {!loading && contact && (
            <div className="flex flex-col gap-5">
              {/* Avatar + Name */}
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{contact.name}</h3>
                  {contact.jobTitle && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{contact.jobTitle}</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col gap-3">
                <DetailRow icon={<Phone size={16} />} label="Phone" value={contact.phone} />
                <DetailRow icon={<Mail size={16} />} label="Email" value={contact.email} />
                <DetailRow icon={<Building2 size={16} />} label="Company" value={contact.company} />
                <DetailRow icon={<MapPin size={16} />} label="Address" value={[contact.address, contact.city, contact.state, contact.country].filter(Boolean).join(', ') || undefined} />
                <DetailRow icon={<Calendar size={16} />} label="Birthday" value={contact.birthday} />
              </div>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Tag size={16} />
                    <span>Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <FileText size={16} />
                    <span>Notes</span>
                  </div>
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {contact.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400 dark:text-gray-500">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}
