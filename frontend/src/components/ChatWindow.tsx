'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, X, FileText, Music, Video, Image as ImageIcon, MapPin, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  senderType: 'agent' | 'contact' | 'system';
  createdAt: string;
  messageType?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  filename?: string;
  voice?: boolean;
  reactionToMessageId?: string | null;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Agent {
  id: string;
  name: string;
  email: string;
}

export interface CannedResponse {
  id: string;
  shortcut: string;
  content: string;
  messageType?: string;
  metadata?: {
    mediaUrl?: string;
    filename?: string;
    buttons?: { type: 'reply'; title: string; id?: string }[];
    listOptions?: {
      button: string;
      sections: { title: string; rows: { id: string; title: string; description?: string }[] }[];
    };
  };
}

interface ChatWindowProps {
  conversationId: string;
  contactName: string;
  onAssignAgent?: (agentId: string) => void;
  onBack?: () => void;
}

function MessageStatusIcon({ status }: { status?: Message['status'] }) {
  if (!status) return null;
  if (status === 'failed') {
    return <AlertCircle size={12} className="text-red-500" />;
  }
  if (status === 'read') {
    return <CheckCheck size={12} className="text-blue-600" />;
  }
  if (status === 'delivered') {
    return <CheckCheck size={12} className="text-gray-500" />;
  }
  return <Check size={12} className="text-gray-400" />;
}

function formatMessageDate(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateSeparator(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function getMessageTypeFromMime(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

function getFileIcon(messageType?: string) {
  switch (messageType) {
    case 'image': return <ImageIcon size={16} />;
    case 'video': return <Video size={16} />;
    case 'audio': return <Music size={16} />;
    case 'document': return <FileText size={16} />;
    default: return <FileText size={16} />;
  }
}

const attachmentOptions = [
  { key: 'photo', label: 'Photo', icon: ImageIcon, accept: 'image/*' },
  { key: 'video', label: 'Video', icon: Video, accept: 'video/*' },
  { key: 'audio', label: 'Audio', icon: Music, accept: 'audio/*' },
  { key: 'document', label: 'Document', icon: FileText, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt' },
  { key: 'location', label: 'Location', icon: MapPin, accept: '' },
];

export default function ChatWindow({ conversationId, contactName, onAssignAgent, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashQuery, setSlashQuery] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingMediaId, setPendingMediaId] = useState<string | null>(null);
  const [pendingMessageType, setPendingMessageType] = useState<string>('text');
  const [pendingFilename, setPendingFilename] = useState<string>('');
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationForm, setLocationForm] = useState({ latitude: '', longitude: '', name: '', address: '' });
  const [locationError, setLocationError] = useState('');
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  useEffect(() => {
    if (!conversationId) return;
    api.get(`/messages?conversationId=${conversationId}`).then((res) => {
      setMessages(res.data.messages || []);
    });
  }, [conversationId]);

  // Real-time socket: join conversation room and listen for new messages
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_conversation', conversationId);

    const handleNewMessage = (message: Message) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => {
        // Replace a matching temp message (same content/type/sender) instead of duplicating
        const tempIndex = prev.findIndex(
          (m) =>
            m.id.startsWith('temp-') &&
            m.senderType === message.senderType &&
            m.messageType === message.messageType &&
            m.content === message.content &&
            m.reactionToMessageId === message.reactionToMessageId
        );
        if (tempIndex !== -1) {
          const next = [...prev];
          next[tempIndex] = message;
          return next;
        }
        return [...prev, message];
      });
    };

    const handleStatusUpdate = ({ messageId, status }: { messageId: string; status: Message['status'] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status } : m))
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_status_updated', handleStatusUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status_updated', handleStatusUpdate);
      socket.emit('leave_conversation', conversationId);
    };
  }, [socket, conversationId]);

  useEffect(() => {
    api.get('/agents').then((res) => {
      setAgents(res.data.agents || []);
    });
    api.get('/canned-responses').then((res) => {
      setCannedResponses(res.data.cannedResponses || []);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (attachRef.current && !attachRef.current.contains(event.target as Node)) {
        setAttachOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendText = async () => {
    if (!input.trim() || !conversationId) return;
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      content: input.trim(),
      senderType: 'agent',
      createdAt: new Date().toISOString(),
      messageType: 'text',
    };
    setMessages((prev) => [...prev, tempMessage]);
    setInput('');
    try {
      await api.post('/messages', { conversationId, content: tempMessage.content });
    } catch {
      // Optionally handle send error
    }
  };

  const handleSendMedia = async () => {
    if (!pendingMediaId || !conversationId) return;
    const caption = input.trim();
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      content: caption,
      senderType: 'agent',
      createdAt: new Date().toISOString(),
      messageType: pendingMessageType,
      mediaUrl: pendingMediaId,
      filename: pendingFilename,
    };
    setMessages((prev) => [...prev, tempMessage]);
    setInput('');
    setPendingFile(null);
    setPendingMediaId(null);
    setPendingMessageType('text');
    setPendingFilename('');
    try {
      await api.post('/messages', {
        conversationId,
        content: caption,
        mediaUrl: pendingMediaId,
        messageType: pendingMessageType,
        filename: pendingFilename,
      });
    } catch {
      // Optionally handle send error
    }
  };

  const handleSendLocation = async () => {
    if (!conversationId) return;
    const lat = parseFloat(locationForm.latitude);
    const lng = parseFloat(locationForm.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      content: locationForm.name || `${lat}, ${lng}`,
      senderType: 'agent',
      createdAt: new Date().toISOString(),
      messageType: 'location',
    };
    setMessages((prev) => [...prev, tempMessage]);
    setLocationDialogOpen(false);
    setLocationError('');
    setLocationForm({ latitude: '', longitude: '', name: '', address: '' });
    try {
      await api.post('/messages', {
        conversationId,
        messageType: 'location',
        locationOptions: {
          latitude: lat,
          longitude: lng,
          name: locationForm.name || undefined,
          address: locationForm.address || undefined,
        },
      });
    } catch {
      // Optionally handle send error
    }
  };

  const handleSendReaction = async (targetMessageId: string, emoji: string) => {
    if (!conversationId) return;
    setReactingTo(null);

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      content: emoji,
      senderType: 'agent',
      createdAt: new Date().toISOString(),
      messageType: 'reaction',
      reactionToMessageId: targetMessageId,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      await api.post('/messages', {
        conversationId,
        messageType: 'reaction',
        content: emoji,
        reactionOptions: {
          target_message_id: targetMessageId,
          emoji,
        },
      });
    } catch {
      // Optionally handle send error
    }
  };

  const handleSend = async () => {
    if (pendingMediaId) {
      await handleSendMedia();
    } else {
      await handleSendText();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, filteredCanned.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (filteredCanned.length > 0) {
          insertCanned(filteredCanned[slashIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashOpen(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    const messageType = getMessageTypeFromMime(file.type);
    setPendingMessageType(messageType);
    setPendingFile(file);
    setPendingFilename(file.name);
    setUploading(true);
    setAttachOpen(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPendingMediaId(res.data.id);
    } catch {
      setPendingFile(null);
      setPendingMessageType('text');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelAttachment = () => {
    setPendingFile(null);
    setPendingMediaId(null);
    setPendingMessageType('text');
    setPendingFilename('');
    setInput('');
  };

  const handleSelectAgent = (agentId: string) => {
    setAgentsOpen(false);
    onAssignAgent?.(agentId);
  };

  const sendCannedResponse = async (canned: CannedResponse) => {
    if (!conversationId) return;
    const mt = canned.messageType || 'text';

    // Text type: just insert into input for editing
    if (mt === 'text') {
      setInput(canned.content);
      return;
    }

    // Build temp message for optimistic UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      content: canned.content,
      senderType: 'agent',
      createdAt: new Date().toISOString(),
      messageType: mt,
      mediaUrl: canned.metadata?.mediaUrl,
      filename: canned.metadata?.filename,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const payload: Record<string, unknown> = {
        conversationId,
        content: canned.content,
        messageType: mt,
      };

      if (['image', 'video', 'document', 'audio'].includes(mt)) {
        payload.mediaUrl = canned.metadata?.mediaUrl;
        if (mt === 'document') payload.filename = canned.metadata?.filename;
      }

      if (mt === 'button' && canned.metadata?.buttons) {
        payload.replyButtonsOptions = {
          buttons: canned.metadata.buttons.map((b, i) => ({
            type: b.type || 'reply',
            title: b.title,
            id: b.id || `btn-${i}`,
          })),
        };
      }

      if (mt === 'list' && canned.metadata?.listOptions) {
        payload.listOptions = canned.metadata.listOptions;
      }

      await api.post('/messages', payload);
    } catch {
      // Optionally handle send error
    }
  };

  const handleSelectCanned = (canned: CannedResponse) => {
    setCannedOpen(false);
    sendCannedResponse(canned);
  };

  const insertCanned = (canned: CannedResponse) => {
    const mt = canned.messageType || 'text';
    if (mt !== 'text') {
      sendCannedResponse(canned);
      setSlashOpen(false);
      setSlashQuery('');
      setSlashIndex(0);
      return;
    }
    const lastSlashIndex = input.lastIndexOf('/' + slashQuery);
    if (lastSlashIndex !== -1) {
      const before = input.slice(0, lastSlashIndex);
      const after = input.slice(lastSlashIndex + 1 + slashQuery.length);
      setInput(before + canned.content + after);
    } else {
      setInput(canned.content);
    }
    setSlashOpen(false);
    setSlashQuery('');
    setSlashIndex(0);
  };

  const filteredCanned = slashQuery
    ? cannedResponses.filter((c) =>
        c.shortcut.toLowerCase().includes(slashQuery.toLowerCase()) ||
        c.content.toLowerCase().includes(slashQuery.toLowerCase())
      )
    : cannedResponses;

  const triggerFileInput = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleAttachmentOption = (option: typeof attachmentOptions[0]) => {
    if (option.key === 'location') {
      setAttachOpen(false);
      setLocationDialogOpen(true);
      return;
    }
    triggerFileInput(option.accept);
  };

  return (
    <div className="flex h-full w-full flex-col dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80 md:px-5">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        )}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
          {contactName.charAt(0).toUpperCase()}
        </div>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{contactName}</h3>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <div className="relative">
            <button
              onClick={() => setCannedOpen((prev) => !prev)}
              className="btn-secondary px-2.5 py-1.5 text-xs"
            >
              <span className="hidden md:inline">Canned</span>
              <span className="md:hidden">Canned</span>
            </button>
            {cannedOpen && (
              <ul className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5 md:w-60">
                {cannedResponses.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => handleSelectCanned(c)}
                    className="cursor-pointer px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {c.shortcut}
                  </li>
                ))}
                {cannedResponses.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-400">No canned responses</li>
                )}
              </ul>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setAgentsOpen((prev) => !prev)}
              className="btn-secondary px-2.5 py-1.5 text-xs"
            >
              <span className="hidden md:inline">Assign</span>
              <span className="md:hidden">Assign</span>
            </button>
            {agentsOpen && (
              <ul className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5 md:w-60">
                {agents.map((a) => (
                  <li
                    key={a.id}
                    onClick={() => handleSelectAgent(a.id)}
                    className="cursor-pointer px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {a.name}
                  </li>
                ))}
                {agents.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-400">No agents</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4">
        {(() => {
          // Separate reactions from regular messages
          const reactionsByTarget: Record<string, Message[]> = {};
          const regularMessages: Message[] = [];
          messages.forEach((m) => {
            if (m.messageType === 'reaction' && m.reactionToMessageId) {
              if (!reactionsByTarget[m.reactionToMessageId]) reactionsByTarget[m.reactionToMessageId] = [];
              reactionsByTarget[m.reactionToMessageId].push(m);
            } else {
              regularMessages.push(m);
            }
          });

          return regularMessages.map((msg, index) => {
            const isUser = msg.senderType === 'agent';
            const hasMedia = msg.mediaUrl && msg.messageType && msg.messageType !== 'text';
            const prevMsg = regularMessages[index - 1];
            const showDateSeparator = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
            const msgReactions = reactionsByTarget[msg.id] || [];

            return (
              <div key={msg.id} className="flex flex-col">
                {showDateSeparator && (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {formatDateSeparator(msg.createdAt)}
                    </span>
                  </div>
                )}
                <div className={`group flex items-end gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {/* Reaction picker button — shown on hover, on the outer edge */}
                  <div className={`relative opacity-0 transition-opacity group-hover:opacity-100 ${isUser ? 'order-first' : 'order-last'}`}>
                    <button
                      onClick={() => setReactingTo(reactingTo === msg.id ? null : msg.id)}
                      className="mb-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      title="React"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                    </button>
                    {reactingTo === msg.id && (
                      <div className={`absolute bottom-full z-50 mb-1 flex gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900 ${isUser ? 'right-0' : 'left-0'}`}>
                        {reactionEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleSendReaction(msg.id, emoji)}
                            className="rounded-full p-1 text-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div
                      className={`max-w-[75%] px-3.5 py-2 ${
                        isUser
                          ? 'rounded-2xl rounded-br-sm bg-[#D9FDD3] text-[#111B21]'
                          : 'rounded-2xl rounded-bl-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {hasMedia && (
                        <div className="mb-1.5">
                          {msg.messageType === 'image' && (
                            <div className={`flex items-center gap-2 rounded-lg p-2 ${isUser ? 'bg-black/10' : 'bg-white dark:bg-gray-900/60'}`}>
                              <ImageIcon size={18} className={isUser ? 'text-gray-700' : 'text-primary-600 dark:text-primary-400'} />
                              <span className={`text-xs ${isUser ? 'text-gray-700' : 'text-gray-600 dark:text-gray-400'}`}>Image</span>
                            </div>
                          )}
                          {msg.messageType === 'video' && (
                            <div className={`flex items-center gap-2 rounded-lg p-2 ${isUser ? 'bg-black/10' : 'bg-white dark:bg-gray-900/60'}`}>
                              <Video size={18} className={isUser ? 'text-gray-700' : 'text-primary-600 dark:text-primary-400'} />
                              <span className={`text-xs ${isUser ? 'text-gray-700' : 'text-gray-600 dark:text-gray-400'}`}>Video</span>
                            </div>
                          )}
                          {msg.messageType === 'audio' && (
                            <div className={`flex items-center gap-2 rounded-lg p-2 ${isUser ? 'bg-black/10' : 'bg-white dark:bg-gray-900/60'}`}>
                              <Music size={18} className={isUser ? 'text-gray-700' : 'text-primary-600 dark:text-primary-400'} />
                              <span className={`text-xs ${isUser ? 'text-gray-700' : 'text-gray-600 dark:text-gray-400'}`}>{msg.voice ? 'Voice message' : 'Audio'}</span>
                            </div>
                          )}
                          {msg.messageType === 'document' && (
                            <div className={`flex items-center gap-2 rounded-lg p-2 ${isUser ? 'bg-black/10' : 'bg-white dark:bg-gray-900/60'}`}>
                              <FileText size={18} className={isUser ? 'text-gray-700' : 'text-primary-600 dark:text-primary-400'} />
                              <div className="min-w-0 flex-1">
                                <span className={`block truncate text-xs font-medium ${isUser ? 'text-[#111B21]' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {msg.filename || 'Document'}
                                </span>
                              </div>
                            </div>
                          )}
                          {msg.messageType === 'location' && (
                            <div className={`flex items-center gap-2 rounded-lg p-2 ${isUser ? 'bg-black/10' : 'bg-white dark:bg-gray-900/60'}`}>
                              <MapPin size={18} className={isUser ? 'text-gray-700' : 'text-primary-600 dark:text-primary-400'} />
                              <span className={`text-xs ${isUser ? 'text-gray-700' : 'text-gray-600 dark:text-gray-400'}`}>Location</span>
                            </div>
                          )}
                        </div>
                      )}
                      {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                      <span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isUser ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>
                        {formatMessageDate(msg.createdAt)}
                        {isUser && <MessageStatusIcon status={msg.status} />}
                      </span>
                    </div>

                    {/* Reactions row */}
                    {msgReactions.length > 0 && (
                      <div className={`mt-1 flex flex-wrap gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {msgReactions.map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-sm dark:bg-gray-800"
                            title={`Reacted ${formatMessageDate(r.createdAt)}`}
                          >
                            {r.content}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
        {/* Attachment preview */}
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
            {getFileIcon(pendingMessageType)}
            <span className="flex-1 truncate text-xs font-medium text-gray-700 dark:text-gray-300">{pendingFile.name}</span>
            {uploading && (
              <span className="text-xs text-gray-400">Uploading...</span>
            )}
            <button
              onClick={handleCancelAttachment}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
              aria-label="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Attachment Button */}
          <div className="relative" ref={attachRef}>
            <button
              onClick={() => setAttachOpen((prev) => !prev)}
              disabled={uploading || !!pendingMediaId}
              className="flex flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
              aria-label="Attach"
            >
              <Paperclip size={20} />
            </button>
            {attachOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5">
                {attachmentOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleAttachmentOption(opt)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <Icon size={16} className="text-gray-400" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

          <div className="relative flex-1">
            <textarea
              rows={1}
              placeholder={pendingFile ? 'Add a caption...' : 'Type a message... (type / for canned responses)'}
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                const words = val.split(/\s+/);
                const lastWord = words[words.length - 1];
                if (lastWord.startsWith('/')) {
                  setSlashOpen(true);
                  setSlashQuery(lastWord.slice(1));
                  setSlashIndex(0);
                } else {
                  setSlashOpen(false);
                }
              }}
              onKeyDown={handleKeyDown}
              className="input max-h-32 resize-none py-2.5"
            />
            {slashOpen && filteredCanned.length > 0 && (
              <ul className="absolute bottom-full left-0 z-50 mb-1.5 w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 max-h-56 overflow-y-auto dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5">
                {filteredCanned.map((c, idx) => (
                  <li
                    key={c.id}
                    onClick={() => insertCanned(c)}
                    className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                      idx === slashIndex
                        ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="font-medium">/{c.shortcut}</span>
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{c.content.slice(0, 60)}{c.content.length > 60 ? '...' : ''}</span>
                  </li>
                ))}
              </ul>
            )}
            {slashOpen && filteredCanned.length === 0 && (
              <div className="absolute bottom-full left-0 z-50 mb-1.5 w-full max-w-sm rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5">
                <p className="text-sm text-gray-400 dark:text-gray-500">No canned responses found</p>
              </div>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={uploading || (!input.trim() && !pendingMediaId)}
            className="flex flex-shrink-0 items-center justify-center rounded-xl bg-[#25D366] p-2.5 text-white shadow-sm hover:bg-[#128C7E] disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Location Dialog */}
      {locationDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Send Location</h3>
              <button onClick={() => { setLocationDialogOpen(false); setLocationError(''); }} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            {/* Map Preview */}
            {locationForm.latitude && locationForm.longitude && (
              <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <iframe title="Map preview" width="100%" height="220" style={{ border: 0 }} src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(locationForm.longitude) - 0.01}%2C${parseFloat(locationForm.latitude) - 0.01}%2C${parseFloat(locationForm.longitude) + 0.01}%2C${parseFloat(locationForm.latitude) + 0.01}&layer=mapnik&marker=${locationForm.latitude}%2C${locationForm.longitude}`} />
              </div>
            )}

            {/* Current Location Button */}
            {locationError && (
              <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {locationError}
              </div>
            )}
            <button
              onClick={() => {
                setLocationError('');
                if (!navigator.geolocation) {
                  setLocationError('Geolocation is not supported by your browser');
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setLocationForm((p) => ({
                      ...p,
                      latitude: pos.coords.latitude.toString(),
                      longitude: pos.coords.longitude.toString(),
                    }));
                  },
                  () => setLocationError('Unable to retrieve your location. Please enter coordinates manually.'),
                  { enableHighAccuracy: true, timeout: 10000 }
                );
              }}
              className="btn-secondary mb-4 w-full"
            >
              <MapPin size={16} />
              Use Current Location
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Latitude</label>
                <input type="number" step="any" value={locationForm.latitude} onChange={(e) => setLocationForm((p) => ({ ...p, latitude: e.target.value }))} placeholder="e.g. 37.7749" className="input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Longitude</label>
                <input type="number" step="any" value={locationForm.longitude} onChange={(e) => setLocationForm((p) => ({ ...p, longitude: e.target.value }))} placeholder="e.g. -122.4194" className="input" />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Location Name</label>
                <input type="text" value={locationForm.name} onChange={(e) => setLocationForm((p) => ({ ...p, name: e.target.value }))} placeholder="Optional" className="input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <input type="text" value={locationForm.address} onChange={(e) => setLocationForm((p) => ({ ...p, address: e.target.value }))} placeholder="Optional" className="input" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setLocationDialogOpen(false); setLocationError(''); }} className="btn-secondary">Cancel</button>
              <button onClick={handleSendLocation} disabled={!locationForm.latitude || !locationForm.longitude} className="btn-primary">Send Location</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

