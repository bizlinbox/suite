'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { usePathname } from 'next/navigation';
import {
  areNotificationsEnabled,
  showLocalNotification,
  isNotificationsSupported,
} from '@/lib/notifications';

interface IncomingMessage {
  id: string;
  conversationId: string;
  content: string;
  senderType: 'agent' | 'contact' | 'system';
  createdAt: string;
}

interface ConversationUpdate {
  id?: string;
  conversationId?: string;
  contactName?: string;
  contactPhone?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
}

export default function NotificationManager() {
  const { socket } = useSocket();
  const pathname = usePathname();
  const lastPathRef = useRef(pathname);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    lastPathRef.current = pathname;
  }, [pathname]);

  // Initialize ringtone audio once
  useEffect(() => {
    audioRef.current = new Audio('/ting.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  useEffect(() => {
    if (!socket) return;

    const playRingtone = () => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay blocked or audio not ready — ignore silently
      });
    };

    const handleNewMessage = (message: IncomingMessage) => {
      // Only play ringtone for incoming contact messages while on inbox page
      const currentPath = lastPathRef.current;
      const isInbox = currentPath === '/dashboard/inbox' || currentPath.startsWith('/dashboard/inbox/');

      if (isInbox && message.senderType === 'contact') {
        const isViewingExactConv = currentPath === `/dashboard/inbox/${message.conversationId}`;
        const isVisible = document.visibilityState === 'visible';
        // Don't ring if user is actively looking at the exact conversation
        if (isViewingExactConv && isVisible) return;
        playRingtone();
      }

      if (!isNotificationsSupported()) return;
      if (!areNotificationsEnabled()) return;

      // Skip system messages and agent-sent messages
      if (message.senderType === 'system' || message.senderType === 'agent') return;

      // Skip if user is currently viewing this exact conversation
      const isViewingConversation = currentPath === `/dashboard/inbox/${message.conversationId}`;
      const isVisible = document.visibilityState === 'visible';

      if (isViewingConversation && isVisible) return;

      // Show notification
      showLocalNotification({
        title: 'New message',
        body: message.content || 'You have a new message',
        tag: `msg-${message.conversationId}`,
        conversationId: message.conversationId,
        url: `/dashboard/inbox/${message.conversationId}`,
      });
    };

    const handleConversationUpdated = (updated: ConversationUpdate) => {
      const convId = updated.id || updated.conversationId;
      if (!convId) return;

      const currentPath = lastPathRef.current;
      const isInbox = currentPath === '/dashboard/inbox' || currentPath.startsWith('/dashboard/inbox/');

      if (isInbox && updated.unreadCount && updated.unreadCount > 0) {
        const isViewingExactConv = currentPath === `/dashboard/inbox/${convId}`;
        const isVisible = document.visibilityState === 'visible';
        if (!isViewingExactConv || !isVisible) {
          playRingtone();
        }
      }

      if (!isNotificationsSupported()) return;
      if (!areNotificationsEnabled()) return;
      if (!updated.unreadCount || updated.unreadCount === 0) return;

      const isViewingConversation = currentPath === `/dashboard/inbox/${convId}`;
      const isVisible = document.visibilityState === 'visible';

      if (isViewingConversation && isVisible) return;

      showLocalNotification({
        title: updated.contactName || 'New message',
        body: updated.lastMessagePreview || 'You have a new message',
        tag: `conv-${convId}`,
        conversationId: convId,
        url: `/dashboard/inbox/${convId}`,
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('conversation_updated', handleConversationUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_updated', handleConversationUpdated);
    };
  }, [socket]);

  // Also listen for visibility changes and trigger notifications for
  // messages that arrived while the tab was hidden
  useEffect(() => {
    if (!isNotificationsSupported()) return;

    const handleVisibilityChange = () => {
      // When tab becomes visible, clear notification badges for current conversation
      if (document.visibilityState === 'visible') {
        // Optional: dismiss notifications for the currently viewed conversation
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return null;
}
