'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Send, Paperclip, X, FileText, Music, Video, Image as ImageIcon, MapPin, Check, CheckCheck, AlertCircle, User, Lock, Unlock, Mic, Play, Pause, StopCircle, FormInput, Loader2, Trash2, Mail, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { usePermission } from '@/hooks/usePermission';
import TemplateSendDialog from './TemplateSendDialog';
import { toastError } from '@/components/Toaster';

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
  errorMessage?: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
}

export interface QuickReply {
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
  contactId: string;
  contactName: string;
  isPrivate?: boolean;
  assignedAgentId?: string;
  currentUserId?: string;
  onAssignAgent?: (agentId: string) => void;
  onTogglePrivacy?: (isPrivate: boolean) => void;
  onBack?: () => void;
  onOpenProfile?: () => void;
}

function MessageStatusIcon({ status, errorMessage }: { status?: Message['status']; errorMessage?: string }) {
  if (!status) return null;
  if (status === 'failed') {
    return <FailedMessageIcon errorMessage={errorMessage} />;
  }
  if (status === 'read') {
    return <CheckCheck size={12} className="text-blue-600" />;
  }
  if (status === 'delivered') {
    return <CheckCheck size={12} className="text-gray-500" />;
  }
  return <Check size={12} className="text-gray-400" />;
}

function FailedMessageIcon({ errorMessage }: { errorMessage?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-sm focus:outline-none focus:ring-1 focus:ring-red-400"
        aria-label="Message failed to send"
      >
        <AlertCircle size={12} className="text-red-500" />
      </button>
      {open && errorMessage && (
        <span className="absolute bottom-full right-0 z-50 mb-1.5 w-56 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-700 shadow-lg dark:border-red-900/40 dark:bg-gray-900 dark:text-red-400">
          <span className="mb-1 block font-semibold">Failed to send</span>
          {errorMessage}
        </span>
      )}
    </span>
  );
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

function getMediaUrl(mediaUrl?: string): string {
  if (!mediaUrl) return '';
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl;
  // Meta media IDs are numeric strings — proxy through backend
  if (/^\d+$/.test(mediaUrl)) return `${api.defaults.baseURL}/media/proxy/${mediaUrl}`;
  return `${api.defaults.baseURL?.replace('/api/v1', '') || ''}/uploads/${mediaUrl}`;
}

function formatAudioTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const SPEEDS = [1, 1.5, 2, 2.5, 3];

function VoiceMessagePlayer({ mediaUrl, isUser, voice }: { mediaUrl?: string; isUser: boolean; voice?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const speedRef = useRef<HTMLDivElement>(null);
  const url = getMediaUrl(mediaUrl);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [url]);

  // Close speed popup on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (speedRef.current && !speedRef.current.contains(event.target as Node)) {
        setSpeedOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeSpeed = (s: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = s;
    }
    setSpeed(s);
    setSpeedOpen(false);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2 rounded-lg p-2 min-w-[200px] ${isUser ? 'bg-black/10' : 'bg-gray-100 dark:bg-gray-900/60'}`}>
      <button
        onClick={togglePlay}
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-primary-700' : 'bg-primary-600'} text-white`}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          {voice && <Mic size={12} className={`${isUser ? 'text-gray-700 dark:text-[#e9edef]' : 'text-gray-500 dark:text-gray-400'}`} />}
          <div className="h-1.5 flex-1 rounded-full bg-gray-300 dark:bg-gray-700">
            <div
              className="h-1.5 rounded-full bg-primary-600"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className={`text-[10px] ${isUser ? 'text-gray-700 dark:text-[#e9edef]/80' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatAudioTime(currentTime)}
          </span>
          <span className={`text-[10px] ${isUser ? 'text-gray-700 dark:text-[#e9edef]/80' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatAudioTime(duration)}
          </span>
        </div>
      </div>

      {/* Speed control */}
      <div className="relative" ref={speedRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setSpeedOpen((prev) => !prev); }}
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${isUser ? 'bg-white/30 text-gray-800 dark:bg-white/10 dark:text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} hover:opacity-80`}
          title="Playback speed"
        >
          {speed}x
        </button>
        {speedOpen && (
          <div className={`absolute bottom-full right-0 z-50 mb-1 flex flex-col overflow-hidden rounded-lg border shadow-lg ${isUser ? 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); changeSpeed(s); }}
                className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  s === speed
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>

      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
    </div>
  );
}

const attachmentOptions = [
  { key: 'photo', label: 'Photo', icon: ImageIcon, accept: 'image/*' },
  { key: 'video', label: 'Video', icon: Video, accept: 'video/*' },
  { key: 'audio', label: 'Audio', icon: Music, accept: 'audio/*' },
  { key: 'document', label: 'Document', icon: FileText, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt' },
  { key: 'location', label: 'Location', icon: MapPin, accept: '' },
  { key: 'flow', label: 'Flow', icon: FormInput, accept: '' },
];

export default function ChatWindow({ conversationId, contactId, contactName, isPrivate: initialIsPrivate, assignedAgentId, currentUserId, onAssignAgent, onTogglePrivacy, onBack, onOpenProfile }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashQuery, setSlashQuery] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingMediaId, setPendingMediaId] = useState<string | null>(null);
  const [pendingMessageType, setPendingMessageType] = useState<string>('text');
  const [pendingFilename, setPendingFilename] = useState<string>('');
  const [pendingMimeType, setPendingMimeType] = useState<string>('');
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationForm, setLocationForm] = useState({ latitude: '', longitude: '', name: '', address: '' });
  const [locationError, setLocationError] = useState('');
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate || false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [msgOffset, setMsgOffset] = useState(0);
  const [msgTotal, setMsgTotal] = useState(0);
  const [msgLoading, setMsgLoading] = useState(false);
  const attachRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const agentsRef = useRef<HTMLDivElement>(null);
  const slashRef = useRef<HTMLDivElement>(null);
  const reactingToRef = useRef<string | null>(null);
  const { socket } = useSocket();
  const { isAdmin } = usePermission();
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingCancelledRef = useRef(false);

  // Voice preview state
  const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string>('');
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
  const [voicePreviewCurrentTime, setVoicePreviewCurrentTime] = useState(0);
  const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Flow dialog state
  const [flowDialogOpen, setFlowDialogOpen] = useState(false);
  const [flows, setFlows] = useState<{ id: string; name: string; flowId: string; status: string }[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [flowForm, setFlowForm] = useState({ body: '', header: '', footer: '', flowToken: `flow-${Date.now()}`, screen: '', data: '' });
  const [sendingFlow, setSendingFlow] = useState(false);

  // Template sending state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateWindowOpen, setTemplateWindowOpen] = useState(true);
  const [lastIncomingMessageAt, setLastIncomingMessageAt] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAgents, setAiAgents] = useState<{ id: string; name: string }[]>([]);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);

  useEffect(() => {
    api.get('/ai-agents').then((res) => {
      setAiAgents((res.data.agents || []).filter((a: any) => a.isActive).map((a: any) => ({ id: a.id, name: a.name })));
    }).catch(() => {});
  }, []);

  // Load messages with pagination (newest first via direction=desc, reversed for display)
  useEffect(() => {
    if (!conversationId) return;
    setMsgLoading(true);
    setMsgOffset(0);
    api.get(`/messages?conversationId=${conversationId}&limit=50&offset=0&direction=desc`)
      .then((res) => {
        const fetched = (res.data.messages || []) as Message[];
        setMsgTotal(res.data.total || 0);
        // Reverse so oldest of the loaded set is at top
        setMessages(fetched.slice().reverse());
        setMsgOffset(0);
      })
      .finally(() => setMsgLoading(false));
  }, [conversationId]);

  const handleLoadOlderMessages = async () => {
    if (!conversationId || msgLoading) return;
    const nextOffset = msgOffset + 50;
    if (messages.length >= msgTotal) return;
    setMsgLoading(true);
    try {
      // Save current scroll height to maintain position after prepend
      const container = messagesContainerRef.current;
      const prevScrollHeight = container?.scrollHeight || 0;
      const res = await api.get(`/messages?conversationId=${conversationId}&limit=50&offset=${nextOffset}&direction=desc`);
      const fetched = (res.data.messages || []) as Message[];
      if (fetched.length > 0) {
        setMessages((prev) => [...fetched.slice().reverse(), ...prev]);
        setMsgOffset(nextOffset);
        // Restore scroll position after prepend
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to load older messages');
    } finally {
      setMsgLoading(false);
    }
  };

  // Check 24h conversation window status
  useEffect(() => {
    if (!conversationId) return;
    const checkWindow = async () => {
      try {
        const res = await api.get(`/messages/template-window/${conversationId}`);
        setTemplateWindowOpen(res.data.windowOpen);
        setLastIncomingMessageAt(res.data.lastIncomingMessageAt);
      } catch {
        setTemplateWindowOpen(false);
      }
    };
    checkWindow();
    // Re-check every 60 seconds
    const interval = setInterval(checkWindow, 60000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Real-time socket: join conversation room and listen for new messages
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_conversation', conversationId);

    const handleNewMessage = (message: Message) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => {
        // Deduplicate: backend emits to both conv and org rooms
        if (prev.some((m) => m.id === message.id)) return prev;

        // Replace a matching temp message (same content/type/sender) instead of duplicating
        const tempIndex = prev.findIndex(
          (m) =>
            m.id.startsWith('temp-') &&
            m.senderType === message.senderType &&
            m.messageType === message.messageType &&
            m.content === message.content &&
            (m.reactionToMessageId ?? null) === (message.reactionToMessageId ?? null)
        );
        if (tempIndex !== -1) {
          const next = [...prev];
          next[tempIndex] = message;
          return next;
        }
        return [...prev, message];
      });
    };

    const handleStatusUpdate = ({ messageId, status, errorMessage }: { messageId: string; status: Message['status']; errorMessage?: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status, ...(errorMessage && { errorMessage }) } : m))
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
    api.get('/quick-replies').then((res) => {
      setQuickReplies(res.data.quickReplies || []);
    });
  }, []);

  // Auto-scroll to bottom only when new messages are appended (not when older messages are loaded)
  const lastMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (messages.length === 0) return;
    const lastId = messages[messages.length - 1]?.id;
    if (lastId && lastId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastId;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Sync reactingTo ref for use in document event listeners
  reactingToRef.current = reactingTo;

  // Close popups when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (attachRef.current && !attachRef.current.contains(target)) {
        setAttachOpen(false);
      }
      if (quickRef.current && !quickRef.current.contains(target)) {
        setQuickOpen(false);
      }
      if (agentsRef.current && !agentsRef.current.contains(target)) {
        setAgentsOpen(false);
      }
      if (slashRef.current && !slashRef.current.contains(target)) {
        setSlashOpen(false);
        setSlashQuery('');
        setSlashIndex(0);
      }
      if (reactingToRef.current) {
        const container = document.querySelector(`[data-reaction-container="${reactingToRef.current}"]`);
        if (!container || !container.contains(target)) {
          setReactingTo(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close all popups on Escape key
  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setQuickOpen(false);
        setAgentsOpen(false);
        setAttachOpen(false);
        setSlashOpen(false);
        setSlashQuery('');
        setSlashIndex(0);
        setReactingTo(null);
        setLocationDialogOpen(false);
        setLocationError('');
      }
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
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
      reactionToMessageId: null,
    };
    setMessages((prev) => [...prev, tempMessage]);
    setInput('');
    try {
      await api.post('/messages', { conversationId, content: tempMessage.content });
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send message');
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
      reactionToMessageId: null,
    };
    setMessages((prev) => [...prev, tempMessage]);
    setInput('');
    setPendingFile(null);
    setPendingMediaId(null);
    setPendingMessageType('text');
    setPendingFilename('');
    setPendingMimeType('');
    try {
      await api.post('/messages', {
        conversationId,
        content: caption,
        mediaUrl: pendingMediaId,
        messageType: pendingMessageType,
        filename: pendingFilename,
        ...(pendingMimeType && { mediaMimeType: pendingMimeType }),
      });
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send media');
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
      reactionToMessageId: null,
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
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send location');
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
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send reaction');
    }
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm; codecs=opus')
        ? 'audio/webm; codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')
        ? 'audio/ogg; codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];
      recordingCancelledRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingCancelledRef.current) return;
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setVoicePreviewBlob(blob);
        setVoicePreviewUrl(url);
        setVoicePreviewCurrentTime(0);
        setVoicePreviewPlaying(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      toastError('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    recordingCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const cancelVoicePreview = () => {
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
    }
    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl);
    }
    setVoicePreviewBlob(null);
    setVoicePreviewUrl('');
    setVoicePreviewPlaying(false);
    setVoicePreviewCurrentTime(0);
    setRecordingDuration(0);
  };

  const toggleVoicePreview = () => {
    const audio = voicePreviewAudioRef.current;
    if (!audio) return;
    if (voicePreviewPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  useEffect(() => {
    const audio = voicePreviewAudioRef.current;
    if (!audio) return;
    const onPlay = () => setVoicePreviewPlaying(true);
    const onPause = () => setVoicePreviewPlaying(false);
    const onEnded = () => { setVoicePreviewPlaying(false); setVoicePreviewCurrentTime(0); };
    const onTimeUpdate = () => setVoicePreviewCurrentTime(audio.currentTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [voicePreviewUrl]);

  const sendVoiceMessage = async (blob: Blob) => {
    if (!conversationId) return;

    const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type });

    let uploadUrl: string;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      uploadUrl = res.data.url;
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to upload voice message');
      return;
    }

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      content: '',
      senderType: 'agent',
      createdAt: new Date().toISOString(),
      messageType: 'audio',
      mediaUrl: uploadUrl,
      voice: true,
      reactionToMessageId: null,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      await api.post('/messages', {
        conversationId,
        content: '',
        messageType: 'audio',
        mediaUrl: uploadUrl,
        mediaMimeType: file.type,
        voice: true,
      });
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send voice message');
    } finally {
      // Clear preview state
      if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
      setVoicePreviewBlob(null);
      setVoicePreviewUrl('');
      setVoicePreviewPlaying(false);
      setVoicePreviewCurrentTime(0);
      setRecordingDuration(0);
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
        setSlashIndex((i) => Math.min(i + 1, filteredQuickReplies.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (filteredQuickReplies.length > 0) {
          insertQuickReply(filteredQuickReplies[slashIndex]);
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
    setPendingMimeType(file.type);
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
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to upload file');
      setPendingFile(null);
      setPendingMessageType('text');
    } finally {
      setPendingMimeType('');
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelAttachment = () => {
    setPendingFile(null);
    setPendingMediaId(null);
    setPendingMessageType('text');
    setPendingFilename('');
    setPendingMimeType('');
    setInput('');
  };

  const handleSelectAgent = (agentId: string) => {
    setAgentsOpen(false);
    onAssignAgent?.(agentId);
  };

  const handleTogglePrivacy = async () => {
    if (!conversationId) return;
    const next = !isPrivate;
    try {
      await api.patch(`/conversations/${conversationId}/private`, { is_private: next });
      setIsPrivate(next);
      onTogglePrivacy?.(next);
    } catch {
      // ignore
    }
  };

  const sendQuickReply = async (quick: QuickReply) => {
    if (!conversationId) return;
    const mt = quick.messageType || 'text';

    // Text type: just insert into input for editing
    if (mt === 'text') {
      setInput(quick.content);
      return;
    }

    // Build temp message for optimistic UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      content: quick.content,
      senderType: 'agent',
      createdAt: new Date().toISOString(),
      messageType: mt,
      mediaUrl: quick.metadata?.mediaUrl,
      filename: quick.metadata?.filename,
      reactionToMessageId: null,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const payload: Record<string, unknown> = {
        conversationId,
        content: quick.content,
        messageType: mt,
      };

      if (['image', 'video', 'document', 'audio'].includes(mt)) {
        payload.mediaUrl = quick.metadata?.mediaUrl;
        if (mt === 'document') payload.filename = quick.metadata?.filename;
      }

      if (mt === 'button' && quick.metadata?.buttons) {
        payload.replyButtonsOptions = {
          body: quick.content,
          buttons: quick.metadata.buttons.map((b, i) => ({
            type: b.type || 'reply',
            title: b.title,
            id: b.id || `btn-${i}`,
          })),
        };
      }

      if (mt === 'list' && quick.metadata?.listOptions) {
        payload.listOptions = {
          body: quick.content,
          button: quick.metadata.listOptions.button,
          sections: quick.metadata.listOptions.sections,
        };
      }

      await api.post('/messages', payload);
    } catch {
      // Optionally handle send error
    }
  };

  const handleSelectQuickReply = (quick: QuickReply) => {
    setQuickOpen(false);
    sendQuickReply(quick);
  };

  const insertQuickReply = (quick: QuickReply) => {
    const mt = quick.messageType || 'text';
    if (mt !== 'text') {
      sendQuickReply(quick);
      setSlashOpen(false);
      setSlashQuery('');
      setSlashIndex(0);
      return;
    }
    const lastSlashIndex = input.lastIndexOf('/' + slashQuery);
    if (lastSlashIndex !== -1) {
      const before = input.slice(0, lastSlashIndex);
      const after = input.slice(lastSlashIndex + 1 + slashQuery.length);
      setInput(before + quick.content + after);
    } else {
      setInput(quick.content);
    }
    setSlashOpen(false);
    setSlashQuery('');
    setSlashIndex(0);
  };

  const filteredQuickReplies = slashQuery
    ? quickReplies.filter((c) =>
        c.shortcut.toLowerCase().includes(slashQuery.toLowerCase()) ||
        c.content.toLowerCase().includes(slashQuery.toLowerCase())
      )
    : quickReplies;

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
    if (option.key === 'flow') {
      setAttachOpen(false);
      setFlowDialogOpen(true);
      api.get('/flows').then((res) => {
        setFlows(res.data.flows || []);
      });
      return;
    }
    triggerFileInput(option.accept);
  };

  const handleSendFlow = async () => {
    if (!conversationId || !selectedFlowId) return;
    const flow = flows.find((f) => f.id === selectedFlowId);
    if (!flow) return;

    setSendingFlow(true);
    try {
      const payload: Record<string, unknown> = {
        conversation_id: conversationId,
        body: flowForm.body || `Please complete: ${flow.name}`,
        header: flowForm.header || undefined,
        footer: flowForm.footer || undefined,
        flow_token: flowForm.flowToken,
      };
      if (flowForm.screen) {
        payload.screen = flowForm.screen;
      }
      if (flowForm.data) {
        try {
          payload.data = JSON.parse(flowForm.data);
        } catch {
          toastError('Flow data is not valid JSON');
          setSendingFlow(false);
          return;
        }
      }
      await api.post(`/flows/${selectedFlowId}/send`, payload);
      setFlowDialogOpen(false);
      setSelectedFlowId('');
      setFlowForm({ body: '', header: '', footer: '', flowToken: `flow-${Date.now()}`, screen: '', data: '' });
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send flow');
    } finally {
      setSendingFlow(false);
    }
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
        <button
          onClick={() => onOpenProfile?.()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-800/40"
        >
          {contactName.charAt(0).toUpperCase()}
        </button>
        <button
          onClick={() => onOpenProfile?.()}
          className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-gray-900 hover:text-primary-700 dark:text-gray-100 dark:hover:text-primary-400"
        >
          {contactName}
        </button>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <div className="relative" ref={quickRef}>
            <button
              onClick={() => setQuickOpen((prev) => !prev)}
              className="btn-secondary px-2.5 py-1.5 text-xs"
            >
              <span className="hidden md:inline">Quick</span>
              <span className="md:hidden">Quick</span>
            </button>
            {quickOpen && (
              <ul className="absolute right-0 top-full z-50 mt-1.5 max-h-64 w-52 overflow-y-auto overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5 md:w-60">
                {quickReplies.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => handleSelectQuickReply(c)}
                    className="cursor-pointer px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {c.shortcut}
                  </li>
                ))}
                {quickReplies.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-400">No quick replies</li>
                )}
              </ul>
            )}
          </div>

          <div className="relative" ref={agentsRef}>
            <button
              onClick={() => setAgentsOpen((prev) => !prev)}
              className="btn-secondary px-2.5 py-1.5 text-xs"
            >
              <span className="hidden md:inline">Assign</span>
              <span className="md:hidden">Assign</span>
            </button>
            {agentsOpen && (
              <ul className="absolute right-0 top-full z-50 mt-1.5 max-h-64 w-52 overflow-y-auto overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5 md:w-60">
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

          {/* Privacy Toggle */}
          {(assignedAgentId === currentUserId || isAdmin) && (
            <button
              onClick={handleTogglePrivacy}
              className={`btn-secondary px-2.5 py-1.5 text-xs ${isPrivate ? 'text-red-600 dark:text-red-400' : ''}`}
              title={isPrivate ? 'Private - only you and admins can see' : 'Make private'}
            >
              {isPrivate ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex flex-1 flex-col overflow-y-auto px-4 py-3">
        {msgTotal > messages.length && (
          <div className="mb-2 flex justify-center">
            <button
              onClick={handleLoadOlderMessages}
              disabled={msgLoading}
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {msgLoading ? <Loader2 size={12} className="animate-spin" /> : null}
              Load older messages
            </button>
          </div>
        )}
        {(() => {
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
            const nextMsg = regularMessages[index + 1];
            const showDateSeparator = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
            const isFirstInGroup = !prevMsg || prevMsg.senderType !== msg.senderType || showDateSeparator;
            const isLastInGroup = !nextMsg || nextMsg.senderType !== msg.senderType;
            const msgReactions = reactionsByTarget[msg.id] || [];

            return (
              <div key={msg.id} className={`flex flex-col ${isFirstInGroup ? 'mt-3' : 'mt-[2px]'}`}>
                {showDateSeparator && (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-tertiary-100 px-3 py-1 text-[11px] font-medium text-primary-700 shadow-sm dark:bg-primary-900/40 dark:text-primary-200">
                      {formatDateSeparator(msg.createdAt)}
                    </span>
                  </div>
                )}
                <div className={`group flex items-end gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && isFirstInGroup && (
                    <div
                      className="mb-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      title={contactName}
                    >
                      {contactName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Reaction picker button */}
                  <div data-reaction-container={msg.id} className={`relative opacity-0 transition-opacity group-hover:opacity-100 ${isUser ? 'order-first' : 'order-last'}`}>
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

                  <div className="flex max-w-[75%] flex-col">
                    <div
                      className={`relative px-4 py-2.5 ${
                        isUser
                          ? 'rounded-2xl rounded-tr-sm bg-primary-600 text-white shadow-sm dark:bg-primary-700'
                          : 'rounded-2xl rounded-tl-sm border border-gray-100 bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-100 dark:shadow-none'
                      }`}
                    >
                      {hasMedia && (
                        <div className="mb-1.5">
                          {msg.messageType === 'image' && msg.mediaUrl && (
                            <div className="mb-1.5 overflow-hidden rounded-xl">
                              <img
                                src={getMediaUrl(msg.mediaUrl)}
                                alt="Image"
                                className="max-h-60 w-auto cursor-pointer object-cover"
                                onClick={() => setLightboxImage(getMediaUrl(msg.mediaUrl))}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          )}
                          {msg.messageType === 'video' && msg.mediaUrl && (
                            <div className="mb-1.5 overflow-hidden rounded-xl">
                              <video
                                src={getMediaUrl(msg.mediaUrl)}
                                controls
                                className="max-h-60 w-auto"
                                onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
                              />
                            </div>
                          )}
                          {msg.messageType === 'audio' && (
                            <VoiceMessagePlayer
                              mediaUrl={msg.mediaUrl}
                              isUser={isUser}
                              voice={msg.voice}
                            />
                          )}
                          {msg.messageType === 'document' && (
                            <div className={`flex items-center gap-2 rounded-xl p-2.5 ${isUser ? 'bg-black/10' : 'bg-gray-100 dark:bg-gray-900/60'}`}>
                              <FileText size={18} className={isUser ? 'text-white/90 dark:text-white' : 'text-gray-600 dark:text-gray-400'} />
                              <div className="min-w-0 flex-1">
                                <span className={`block truncate text-xs font-medium ${isUser ? 'text-white dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {msg.filename || 'Document'}
                                </span>
                              </div>
                            </div>
                          )}
                          {msg.messageType === 'location' && (
                            <div className={`flex items-center gap-2 rounded-xl p-2.5 ${isUser ? 'bg-black/10' : 'bg-gray-100 dark:bg-gray-900/60'}`}>
                              <MapPin size={18} className={isUser ? 'text-white/90 dark:text-white' : 'text-gray-600 dark:text-gray-400'} />
                              <span className={`text-xs ${isUser ? 'text-gray-700 dark:text-[#e9edef]/80' : 'text-gray-600 dark:text-gray-400'}`}>Location</span>
                            </div>
                          )}
                          {msg.messageType === 'nfm_reply' && (
                            <div className={`flex items-center gap-2 rounded-xl p-2.5 ${isUser ? 'bg-green-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                              <FormInput size={18} className="text-green-600 dark:text-green-400" />
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">Form completed</span>
                            </div>
                          )}
                        </div>
                      )}
                      {msg.content && (
                        <div className="flex items-end gap-2">
                          <p className="flex-1 text-[14.2px] leading-snug">{msg.content}</p>
                          <span className={`flex-shrink-0 self-end whitespace-nowrap text-[11px] leading-none opacity-70 ${isUser ? 'text-white/70 dark:text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                            {formatMessageDate(msg.createdAt)}
                            {isUser && <span className="ml-0.5 inline-block"><MessageStatusIcon status={msg.status} errorMessage={msg.errorMessage} /></span>}
                          </span>
                        </div>
                      )}
                      {!msg.content && hasMedia && (
                        <span className={`flex items-center justify-end gap-1 text-[11px] opacity-70 ${isUser ? 'text-white/70 dark:text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                          {formatMessageDate(msg.createdAt)}
                          {isUser && <MessageStatusIcon status={msg.status} errorMessage={msg.errorMessage} />}
                        </span>
                      )}
                    </div>

                    {/* Reactions row */}
                    {msgReactions.length > 0 && (
                      <div className={`z-10 -mt-2 flex flex-wrap gap-0.5 ${isUser ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
                        {msgReactions.map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-sm shadow-sm dark:bg-[#2a3942]"
                            title={`Reacted ${formatMessageDate(r.createdAt)}`}
                          >
                            {r.content}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isUser && isFirstInGroup && (
                    <div
                      className="mb-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-200 text-[10px] font-semibold text-primary-800 dark:bg-primary-800/40 dark:text-primary-300"
                      title="Agent"
                    >
                      A
                    </div>
                  )}
                </div>
              </div>
            );
          });
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100/80 bg-white px-4 py-3 dark:border-gray-800/60 dark:bg-gray-900">
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
          {!templateWindowOpen ? (
            // 24h window closed — only template sending allowed
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-900/20">
              <AlertCircle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="flex-1 text-sm text-amber-700 dark:text-amber-300">
                24-hour conversation window closed
              </span>
              <button
                onClick={() => setTemplateDialogOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                <Mail size={14} />
                Send Template
              </button>
            </div>
          ) : (
            <>
              {/* Attachment Button */}
              <div className="relative self-center" ref={attachRef}>
                <button
                  onClick={() => setAttachOpen((prev) => !prev)}
                  disabled={uploading || !!pendingMediaId || isRecording}
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 ${isRecording ? 'hidden' : ''}`}
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

              {isRecording ? (
                <div className="flex flex-1 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-900/20">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                  </span>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">Recording</span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                  <div className="flex-1"></div>
                  <button
                    onClick={cancelRecording}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                    title="Stop"
                  >
                    <StopCircle size={18} />
                  </button>
                </div>
              ) : voicePreviewBlob ? (
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 dark:border-primary-900/40 dark:bg-primary-900/20">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVoicePreview(); }}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-white"
                  >
                    {voicePreviewPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center gap-1.5">
                      <Mic size={12} className="text-gray-500 dark:text-gray-400" />
                      <div className="h-1.5 flex-1 rounded-full bg-gray-300 dark:bg-gray-700">
                        <div
                          className="h-1.5 rounded-full bg-primary-600"
                          style={{ width: `${recordingDuration > 0 ? (voicePreviewCurrentTime / recordingDuration) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-0.5 flex justify-between">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{formatAudioTime(voicePreviewCurrentTime)}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{formatAudioTime(recordingDuration)}</span>
                    </div>
                  </div>
                  <audio ref={voicePreviewAudioRef} src={voicePreviewUrl} preload="metadata" className="hidden" />
                  <button
                    onClick={cancelVoicePreview}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => voicePreviewBlob && sendVoiceMessage(voicePreviewBlob)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm hover:bg-secondary-500"
                    title="Send voice message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative flex-1 self-center" ref={slashRef}>
                    <textarea
                      rows={1}
                      placeholder={pendingFile ? 'Add a caption...' : 'Type a message... (type / for quick replies)'}
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
                      className="input max-h-32 min-h-11 resize-none py-2.5"
                    />
                    {slashOpen && filteredQuickReplies.length > 0 && (
                      <ul className="absolute bottom-full left-0 z-50 mb-1.5 w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 max-h-56 overflow-y-auto dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5">
                        {filteredQuickReplies.map((c, idx) => (
                          <li
                            key={c.id}
                            onClick={() => insertQuickReply(c)}
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
                    {slashOpen && filteredQuickReplies.length === 0 && (
                      <div className="absolute bottom-full left-0 z-50 mb-1.5 w-full max-w-sm rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/5">
                        <p className="text-sm text-gray-400 dark:text-gray-500">No quick replies found</p>
                      </div>
                    )}
                  </div>

                  {/* Template button */}
                  <button
                    onClick={() => setTemplateDialogOpen(true)}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                    aria-label="Send template"
                    title="Send template"
                  >
                    <Mail size={20} />
                  </button>

                  {/* AI Assist button */}
                  {aiAgents.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setAiMenuOpen((p) => !p)}
                        disabled={aiLoading}
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-purple-500 hover:bg-purple-50 hover:text-purple-700 dark:border-gray-700 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
                        title="AI Assist"
                      >
                        {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                      </button>
                      {aiMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setAiMenuOpen(false)} />
                          <div className="absolute bottom-full right-0 z-40 mb-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Generate reply with</div>
                            {aiAgents.map((agent) => (
                              <button
                                key={agent.id}
                                onClick={async () => {
                                  setAiMenuOpen(false);
                                  setAiLoading(true);
                                  try {
                                    const res = await api.post('/ai-agents/generate', {
                                      conversation_id: conversationId,
                                      agent_id: agent.id,
                                    });
                                    setInput(res.data.response);
                                  } catch (err: any) {
                                    toastError(err.response?.data?.error || 'AI generation failed');
                                  } finally {
                                    setAiLoading(false);
                                  }
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-purple-50 dark:text-gray-300 dark:hover:bg-purple-900/20"
                              >
                                <Sparkles size={16} className="text-purple-500" />
                                <span className="font-medium">{agent.name}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {!input.trim() && !pendingMediaId ? (
                    <button
                      onClick={startRecording}
                      disabled={uploading}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm hover:bg-secondary-500 disabled:opacity-40"
                      title="Record voice message"
                    >
                      <Mic size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={uploading || (!input.trim() && !pendingMediaId)}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm hover:bg-secondary-500 disabled:opacity-40"
                    >
                      <Send size={18} />
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Location Dialog */}
      {locationDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setLocationDialogOpen(false); setLocationError(''); } }}>
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
      {/* Flow Dialog */}
      {flowDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setFlowDialogOpen(false); }}>
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Send Flow</h3>
              <button onClick={() => setFlowDialogOpen(false)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Select Flow</label>
                <select
                  value={selectedFlowId}
                  onChange={(e) => setSelectedFlowId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Choose a flow...</option>
                  {flows.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} {f.status !== 'PUBLISHED' ? `(${f.status})` : ''}</option>
                  ))}
                </select>
                {flows.length === 0 && <p className="mt-1 text-xs text-gray-400">No flows found. Create one in Settings &rarr; Flows.</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Header (optional)</label>
                <input
                  type="text"
                  value={flowForm.header}
                  onChange={(e) => setFlowForm((p) => ({ ...p, header: e.target.value }))}
                  className="input w-full"
                  placeholder="Form header..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Body</label>
                <textarea
                  value={flowForm.body}
                  onChange={(e) => setFlowForm((p) => ({ ...p, body: e.target.value }))}
                  rows={2}
                  className="input w-full"
                  placeholder="Please complete this form..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Footer (optional)</label>
                <input
                  type="text"
                  value={flowForm.footer}
                  onChange={(e) => setFlowForm((p) => ({ ...p, footer: e.target.value }))}
                  className="input w-full"
                  placeholder="Powered by BizlInbox"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Flow Token</label>
                <input
                  type="text"
                  value={flowForm.flowToken}
                  onChange={(e) => setFlowForm((p) => ({ ...p, flowToken: e.target.value }))}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Screen (optional)</label>
                <input
                  type="text"
                  value={flowForm.screen}
                  onChange={(e) => setFlowForm((p) => ({ ...p, screen: e.target.value }))}
                  className="input w-full"
                  placeholder="e.g. SIGN_UP"
                />
                <p className="mt-1 text-xs text-gray-400">Navigate to a specific screen when the user opens the flow.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Screen Data (optional)</label>
                <textarea
                  value={flowForm.data}
                  onChange={(e) => setFlowForm((p) => ({ ...p, data: e.target.value }))}
                  rows={3}
                  className="input w-full font-mono text-xs"
                  placeholder='{"key": "value"}'
                />
                <p className="mt-1 text-xs text-gray-400">JSON object to pre-fill fields on the target screen.</p>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setFlowDialogOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSendFlow} disabled={!selectedFlowId || sendingFlow} className="btn-primary">
                  {sendingFlow ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Send Flow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TemplateSendDialog
        open={templateDialogOpen}
        conversationId={conversationId}
        onClose={() => setTemplateDialogOpen(false)}
      />

    </div>
  );
}

