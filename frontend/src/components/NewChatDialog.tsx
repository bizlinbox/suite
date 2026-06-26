'use client';

import { useState, useEffect } from 'react';
import { X, Search, User } from 'lucide-react';
import { api } from '@/lib/api';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (conversationId: string) => void;
  existingConversations: { id: string; contactId: string }[];
}

export default function NewChatDialog({ open, onClose, onSelect, existingConversations }: NewChatDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearch('');
    setError('');
    api.get('/contacts')
      .then((res) => setContacts(res.data.contacts || []))
      .catch(() => setError('Failed to load contacts'))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const handleSelectContact = async (contact: Contact) => {
    setCreating(true);
    setError('');

    // Check if conversation already exists for this contact
    const existing = existingConversations.find((c) => c.contactId === contact.id);
    if (existing) {
      onSelect(existing.id);
      setCreating(false);
      return;
    }

    try {
      const res = await api.post('/conversations', { contact_id: contact.id });
      const newConversationId = res.data.conversation?.id;
      if (newConversationId) {
        onSelect(newConversationId);
      } else {
        setError('Failed to create conversation');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start chat');
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Start New Chat</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            disabled={creating}
          />
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-800 border-t-primary-900" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {search ? 'No contacts found' : 'No contacts available'}
            </div>
          ) : (
            filtered.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleSelectContact(contact)}
                disabled={creating}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/50 disabled:opacity-50"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary-500 text-sm font-medium text-white">
                  <User size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{contact.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{contact.phone}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

