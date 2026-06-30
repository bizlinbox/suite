'use client';

import { useRef, useEffect, useState } from 'react';
import { LuSearch as Search, LuPlus as Plus, LuTrash2 as Trash2, LuLoader as Loader2, LuSquareCheck as CheckSquare, LuSquare as Square } from 'react-icons/lu';

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  assignedAgentName?: string;
  isPrivate?: boolean;
  assignedAgentId?: string;
  labels?: { id: string; name: string; color: string }[];
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  deletingId?: string | null;
  onOpenProfile?: (contactId: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  onDelete,
  onBulkDelete,
  deletingId,
  onOpenProfile,
  loading = false,
  hasMore = false,
  onLoadMore,
  searchQuery = '',
  onSearchChange,
}: ConversationListProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const allFilteredSelected =
    conversations.length > 0 && conversations.every((c) => selectedIds.includes(c.id));

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(conversations.map((c) => c.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onBulkDelete?.(selectedIds);
    setSelectMode(false);
    setSelectedIds([]);
  };

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !onLoadMore || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { root: scrollRef.current, rootMargin: '100px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 p-4 dark:border-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Inbox</h2>
          <div className="flex items-center gap-1.5">
            {onDelete && (
              <button
                onClick={toggleSelectMode}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  selectMode
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                }`}
                title={selectMode ? 'Cancel selection' : 'Select conversations'}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            )}
            {onNewChat && (
              <button onClick={onNewChat} className="btn-primary px-3 py-1.5 text-xs">
                <Plus size={14} />
                New Chat
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="input pl-9"
          />
        </div>

        {selectMode && (
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {allFilteredSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              {allFilteredSelected ? 'Deselect all' : 'Select all'}
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <Trash2 size={12} />
                Delete ({selectedIds.length})
              </button>
            )}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2">
        {conversations.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search size={24} className="mb-2 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No conversations found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  conversation.id === selectedId
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <div
                  onClick={() => {
                    if (selectMode) {
                      toggleSelect(conversation.id);
                    } else {
                      onSelect(conversation.id);
                    }
                  }}
                  className="flex flex-1 cursor-pointer items-start gap-3"
                >
                  {selectMode ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(conversation.id);
                      }}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      {selectedIds.includes(conversation.id) ? (
                        <CheckSquare size={18} className="text-primary-600 dark:text-primary-400" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile?.(conversation.contactId);
                      }}
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                        conversation.id === selectedId
                          ? 'bg-primary-200 text-primary-800 dark:bg-primary-800/40 dark:text-primary-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {getInitials(conversation.contactName)}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-sm font-medium ${
                          conversation.id === selectedId
                            ? 'text-primary-800 dark:text-primary-300'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {conversation.contactName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {conversation.isPrivate && (
                          <span className="rounded bg-gray-200 px-1 py-0.5 text-[9px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            Private
                          </span>
                        )}
                        {conversation.lastMessageAt && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {new Date(conversation.lastMessageAt).toLocaleDateString() ===
                            new Date().toLocaleDateString()
                              ? new Date(conversation.lastMessageAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : new Date(conversation.lastMessageAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                          </span>
                        )}
                        {conversation.unreadCount > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-semibold text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {conversation.lastMessagePreview}
                    </p>
                    {conversation.assignedAgentName && (
                      <p className="mt-0.5 text-[10px] font-medium text-primary-600 dark:text-primary-400">
                        Assigned to {conversation.assignedAgentName}
                      </p>
                    )}
                    {conversation.labels && conversation.labels.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {conversation.labels.map((l) => (
                          <span
                            key={l.id}
                            className="inline-block rounded-full px-1.5 py-[1px] text-[9px] font-medium"
                            style={{ backgroundColor: l.color + '20', color: l.color }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {!selectMode && onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conversation.id);
                    }}
                    disabled={deletingId === conversation.id}
                    className="mt-1 rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-50"
                    aria-label="Delete conversation"
                    title="Delete conversation"
                  >
                    {deletingId === conversation.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                )}
              </div>
            ))}

            {/* Sentinel for infinite scroll */}
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center py-3">
                {loading ? (
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                ) : (
                  <div className="h-6" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
