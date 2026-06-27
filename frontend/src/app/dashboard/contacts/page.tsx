'use client';

import { useEffect, useState } from 'react';
import { Edit, Trash2, Building2, MapPin, Briefcase, Calendar, Globe, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import ContactDialog, { ContactFormData } from '@/components/ContactDialog';

interface Contact {
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

export default function ContactsPage() {
  const { can, loading: authLoading } = usePermission();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts');
      setContacts(res.data.contacts || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleCreate = () => {
    setEditingContact(null);
    setDialogOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (form: ContactFormData) => {
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        company: form.company || null,
        job_title: form.jobTitle || null,
        notes: form.notes || null,
        birthday: form.birthday || null,
        language: form.language || null,
        tags: form.tags || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        zip_code: form.zipCode || null,
      };
      if (editingContact) {
        const res = await api.put(`/contacts/${editingContact.id}`, payload);
        setContacts((prev) => prev.map((c) => (c.id === editingContact.id ? res.data.contact : c)));
      } else {
        const res = await api.post('/contacts', payload);
        setContacts((prev) => [...prev, res.data.contact]);
      }
    } catch {
      // ignore
    } finally {
      setDialogOpen(false);
    }
  };

  const dialogInitialData: ContactFormData | null = editingContact
    ? {
        id: editingContact.id,
        name: editingContact.name,
        phone: editingContact.phone,
        email: editingContact.email || '',
        company: editingContact.company || '',
        jobTitle: editingContact.jobTitle || '',
        notes: editingContact.notes || '',
        birthday: editingContact.birthday || '',
        language: editingContact.language || '',
        tags: (editingContact.tags || []).join(', '),
        address: editingContact.address || '',
        city: editingContact.city || '',
        state: editingContact.state || '',
        country: editingContact.country || '',
        zipCode: editingContact.zipCode || '',
      }
    : null;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          <p>Manage your contacts and their details.</p>
        </div>
        {can('contacts.manage') && (
          <button onClick={handleCreate} className="btn-primary">
            Add Contact
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="panel flex flex-col gap-4 p-5 transition-shadow hover:shadow-md"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {contact.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{contact.phone}</p>
                </div>
              </div>
              {can('contacts.manage') && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                    title="Edit"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="rounded-md p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col gap-2 text-sm">
              {contact.email && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Email</span>
                  <span className="truncate">{contact.email}</span>
                </div>
              )}

              {(contact.company || contact.jobTitle) && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Briefcase size={14} className="shrink-0 text-gray-400" />
                  <span className="truncate">
                    {contact.jobTitle && <span className="font-medium">{contact.jobTitle}</span>}
                    {contact.jobTitle && contact.company && ' at '}
                    {contact.company && <span>{contact.company}</span>}
                  </span>
                </div>
              )}

              {(contact.address || contact.city || contact.state || contact.country) && (
                <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                  <span className="truncate">
                    {[contact.address, contact.city, contact.state, contact.country, contact.zipCode]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}

              {(contact.birthday || contact.language) && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  {contact.birthday && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="shrink-0 text-gray-400" />
                      <span className="text-xs">
                        {new Date(contact.birthday).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {contact.language && (
                    <div className="flex items-center gap-1.5">
                      <Globe size={14} className="shrink-0 text-gray-400" />
                      <span className="text-xs uppercase">{contact.language}</span>
                    </div>
                  )}
                </div>
              )}

              {contact.notes && (
                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {contact.notes}
                </p>
              )}

              {(contact.tags || []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(contact.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {contacts.length === 0 && (
          <div className="panel col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
              <Building2 size={20} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">No contacts yet</h3>
            <p className="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">
              Add your first contact to start managing customer details.
            </p>
          </div>
        )}
      </div>

      <ContactDialog
        open={dialogOpen}
        contact={dialogInitialData}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
