'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useWaba } from '@/context/WabaContext';
import ConversationList, { Conversation } from '@/components/ConversationList';
import ChatWindow, { Message } from '@/components/ChatWindow';
import NewChatDialog from '@/components/NewChatDialog';
import { Building2, MessageSquare } from 'lucide-react';

interface InboxProps {
  selectedId: string | null;
}

export default function Inbox({ selectedId }: InboxProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const { socket } = useSocket();
  const { selectedWabaId } = useWaba();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data.conversations || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    audioRef.current = new Audio('/sounds/ting_iphone.mp3');
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      // Play notification sound for incoming contact messages
      if (message.senderType === 'contact' && audioRef.current) {
        const isViewingConversation = message.conversationId === selectedId;
        const isVisible = document.visibilityState === 'visible';
        if (!isViewingConversation || !isVisible) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {
            // Ignore autoplay restrictions
          });
        }
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessagePreview: message.content,
                lastMessageAt: message.createdAt,
                unreadCount: c.id === selectedId ? 0 : c.unreadCount + 1,
              }
            : c
        )
      );
    };

    const handleConversationUpdated = (updated: Conversation) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('conversation_updated', handleConversationUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_updated', handleConversationUpdated);
    };
  }, [socket, selectedId]);

  const handleSelect = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
    router.push(`/dashboard/inbox/${id}`);
  };

  const handleBack = () => {
    router.push('/dashboard/inbox');
  };

  const handleAssignAgent = async (agentId: string) => {
    if (!selectedId) return;
    try {
      await api.patch(`/conversations/${selectedId}/assign`, { agentId });
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, assignedAgentName: agentsMap[agentId], assignedAgentId: agentId } : c))
      );
    } catch {
      // ignore
    }
  };

  const handleTogglePrivacy = (isPrivate: boolean) => {
    if (!selectedId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, isPrivate } : c))
    );
  };

  const [agentsMap, setAgentsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/agents').then((res) => {
      const map: Record<string, string> = {};
      (res.data.agents || []).forEach((a: any) => {
        map[a.id] = a.name;
      });
      setAgentsMap(map);
    });
  }, []);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  const handleNewChatSelect = (conversationId: string) => {
    setNewChatOpen(false);
    fetchConversations();
    router.push(`/dashboard/inbox/${conversationId}`);
  };

  if (!selectedWabaId) {
    return (
      <div className="panel flex h-[calc(100vh-80px)] flex-col items-center justify-center p-8 text-center md:h-[calc(100vh-48px)]">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <Building2 size={32} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Select a WABA Account</h2>
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
    </div>
  );
}
