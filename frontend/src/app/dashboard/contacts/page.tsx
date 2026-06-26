'use client';

import { useEffect, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import ContactDialog, { ContactFormData } from '@/components/ContactDialog';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
}

export default function ContactsPage() {
  const { can } = usePermission();
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
      if (editingContact) {
        const res = await api.put(`/contacts/${editingContact.id}`, form);
        setContacts((prev) => prev.map((c) => (c.id === editingContact.id ? res.data.contact : c)));
      } else {
        const res = await api.post('/contacts', form);
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
        tags: (editingContact.tags || []).join(', '),
      }
    : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          <p>Manage your contacts and their tags.</p>
        </div>
        {can('contacts.manage') && (
          <button onClick={handleCreate} className="btn-primary">
            Add Contact
          </button>
        )}
      </div>

      <div className="panel overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{contact.name}</td>
                <td className="px-4 py-3">{contact.phone}</td>
                <td className="px-4 py-3">{contact.email || '-'}</td>
                <td className="px-4 py-3">
                  {(contact.tags || []).map((tag) => (
                    <span key={tag} className="badge-gray mr-1">
                      {tag}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-3 text-right">
                  {can('contacts.manage') && (
                    <>
                      <button
                        onClick={() => handleEdit(contact)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No contacts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
