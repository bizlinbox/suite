'use client';

import { useEffect, useState } from 'react';
import { LuPenLine as Edit, LuTrash2 as Trash2, LuPlus as Plus, LuLoader as Loader2, LuSearch as Search, LuUpload as Upload } from 'react-icons/lu';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import ContactDialog from '@/components/ContactDialog';
import ContactImportDialog from '@/components/ContactImportDialog';
import { ContactFormData } from '@/components/ContactForm';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/Table';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  remarks?: string;
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
  const [importOpen, setImportOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [search, setSearch] = useState('');

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
      fetchContacts();
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
        remarks: form.remarks || null,
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
        await api.put(`/contacts/${editingContact.id}`, payload);
      } else {
        await api.post('/contacts', payload);
      }
      fetchContacts();
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
        remarks: editingContact.remarks || '',
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

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          <p>Manage your contacts and their details</p>
        </div>
        {can('contacts.manage') && (
          <div className="flex items-center gap-2">
            <button onClick={() => setImportOpen(true)} className="btn-secondary">
              <Upload size={16} />
              Import
            </button>
            <button onClick={handleCreate} className="btn-primary">
              <Plus size={16} />
              Add Contact
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9 md:max-w-sm"
          />
        </div>
      </div>

      <div className="panel overflow-hidden">
        <Table className="min-w-full">
          <TableHeader>
            <tr>
              <TableHead className="text-left">Name</TableHead>
              <TableHead className="text-left">Phone</TableHead>
              <TableHead className="text-left">Email</TableHead>
              <TableHead className="text-left">Company</TableHead>
              <TableHead className="text-left">Tags</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtered.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{contact.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600 dark:text-gray-300">{contact.phone}</TableCell>
                <TableCell className="text-sm text-gray-600 dark:text-gray-300">{contact.email || '-'}</TableCell>
                <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                  {contact.company || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(contact.tags || []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {(contact.tags || []).length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        +{(contact.tags || []).length - 3}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {can('contacts.manage') && (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        aria-label="Edit"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableEmpty colSpan={6}>
                {contacts.length === 0 ? 'No contacts yet' : 'No contacts match your search'}
              </TableEmpty>
            )}
          </TableBody>
        </Table>
      </div>

      <ContactDialog
        open={dialogOpen}
        contact={dialogInitialData}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
      <ContactImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={fetchContacts}
      />
    </div>
  );
}
