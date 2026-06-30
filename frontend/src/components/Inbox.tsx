'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useWaba } from '@/context/WabaContext';
import ConversationList, { Conversation } from '@/components/ConversationList';
import ChatWindow, { Message } from '@/components/ChatWindow';
import NewChatDialog from '@/components/NewChatDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import ContactProfilePopup from '@/components/ContactProfilePopup';
import { toastError, toastSuccess } from '@/components/Toaster';
import { LuBuilding2 as Building2, LuMessageSquare as MessageSquare } from 'react-icons/lu';

const CONV_PAGE_SIZE = 20;

interface InboxProps {
  selectedId: string | null;
}

export default function Inbox({ selectedId }: InboxProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convOffset, setConvOffset] = useState(0);
  const [convTotal, setConvTotal] = useState(0);
  const [convLoading, setConvLoading] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const convSearchRef = useRef('');

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileContactId, setProfileContactId] = useState<string>('');
  const [profileEditMode, setProfileEditMode] = useState(false);
  const { socket } = useSocket();
  const { selectedWabaId } = useWaba();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const convLoadingRef = useRef(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConversations = useCallback(async (offset = 0, search = '', append = false) => {
    if (convLoadingRef.current && offset > 0) return;
    convLoadingRef.current = true;
    setConvLoading(true);
    try {
      const params: Record<string, any> = { limit: CONV_PAGE_SIZE, offset };
      if (search.trim()) params.q = search.trim();
      const res = await api.get('/conversations', { params });
      const newConvs = res.data.conversations || [];
      setConvTotal(res.data.total || 0);
      setConversations((prev) => {
        if (append) return [...prev, ...newConvs];
        return newConvs;
      });
      setConvOffset(offset);
    } catch (err: any) {
      toastError(err?.response?.data?.error || 'Something went wrong');
    } finally {
      convLoadingRef.current = false;
      setConvLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations(0, '');
  }, []);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    audioRef.current = new Audio('/sounds/ting_iphone.mp3');
  }, []);

  const [agentsMap, setAgentsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      // Play notification sound for incoming contact messages
      if (message.senderType === 'contact' && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      setConversations((prev) => {
        const exists = prev.find((c) => c.id === message.conversationId);
        if (exists) {
          return prev.map((c) =>
            c.id === message.conversationId
              ? {
                  ...c,
                  lastMessagePreview: message.content || '',
                  lastMessageAt: message.createdAt,
                  unreadCount: c.id === selectedId ? 0 : c.unreadCount + 1,
                }
              : c
          );
        }
        // New conversation not in list yet — fetch single and prepend
        api.get(`/conversations/${message.conversationId}`)
          .then((res) => {
            const conv = res.data.conversation;
            if (conv) {
              setConversations((current) => {
                if (current.find((c) => c.id === message.conversationId)) return current;
                return [
                  {
                    id: conv.id,
                    contactId: conv.contactId,
                    contactName: conv.contactName || 'Unknown',
                    contactPhone: conv.contactPhone || '',
                    lastMessagePreview: message.content || '',
                    lastMessageAt: message.createdAt,
                    unreadCount: conv.id === selectedId ? 0 : 1,
                    assignedAgentName: conv.assignedAgentName,
                    isPrivate: conv.isPrivate,
                    assignedAgentId: conv.assignedAgentId,
                  },
                  ...current,
                ];
              });
              setConvTotal((t) => t + 1);
            }
          })
          .catch(() => {});
        return prev;
      });
    };

    const handleConversationUpdated = (updated: Record<string, unknown>) => {
      const convId = (updated.id as string) || (updated.conversationId as string);
      if (!convId) return;

      setConversations((prev) => {
        const exists = prev.find((c) => c.id === convId);
        if (exists) {
          return prev.map((c) => {
            if (c.id !== convId) return c;
            const next: Conversation = {
              ...c,
              ...(updated.lastMessageAt ? { lastMessageAt: String(updated.lastMessageAt) } : {}),
              ...(updated.lastMessagePreview ? { lastMessagePreview: String(updated.lastMessagePreview) } : {}),
              ...(typeof updated.unreadCount === 'number' ? { unreadCount: updated.unreadCount } : {}),
              ...(updated.assignedAgentName !== undefined ? { assignedAgentName: updated.assignedAgentName ? String(updated.assignedAgentName) : undefined } : {}),
              ...(updated.assignedAgentId !== undefined ? { assignedAgentId: updated.assignedAgentId ? String(updated.assignedAgentId) : undefined } : {}),
              ...(typeof updated.isPrivate === 'boolean' ? { isPrivate: updated.isPrivate } : {}),
              ...(updated.labels !== undefined ? { labels: updated.labels as Conversation['labels'] } : {}),
            };
            // Derive agent name from agentsMap if id is present but name is not
            if (next.assignedAgentId && !next.assignedAgentName && agentsMap[next.assignedAgentId]) {
              next.assignedAgentName = agentsMap[next.assignedAgentId];
            }
            return next;
          });
        }
        // New conversation — fetch and prepend
        api.get(`/conversations/${convId}`)
          .then((res) => {
            const conv = res.data.conversation;
            if (conv) {
              setConversations((current) => {
                if (current.find((c) => c.id === convId)) return current;
                return [
                  {
                    id: conv.id,
                    contactId: conv.contactId,
                    contactName: conv.contactName || 'Unknown',
                    contactPhone: conv.contactPhone || '',
                    lastMessagePreview: (updated.lastMessagePreview as string) || '',
                    lastMessageAt: (updated.lastMessageAt as string) || conv.lastMessageAt || conv.createdAt,
                    unreadCount: 1,
                    assignedAgentName: conv.assignedAgentName || agentsMap[conv.assignedAgentId],
                    isPrivate: conv.isPrivate,
                    assignedAgentId: conv.assignedAgentId,
                  },
                  ...current,
                ];
              });
              setConvTotal((t) => t + 1);
            }
          })
          .catch(() => {});
        return prev;
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('conversation_updated', handleConversationUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_updated', handleConversationUpdated);
    };
  }, [socket, selectedId, agentsMap]);

  const handleSelect = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
    router.push(`/dashboard/inbox/${id}`);
  }, [router]);

  const handleBack = useCallback(() => {
    router.push('/dashboard/inbox');
  }, [router]);

  useEffect(() => {
    api.get('/agents').then((res) => {
      const map: Record<string, string> = {};
      (res.data.agents || []).forEach((a: any) => {
        map[a.id] = a.name;
      });
      setAgentsMap(map);
    });
  }, []);

  const lastAssignRef = useRef<{ agentId?: string; agentName?: string }>({});

  const handleAssignAgent = useCallback(async (agentId: string) => {
    if (!selectedId) return;
    setConversations((prev) => {
      const conv = prev.find((c) => c.id === selectedId);
      lastAssignRef.current = { agentId: conv?.assignedAgentId, agentName: conv?.assignedAgentName };
      return prev.map((c) =>
        c.id === selectedId ? { ...c, assignedAgentName: agentsMap[agentId] || undefined, assignedAgentId: agentId || undefined } : c
      );
    });
    try {
      await api.patch(`/conversations/${selectedId}/assign`, { agent_id: agentId });
    } catch (err: any) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, assignedAgentName: lastAssignRef.current.agentName, assignedAgentId: lastAssignRef.current.agentId }
            : c
        )
      );
      toastError(err?.response?.data?.error || 'Something went wrong');
    }
  }, [selectedId, agentsMap]);

  const handleTogglePrivacy = useCallback((isPrivate: boolean) => {
    if (!selectedId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, isPrivate } : c))
    );
  }, [selectedId]);

  const handleDeleteRequest = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    try {
      await api.delete(`/conversations/${confirmDeleteId}`);
      setConversations((prev) => prev.filter((c) => c.id !== confirmDeleteId));
      setConvTotal((t) => Math.max(0, t - 1));
      toastSuccess('Conversation deleted');
      if (selectedId === confirmDeleteId) {
        router.push('/dashboard/inbox');
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to delete conversation');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, selectedId, router]);

  const handleBulkDeleteRequest = useCallback((ids: string[]) => {
    setBulkDeleteIds(ids);
  }, []);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (!bulkDeleteIds || bulkDeleteIds.length === 0) return;
    setBulkDeleting(true);
    try {
      await api.delete('/conversations/bulk', { data: { ids: bulkDeleteIds } });
      setConversations((prev) => prev.filter((c) => !bulkDeleteIds.includes(c.id)));
      setConvTotal((t) => Math.max(0, t - bulkDeleteIds.length));
      toastSuccess(`${bulkDeleteIds.length} conversation(s) deleted`);
      if (bulkDeleteIds.includes(selectedId || '')) {
        router.push('/dashboard/inbox');
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to delete conversations');
    } finally {
      setBulkDeleting(false);
      setBulkDeleteIds(null);
    }
  }, [bulkDeleteIds, selectedId, router]);

  const handleLoadMoreConversations = useCallback(() => {
    if (convLoadingRef.current) return;
    const nextOffset = convOffset + CONV_PAGE_SIZE;
    if (nextOffset < convTotal) {
      fetchConversations(nextOffset, convSearch, true);
    }
  }, [convOffset, convTotal, convSearch, fetchConversations]);

  const handleSearchChange = useCallback((query: string) => {
    setConvSearch(query);
    convSearchRef.current = query;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchConversations(0, query);
    }, 300);
  }, [fetchConversations]);

  const selectedConversation = useMemo(() => conversations.find((c) => c.id === selectedId), [conversations, selectedId]);

  // Fallback: fetch specific conversation if selected but not in loaded list
  useEffect(() => {
    if (!selectedId || selectedConversation || convLoading) return;
    api.get(`/conversations/${selectedId}`)
      .then((res) => {
        const conv = res.data.conversation;
        if (conv) {
          setConversations((prev) => {
            if (prev.find((c) => c.id === conv.id)) return prev;
            return [
              {
                id: conv.id,
                contactId: conv.contactId,
                contactName: conv.contactName || 'Unknown',
                contactPhone: conv.contactPhone || '',
                lastMessagePreview: '',
                lastMessageAt: conv.lastMessageAt || conv.createdAt,
                unreadCount: 0,
                assignedAgentName: conv.assignedAgentName,
                isPrivate: conv.isPrivate,
                assignedAgentId: conv.assignedAgentId,
              },
              ...prev,
            ];
          });
        }
      })
      .catch(() => {});
  }, [selectedId, selectedConversation, convLoading]);

  const handleNewChatSelect = useCallback((conversationId: string) => {
    setNewChatOpen(false);
    fetchConversations(0, convSearch);
    router.push(`/dashboard/inbox/${conversationId}`);
  }, [convSearch, fetchConversations, router]);

  if (!selectedWabaId) {
    return (
      <div className="panel flex h-[calc(100vh-80px)] flex-col items-center justify-center p-8 text-center md:h-[calc(100vh-48px)]">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <Building2 size={32} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Select a WA Business Account</h2>
        <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">Choose a WhatsApp Business Account from the sidebar to view conversations.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col overflow-hidden md:h-[calc(100vh-48px)]">
      <div className="panel flex h-full overflow-hidden rounded-2xl">
        {/* Conversation list - always visible on desktop, toggle on mobile */}
        <div className={`w-full flex-shrink-0 md:block md:w-80 ${selectedId ? 'hidden' : 'block'}`}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
            onNewChat={() => setNewChatOpen(true)}
            onDelete={handleDeleteRequest}
            onBulkDelete={handleBulkDeleteRequest}
            deletingId={deletingId}
            onOpenProfile={(contactId) => { setProfileContactId(contactId); setProfileEditMode(false); setProfileOpen(true); }}
            loading={convLoading}
            hasMore={conversations.length < convTotal}
            onLoadMore={handleLoadMoreConversations}
            searchQuery={convSearch}
            onSearchChange={handleSearchChange}
          />
        </div>

        {/* Chat area - always visible on desktop, toggle on mobile */}
        <div className={`flex-1 border-l border-gray-200 dark:border-gray-800 md:flex ${selectedId ? 'flex' : 'hidden'}`}>
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.id}
              contactId={selectedConversation.contactId}
              contactName={selectedConversation.contactName}
              isPrivate={selectedConversation.isPrivate}
              assignedAgentId={selectedConversation.assignedAgentId}
              currentUserId={user?.id}
              onAssignAgent={handleAssignAgent}
              onTogglePrivacy={handleTogglePrivacy}
              onBack={handleBack}
              onOpenProfile={() => { setProfileContactId(selectedConversation.contactId); setProfileEditMode(true); setProfileOpen(true); }}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <MessageSquare size={20} className="text-gray-400 dark:text-gray-500" />
              </div>
              <h6 className="mb-1 text-base font-medium text-gray-900 dark:text-gray-100">Select a conversation</h6>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose a chat from the list to start messaging</p>
            </div>
          )}
        </div>
      </div>

      <NewChatDialog
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onSelect={handleNewChatSelect}
        existingConversations={conversations.map((c) => ({ id: c.id, contactId: c.contactId }))}
      />

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Conversation"
        message="This will permanently delete the conversation and all its messages. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        open={!!bulkDeleteIds}
        title={`Delete ${bulkDeleteIds?.length || 0} Conversations`}
        message="This will permanently delete the selected conversations and all their messages. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setBulkDeleteIds(null)}
      />

      <ContactProfilePopup
        contactId={profileContactId}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        defaultEditMode={profileEditMode}
      />
    </div>
  );
}
