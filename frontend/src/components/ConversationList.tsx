'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  assignedAgentName?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
}

export default function ConversationList({ conversations, selectedId, onSelect, onNewChat }: ConversationListProps) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) =>
    c.contactName.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPhone.includes(search)
  );

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 p-4 dark:border-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Inbox</h2>
          {onNewChat && (
            <button onClick={onNewChat} className="btn-primary px-3 py-1.5 text-xs">
              <Plus size={14} />
              New Chat
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search size={24} className="mb-2 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No conversations found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  conversation.id === selectedId
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                  conversation.id === selectedId
                    ? 'bg-primary-200 text-primary-800 dark:bg-primary-800/40 dark:text-primary-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {getInitials(conversation.contactName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm font-medium ${
                      conversation.id === selectedId
                        ? 'text-primary-800 dark:text-primary-300'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {conversation.contactName}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-semibold text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{conversation.lastMessagePreview}</p>
                  {conversation.assignedAgentName && (
                    <p className="mt-0.5 text-[10px] font-medium text-primary-600 dark:text-primary-400">
                      Assigned to {conversation.assignedAgentName}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
