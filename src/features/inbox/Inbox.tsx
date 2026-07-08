import React, { useState, useEffect, useRef, useMemo } from 'react';
import './Inbox.css';
import { 
  MdSearch, MdCheck, MdClose, MdAttachFile,
  MdArrowBack, MdSend, MdInsertEmoticon, MdFlashOn, MdReply,
  MdMic, MdDelete, MdDoneAll, MdErrorOutline,
  MdMoreVert, MdKeyboardArrowDown, MdPlayArrow, MdPause, MdChat,
  MdChevronLeft, MdChevronRight
} from 'react-icons/md';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Account, Conversation, Message } from '../../types/db';
import { useConversations, conversationsKey } from '../../hooks/useConversations';
import { useMessages } from '../../hooks/useMessages';
import { useContacts } from '../../hooks/useContacts';
import api from '../../services/api';
import { useOrders } from '../../hooks/useOrders';
import { useQuickReplies } from '../../hooks/useQuickReplies';
import { setConversationHandler, sendTextMessage, sendMedia } from '../../services/n8n';
import { deleteConversations } from '../../services/conversations';
import ContactPanel from './ContactPanel';
import { OngkirCalculator } from '../ongkir/Ongkir';
import type { OngkirRate, OngkirDestination } from '../../services/ongkir';
import '../ongkir/Ongkir.css';
import { renderWaText } from '../../lib/waText';
import { markSelfHandlerChange } from '../../lib/selfActions';

const getConfidenceColor = (percent: number) => {
  if (percent >= 85) return '#3B82F6';
  if (percent >= 75) return '#EAB308';
  return '#EF4444';
};

const fmtTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// Ubah link Google Drive jadi URL lh3.googleusercontent (Google CDN) yang bisa di-embed
// sebagai <img> dari domain lain. URL non-Drive dibiarkan apa adanya.
const toEmbeddableUrl = (url: string | null, accountId?: string | null) => {
  if (!url) return url ?? '';
  // Jika url hanya berisi angka, berarti ini adalah Media ID asli dari Meta
  if (/^\d+$/.test(url)) {
    // Arahkan ke endpoint proxy server kita
    return `${import.meta.env.VITE_API_URL || ''}/api/media/${url}?accountId=${accountId || ''}`;
  }
  if (url.includes('lh3.googleusercontent.com')) return url; // sudah CDN
  if (url.includes('drive.google.com')) {
    const m = url.match(/(?:id=|\/d\/)([\w-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1000`;
  }
  return url;
};

// No longer used since we use FormData for uploads

const ProgressAvatar = ({ name, confidence }: { name: string; confidence: number }) => {
  const ringColor = getConfidenceColor(confidence);
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="48" height="48" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
        <circle
          cx="24" cy="24" r={radius}
          stroke={ringColor} strokeWidth="3" fill="none"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
        />
      </svg>
      <div className="chat-avatar" style={{ backgroundColor: 'var(--color-primary)', width: 36, height: 36, fontSize: '16px', zIndex: 1, margin: 0 }}>
        {initial}
      </div>
    </div>
  );
};

const CustomAudioPlayer = ({ src, isIncoming }: { src: string, isIncoming: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationStr, setDurationStr] = useState('0:00');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      setProgress(audio.currentTime / (audio.duration || 1) * 100);
      const ct = audio.currentTime;
      const m = Math.floor(ct / 60);
      const s = Math.floor(ct % 60).toString().padStart(2, '0');
      setDurationStr(`${m}:${s}`);
    };
    const onLoadedMetadata = () => {
      const d = audio.duration;
      if (d && !isNaN(d) && d !== Infinity) {
        const m = Math.floor(d / 60);
        const s = Math.floor(d % 60).toString().padStart(2, '0');
        setDurationStr(`${m}:${s}`);
      }
    };
    const onEnded = () => { 
      setIsPlaying(false); 
      setProgress(0); 
      onLoadedMetadata();
    };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = (Number(e.target.value) / 100) * (audio.duration || 1);
    audio.currentTime = newTime;
    setProgress(Number(e.target.value));
  };

  return (
    <div className={`vn-player ${isIncoming ? 'vn-in' : 'vn-out'}`}>
      <div className="vn-avatar-wrapper">
        <div className="vn-avatar"><MdMic size={20} color="#fff" /></div>
      </div>
      <button className="vn-play-btn" onClick={togglePlay}>
        {isPlaying ? <MdPause size={28} /> : <MdPlayArrow size={28} />}
      </button>
      <div className="vn-slider-wrapper">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress} 
          onChange={handleSeek} 
          className="vn-slider" 
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
        />
      </div>
      <div className="vn-duration">{durationStr || '0:00'}</div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
};

interface InboxProps {
  account?: Account;
  isMultiView?: boolean;
  colWidth?: string;
  onMobileChatOpenChange?: (open: boolean) => void;
  initialConversationId?: string;
  onNavigate?: (view: string) => void;
}

type TabKey = 'all' | 'ai' | 'human' | 'lead' | 'waiting_payment' | 'closing' | 'complaint';
type FilterKey = 'all' | 'confidence_high' | 'confidence_med' | 'confidence_low';

/** Pesan optimistik (sedang dikirim dari dashboard) sebelum tersimpan di DB. */
type PendingMsg = {
  id: string;
  conversationId: string;
  body: string;
  status: 'sending' | 'sent' | 'failed';
  createdAt: string;
};

const Inbox = ({ account, isMultiView = false, colWidth, onMobileChatOpenChange, initialConversationId, onNavigate }: InboxProps) => {
  const qc = useQueryClient();
  const accountId = account?.id;

  const { data: conversations = [], isLoading: convLoading, isError: convError, refetch: refetchConv } =
    useConversations(accountId);
  const { data: contacts = [] } = useContacts(accountId || '');

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(!!initialConversationId);
  const [listWidth, setListWidth] = useState(isMultiView ? 240 : 320);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId ?? null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<FilterKey>('all');
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<React.ReactNode | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [pending, setPending] = useState<PendingMsg[]>([]);

  // State untuk Quick Replies Autocomplete
  const { data: allQuickReplies = [] } = useQuickReplies();
  const [showQrDropdown, setShowQrDropdown] = useState(false);
  const [qrQuery, setQrQuery] = useState('');
  const [qrSelectedIndex, setQrSelectedIndex] = useState(0);

  const filteredQuickReplies = useMemo(() => {
    return allQuickReplies.filter(qr => (qr.shortcut || '').toLowerCase().includes(qrQuery.toLowerCase()));
  }, [allQuickReplies, qrQuery]);

  // State untuk mode hapus massal (Bulk Delete)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);

  // State untuk Image Preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileCaption, setFileCaption] = useState('');

  // State untuk Modal Ongkir
  const [isOngkirModalOpen, setIsOngkirModalOpen] = useState(false);

  // State untuk tombol scroll-to-bottom
  const [showScrollButton, setShowScrollButton] = useState(false);

  // State untuk Voice Note
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const isRecordingCancelledRef = useRef<boolean>(false);

  // State untuk Reply Pesan
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  const handleSelectRate = (rate: OngkirRate, origin: OngkirDestination, dest: OngkirDestination) => {
    const originName = origin.label.split(',')[0].trim();
    const destName = dest.label.split(',')[0].trim();
    const etd = rate.etd.replace(/hari|day/gi, '').trim();
    const text = `Baik kak pengiriman ke kota ${destName} dari kota ${originName} harganya Rp ${rate.cost.toLocaleString('id-ID')} estimasi ${etd} hari`;
    setMessageText(prev => {
      // Hilangkan /ongkir jika ada di akhir
      const cleaned = prev.replace(/(?:^|\s)\/ongkir$/i, '');
      return cleaned + (cleaned.trim() ? ' ' : '') + text;
    });
    setIsOngkirModalOpen(false);
    setTimeout(() => {
      fileInputRef.current?.focus();
    }, 100);
  };

  const listRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tempIdRef = useRef(0);
  const resizerRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (dir: number) => tabsRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });

  const resolvedConversationId =
    activeConversationId && conversations.some(c => c.id === activeConversationId)
      ? activeConversationId
      : (conversations[0]?.id ?? null);
  const activeConversation = resolvedConversationId
    ? conversations.find(c => c.id === resolvedConversationId) ?? null
    : null;
  const { data: messages = [], isLoading: msgLoading } = useMessages(resolvedConversationId ?? undefined);
  const { data: orders = [] } = useOrders(resolvedConversationId ?? undefined);
  const latestOrder = orders[0] ?? null;

  // Pesan optimistik untuk conversation aktif; sembunyikan yang sudah tersimpan di DB (dedup by body).
  const outBodies = new Set(messages.filter(m => m.direction === 'out').map(m => m.body));
  const visiblePending = pending.filter(
    p => p.conversationId === resolvedConversationId && (p.status === 'failed' || !outBodies.has(p.body))
  );

  // Auto-scroll ke pesan terbaru saat ada pesan baru / ganti percakapan / kirim.
  useEffect(() => {
    const el = timelineRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      setShowScrollButton(false);
    }
  }, [messages.length, resolvedConversationId, pending, isMobileChatOpen]);

  // Handle otomatis reset unread jika chat sedang aktif terbuka
  useEffect(() => {
    if (activeConversationId && activeConversation?.unread && activeConversation.unread > 0) {
      // Chat sedang dibuka, tapi ada pesan masuk yang membuat unread > 0
      qc.setQueryData<Conversation[]>(conversationsKey(accountId), old => 
        old?.map(c => c.id === activeConversationId ? { ...c, unread: 0 } : c) ?? old
      );
      api.put(`/resource/conversations/${activeConversationId}`, { unread: 0 }).catch(() => {});
    }
  }, [activeConversationId, activeConversation?.unread, accountId, qc]);

  // Handle tombol back di Android untuk menutup chat mobile
  useEffect(() => {
    const handlePopState = () => {
      if (isMobileChatOpen) {
        setIsMobileChatOpen(false);
        onMobileChatOpenChange?.(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobileChatOpen, onMobileChatOpenChange]);

  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // Tampilkan tombol jika user scroll ke atas lebih dari 100px dari dasar
    const isScrolledUp = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
    setShowScrollButton(isScrolledUp);
  };

  const showToast = (msg: React.ReactNode) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Klik di luar emoji picker untuk menutup.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current && !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setIsEmojiOpen(false);
      }
    };
    if (isEmojiOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isEmojiOpen]);

  // Shortcut Ctrl/Cmd + / untuk emoji picker.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsEmojiOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Cleanup rekaman jika komponen unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isRecordingCancelledRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        // Cek kalau sengaja dibatalkan, jangan set file
        if (!isRecordingCancelledRef.current && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
          const audioFile = new File([audioBlob], `VoiceNote_${Date.now()}.ogg`, { type: 'audio/ogg; codecs=opus' });
          
          // Langsung kirim tanpa lewat preview
          confirmSendMedia(audioFile);
        }
        
        setIsRecording(false);
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      showToast('Gagal mengakses mikrofon. Pastikan izin diberikan.');
      console.error(err);
    }
  };

  const cancelRecording = () => {
    isRecordingCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Resizer lebar kolom list.
  useEffect(() => {
    let dragging = false;
    const onDown = (e: MouseEvent) => {
      const resizer = resizerRef.current;
      if (resizer && resizer.contains(e.target as Node)) {
        dragging = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      }
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging || !listRef.current) return;
      const rect = listRef.current.getBoundingClientRect();
      const w = e.clientX - rect.left;
      if (w >= 280 && w <= 600) setListWidth(w);
    };
    const onUp = () => {
      if (dragging) {
        dragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Ambil alih / kembalikan handler (optimistic + rollback via cache React Query).
  const handleToggleHandler = async () => {
    if (!activeConversation || !account || !accountId) return;
    const switchingToHuman = activeConversation.handler === 'ai';
    const newHandler = switchingToHuman ? 'human' : 'ai';
    const key = conversationsKey(accountId);
    const prev = qc.getQueryData<Conversation[]>(key);
    markSelfHandlerChange(activeConversation.id); // cegah notif "butuh manusia" palsu
    qc.setQueryData<Conversation[]>(key, old =>
      old?.map(c => (c.id === activeConversation.id ? { ...c, handler: newHandler } : c)) ?? old
    );
    try {
      await setConversationHandler(account, {
        conversationId: activeConversation.id,
        phone: activeConversation.customerPhone,
        chatId: activeConversation.chatId,
        handler: newHandler,
      });
      showToast(switchingToHuman ? 'Diambil alih: Mode Manusia aktif' : 'Dikembalikan ke AI: Mode AI aktif');
    } catch (err) {
      qc.setQueryData(key, prev); // rollback
      showToast(err instanceof Error ? err.message : 'Gagal menghubungi N8N, status dikembalikan.');
    }
  };

  // Kirim balasan teks via webhook N8N (optimistik + status kirim).
  const handleSendText = async () => {
    const text = messageText.trim();
    if (!text || !activeConversation || !account) return;
    const tempId = `tmp-${tempIdRef.current++}`;
    const convId = activeConversation.id;
    setPending(prev => [...prev, { id: tempId, conversationId: convId, body: text, status: 'sending', createdAt: new Date().toISOString() }]);
    setMessageText('');
    const replyId = replyToMessage?.externalId || null;
    setReplyToMessage(null); // Reset setelah diklik kirim

    try {
      await sendTextMessage(account, {
        conversationId: activeConversation.id,
        phone: activeConversation.customerPhone,
        chatId: activeConversation.chatId,
        text,
        replyToMessageId: replyId,
      });
      setPending(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'sent' } : m)));
    } catch (err) {
      setPending(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m)));
      showToast(err instanceof Error ? err.message : 'Gagal mengirim pesan.');
    }
  };

  // Kirim ulang pesan yang gagal (klik bubble merah).
  const retryPending = async (p: PendingMsg) => {
    if (!account) return;
    const conv = conversations.find(c => c.id === p.conversationId);
    if (!conv) return;
    setPending(prev => prev.map(m => (m.id === p.id ? { ...m, status: 'sending' } : m)));
    try {
      await sendTextMessage(account, {
        conversationId: conv.id,
        phone: conv.customerPhone,
        chatId: conv.chatId,
        text: p.body,
      });
      setPending(prev => prev.map(m => (m.id === p.id ? { ...m, status: 'sent' } : m)));
    } catch {
      setPending(prev => prev.map(m => (m.id === p.id ? { ...m, status: 'failed' } : m)));
    }
  };

  // Kirim media (gambar/PDF): baca base64 lalu kirim ke webhook N8N (tanpa storage di frontend).
  const handlePickFile = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset agar file sama bisa dipilih lagi
    if (!file || !activeConversation || !account) return;
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/'];
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowed) {
      showToast('Tipe file tidak didukung. (Bisa gambar, video, audio, atau dokumen)');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showToast('Ukuran berkas maksimal 50MB.');
      return;
    }
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFileCaption(messageText); // Bawa teks yang sudah diketik sbg caption awal
  };

  const cancelPreview = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileCaption('');
  };

  const confirmSendMedia = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file || !activeConversation || !account) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload ke VPS / Backend URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const uploadRes = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Gagal mengunggah file ke server lokal (VPS).');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.url) {
        throw new Error('Server lokal tidak mengembalikan URL file.');
      }

      let mediaType = 'document';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';

      // Kirim URL ke N8N
      const replyId = replyToMessage?.externalId || null;
      await sendMedia(account, {
        conversationId: activeConversation.id,
        phone: activeConversation.customerPhone,
        chatId: activeConversation.chatId,
        mediaType: mediaType as 'image' | 'video' | 'audio' | 'document',
        filename: file.name,
        caption: (fileToUpload ? undefined : fileCaption.trim()) || undefined,
        mediaUrl: uploadData.url,
        replyToMessageId: replyId,
      });

      setMessageText('');
      setReplyToMessage(null);
      cancelPreview();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengirim media.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedChats([]);
  };

  const handleToggleSelectChat = (e: React.MouseEvent | React.ChangeEvent, id: string) => {
    e.stopPropagation();
    setSelectedChats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedChats.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedChats.length} percakapan? Ini akan menghapus semua pesan di dalamnya secara permanen.`)) return;
    
    try {
      await deleteConversations(selectedChats);
      qc.invalidateQueries({ queryKey: conversationsKey(accountId) });
      setIsSelectionMode(false);
      setSelectedChats([]);
      if (activeConversationId && selectedChats.includes(activeConversationId)) {
        setActiveConversationId(null);
      }
      showToast('Berhasil menghapus chat terpilih.');
    } catch {
      showToast('Gagal menghapus chat.');
    }
  };

  const filtered = conversations.filter(c => {
    // Pencarian teks (nama / nomor / cuplikan)
    const q = searchText.trim().toLowerCase();
    if (q) {
      const hay = `${c.customerName} ${c.customerPhone} ${c.lastPreview}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterCriteria === 'confidence_high' && c.confidence < 85) return false;
    if (filterCriteria === 'confidence_med' && (c.confidence < 75 || c.confidence >= 85)) return false;
    if (filterCriteria === 'confidence_low' && c.confidence >= 75) return false;
    if (activeTab === 'ai') return c.handler === 'ai';
    if (activeTab === 'human') return c.handler === 'human';
    if (activeTab === 'lead') return c.orderStatus === 'lead';
    if (activeTab === 'waiting_payment') return c.orderStatus === 'waiting_payment';
    if (activeTab === 'closing') return c.orderStatus === 'closing';
    if (activeTab === 'complaint') return c.orderStatus === 'complaint';
    return true;
  });

  const filteredContacts = searchText.trim() ? contacts.filter(c => 
    c.name.toLowerCase().includes(searchText.trim().toLowerCase()) || 
    c.phone.includes(searchText.trim())
  ) : [];

  const handleStartContactChat = async (contact: any) => {
    if (!accountId) return;
    try {
      const res = await api.post<{id: string}>('/conversations/start', {
        accountId: accountId,
        phone: contact.phone,
        name: contact.name
      });
      setActiveConversationId(res.data.id);
      setSearchText('');
    } catch (err) {
      console.error(err);
      showToast('Gagal memulai chat dengan kontak.');
    }
  };

  const containerStyle: React.CSSProperties = colWidth
    ? ({ width: colWidth, minWidth: colWidth, maxWidth: colWidth, flexShrink: 0, flexGrow: 0, '--list-width': `${listWidth}px` } as React.CSSProperties)
    : ({ '--list-width': `${listWidth}px` } as React.CSSProperties);

  return (
    <div className={`inbox-container ${isMultiView ? 'compact-mode' : ''} ${isMultiView && isMobileChatOpen ? 'is-active-chat' : ''}`} style={containerStyle}>
      {/* Column 1: Conversation List */}
      <div ref={listRef} className={`conversation-list ${isMobileChatOpen ? 'mobile-hidden' : ''}`}>
        <div className="list-header" style={{ paddingBottom: '8px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 600 }}>
              {account ? account.name : 'SkyBox'}
            </h2>
          </div>
          <button
            className={`icon-btn ${(isSelectionMode || filterCriteria !== 'all') ? 'active-filter' : 'text-secondary'}`}
            onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
          >
            <MdMoreVert size={24} />
          </button>
          
          {isHeaderMenuOpen && (
            <div className="header-dropdown" style={{
              position: 'absolute',
              top: '100%',
              right: '16px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100,
              minWidth: '200px',
              padding: '8px 0'
            }}>
              <div 
                className="filter-item" 
                onClick={() => { handleToggleSelectionMode(); setIsHeaderMenuOpen(false); }}
              >
                <MdCheck size={20} />
                <span>{isSelectionMode ? "Batal Pilih Obrolan" : "Pilih Obrolan"}</span>
              </div>
              
              <div style={{ padding: '8px 16px 4px', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                Filter Confidence
              </div>
              <div className={`filter-item ${filterCriteria === 'all' ? 'active' : ''}`} onClick={() => { setFilterCriteria('all'); setIsHeaderMenuOpen(false); }}>
                Semua Obrolan
              </div>
              <div className={`filter-item ${filterCriteria === 'confidence_high' ? 'active' : ''}`} onClick={() => { setFilterCriteria('confidence_high'); setIsHeaderMenuOpen(false); }}>
                <div className="status-indicator" style={{ backgroundColor: '#3B82F6' }}></div>
                Yakin
              </div>
              <div className={`filter-item ${filterCriteria === 'confidence_med' ? 'active' : ''}`} onClick={() => { setFilterCriteria('confidence_med'); setIsHeaderMenuOpen(false); }}>
                <div className="status-indicator" style={{ backgroundColor: '#EAB308' }}></div>
                Cukup Yakin
              </div>
              <div className={`filter-item ${filterCriteria === 'confidence_low' ? 'active' : ''}`} onClick={() => { setFilterCriteria('confidence_low'); setIsHeaderMenuOpen(false); }}>
                <div className="status-indicator" style={{ backgroundColor: '#EF4444' }}></div>
                Butuh Bantuan
              </div>
            </div>
          )}
        </div>

        <div className="search-bar" style={{ position: 'relative' }}>
          <div className="search-input-container">
            <MdSearch size={20} className="search-icon" />
            <input type="text" placeholder="Search chats or contacts..." className="search-input" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
        </div>

        <div className="inbox-tabs-container">
          <button className="tab-scroll" onClick={() => scrollTabs(-1)} title="Geser kiri"><MdChevronLeft size={18} /></button>
          <div
            className="inbox-tabs"
            ref={tabsRef}
            onWheel={(e) => { if (tabsRef.current) tabsRef.current.scrollLeft += e.deltaY; }}
          >
            <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All</button>
            <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>AI Handled</button>
            <button className={`tab-btn ${activeTab === 'human' ? 'active' : ''}`} onClick={() => setActiveTab('human')}>Human</button>
            <button className={`tab-btn ${activeTab === 'lead' ? 'active' : ''}`} onClick={() => setActiveTab('lead')}>Leads</button>
            <button className={`tab-btn ${activeTab === 'waiting_payment' ? 'active' : ''}`} onClick={() => setActiveTab('waiting_payment')}>Waiting Payment</button>
            <button className={`tab-btn ${activeTab === 'closing' ? 'active' : ''}`} onClick={() => setActiveTab('closing')}>Closing</button>
            <button className={`tab-btn ${activeTab === 'complaint' ? 'active' : ''}`} onClick={() => setActiveTab('complaint')}>Complaint</button>
          </div>
          <button className="tab-scroll" onClick={() => scrollTabs(1)} title="Geser kanan"><MdChevronRight size={18} /></button>
        </div>

        <div className="list-items">
          {convLoading ? (
            <div style={{ padding: 16, color: 'var(--color-text-secondary)', fontSize: 13 }}>Memuat percakapan…</div>
          ) : convError ? (
            <div style={{ padding: 16, color: 'var(--color-text-secondary)', fontSize: 13 }}>
              Gagal memuat. <button onClick={() => refetchConv()}>Coba lagi</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--color-text-secondary)', fontSize: 13 }}>Belum ada percakapan.</div>
          ) : (
            filtered.map(conv => {
              const isSelected = selectedChats.includes(conv.id);
              return (
                <div
                  key={conv.id}
                  className={`chat-item ${activeConversation?.id === conv.id ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    if (isSelectionMode) {
                      handleToggleSelectChat(e, conv.id);
                    } else {
                      setActiveConversationId(conv.id);
                      setIsMobileChatOpen(true);
                      onMobileChatOpenChange?.(true);
                      if (window.innerWidth <= 768) {
                        window.history.pushState({ chatOpen: true }, '');
                      }
                      
                      // Reset unread optimistically and in DB
                      if (conv.unread > 0) {
                        qc.setQueryData<Conversation[]>(conversationsKey(accountId), old => 
                          old?.map(c => c.id === conv.id ? { ...c, unread: 0 } : c) ?? old
                        );
                        api.put(`/resource/conversations/${conv.id}`, { unread: 0 }).catch(() => {});
                      }
                    }
                  }}
                >
                  {isSelectionMode && (
                    <div className="chat-checkbox">
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleToggleSelectChat(e, conv.id)} 
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <ProgressAvatar name={conv.customerName || conv.customerPhone} confidence={conv.confidence} />
                  <div className="chat-info">
                    <div className="chat-name-time">
                      <span className="chat-name">{conv.customerName || conv.customerPhone}</span>
                      <span className="chat-time">{fmtTime(conv.lastTime)}</span>
                    </div>
                    <div className="chat-preview">
                      <span className={`preview-text ${conv.unread === 0 ? 'text-secondary' : ''}`}>{conv.lastPreview}</span>
                      {conv.unread > 0 && <div className="unread-badge">{conv.unread}</div>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {filteredContacts.length > 0 && (
            <div style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', background: 'var(--color-bg-primary)' }}>
              Kontak Tersimpan ({filteredContacts.length})
            </div>
          )}
          {filteredContacts.map(c => (
            <div 
              key={`contact-${c.id}`}
              className="conversation-item"
              onClick={() => handleStartContactChat(c)}
            >
              <div className="chat-avatar" style={{ backgroundColor: 'var(--color-primary)' }}>
                {(c.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="chat-info">
                <div className="chat-name-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="chat-name" style={{ fontWeight: 600 }}>{c.name}</span>
                </div>
                <div className="chat-preview-row">
                  <span className="chat-preview" style={{ color: 'var(--color-primary)', fontSize: '13px' }}>Klik untuk mulai chat</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!isSelectionMode && onNavigate && (
          <button 
            className={`new-chat-fab ${isMobileChatOpen ? 'mobile-hidden' : ''}`}
            onClick={() => onNavigate('contacts')}
            title="Tambah Chat Baru"
          >
            <MdChat size={24} />
          </button>
        )}

        {isSelectionMode && (
          <div className="bulk-action-bar">
            <span>{selectedChats.length} Dipilih</span>
            <button 
              className="bulk-delete-btn" 
              onClick={handleBulkDelete}
              disabled={selectedChats.length === 0}
            >
              Hapus
            </button>
          </div>
        )}
      </div>

      <div ref={resizerRef} className="inbox-resizer hide-on-mobile"></div>

      {/* Column 2: Chat Area */}
      <div className={`chat-area ${!isMobileChatOpen ? 'mobile-hidden' : ''}`}>
        <div className="chat-header">
          <div
            className="chat-header-info"
            onClick={() => { if (activeConversation) setIsContactOpen(true); }}
            style={{ cursor: activeConversation ? 'pointer' : 'default' }}
            title={activeConversation ? 'Lihat info kontak' : undefined}
          >
            <button className="icon-btn mobile-only-btn" onClick={(e) => { 
              e.stopPropagation(); 
              setIsMobileChatOpen(false); 
              onMobileChatOpenChange?.(false); 
              if (window.history.state?.chatOpen) {
                window.history.back();
              }
            }}>
              <MdArrowBack size={24} />
            </button>
            <div className="chat-avatar" style={{ backgroundColor: 'var(--color-primary)' }}>
              {(activeConversation?.customerName || activeConversation?.customerPhone || 'S').charAt(0)}
            </div>
            <div>
              <h3>{activeConversation ? (activeConversation.customerName || activeConversation.customerPhone) : 'Pilih percakapan'}</h3>
              <span className="chat-status text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontSize: '12px' }}>
                {isMultiView && account ? (
                  <>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: account.color }}></div>
                    <span style={{ color: account.color, fontWeight: 500 }}>via {account.name}</span>
                  </>
                ) : null}
              </span>
            </div>
          </div>
          <div className="chat-header-actions">
            <div
              className={`handler-switch ${activeConversation?.handler === 'human' ? 'is-human' : 'is-ai'}`}
              onClick={handleToggleHandler}
              title={activeConversation?.handler === 'human' ? 'Klik untuk kembalikan ke AI' : 'Klik untuk ambil alih (Mode Manusia)'}
              role="switch"
              aria-checked={activeConversation?.handler === 'human'}
            >
              <div className="handler-switch-thumb"></div>
              <span className="handler-switch-option opt-ai">AI</span>
              <span className="handler-switch-option opt-human">Human</span>
            </div>
          </div>
        </div>

        <div className="chat-timeline" ref={timelineRef} onScroll={handleTimelineScroll}>
          {latestOrder && (
            <div style={{
              alignSelf: 'center',
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 999,
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              marginBottom: 8,
            }}>
              {latestOrder.type === 'tf'
                ? `💳 Transfer • ${latestOrder.amount ? `Rp ${Number(latestOrder.amount).toLocaleString('id-ID')} • ` : ''}${latestOrder.status}`
                : `📦 COD • ${latestOrder.address ? `${latestOrder.address} • ` : ''}${latestOrder.status}`}
            </div>
          )}
          {!activeConversation ? (
            <div style={{ margin: 'auto', color: 'var(--color-text-secondary)', fontSize: 13 }}>Pilih percakapan untuk melihat pesan.</div>
          ) : msgLoading && messages.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--color-text-secondary)', fontSize: 13 }}>Memuat pesan…</div>
          ) : messages.length === 0 && visiblePending.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--color-text-secondary)', fontSize: 13 }}>Belum ada pesan.</div>
          ) : (
            <>
              {messages.map(m => {
                const quotedMsg = m.replyToMessageId ? messages.find(orig => orig.externalId === m.replyToMessageId) : null;
                const hasCaption = m.body && !/^\[(?:Received )?(?:image|video|audio|document|sticker)\]$/i.test(m.body.trim());
                return (
                  <div key={m.id} id={`msg-${m.id}`} className={`bubble-wrapper ${m.direction === 'out' ? 'sent' : 'received'}`}>
                    <div className={`bubble ${(m.type === 'image' || m.type === 'video') && m.mediaUrl ? 'has-media' : ''} ${!hasCaption ? 'no-caption' : ''}`}>
                      {quotedMsg && (
                        <div className="quoted-message" onClick={() => {
                          const el = document.getElementById(`msg-${quotedMsg.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.classList.remove('highlighted-msg');
                            // Trigger reflow
                            void el.offsetWidth;
                            el.classList.add('highlighted-msg');
                          }
                        }}>
                          <div className="quoted-sender">{quotedMsg.direction === 'in' ? activeConversation.customerName || activeConversation.customerPhone : 'Anda'}</div>
                          <div className="quoted-text">{quotedMsg.body || 'Media'}</div>
                        </div>
                      )}
                      {m.type === 'image' && m.mediaUrl && (
                        <img
                          src={toEmbeddableUrl(m.mediaUrl, activeConversation?.accountId)}
                          alt="media"
                          className="message-media"
                          onClick={() => window.open(toEmbeddableUrl(m.mediaUrl, activeConversation?.accountId), '_blank')}
                          style={{ cursor: 'pointer' }}
                        />
                      )}
                      {m.type === 'video' && m.mediaUrl && (
                        <video 
                          controls 
                          src={toEmbeddableUrl(m.mediaUrl, activeConversation?.accountId)} 
                          className="message-media"
                        />
                      )}
                      {m.type === 'audio' && m.mediaUrl && (
                        <CustomAudioPlayer 
                          src={toEmbeddableUrl(m.mediaUrl, activeConversation?.accountId)}
                          isIncoming={m.direction === 'in'}
                        />
                      )}
                      {m.type === 'document' && m.mediaUrl && (
                        <a href={toEmbeddableUrl(m.mediaUrl, activeConversation?.accountId)} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-dark)' }}>📄 Buka dokumen</a>
                      )}
                      {m.body && !/^\[(?:Received )?(?:image|video|audio|document|sticker)\]$/i.test(m.body.trim()) && (
                        <span className="bubble-text">{renderWaText(m.body)}</span>
                      )}
                      <span className="bubble-time">
                        {fmtTime(m.createdAt)}
                        {m.direction === 'out' && <MdDoneAll size={14} className="msg-ack sent" />}
                      </span>
                    </div>
                    {/* Tombol Reply */}
                    <button className="reply-bubble-btn" onClick={() => setReplyToMessage(m)} title="Balas Pesan">
                      <MdReply size={18} />
                    </button>
                  </div>
                );
              })}
              {visiblePending.map(p => (
                <div key={p.id} className="bubble-wrapper sent">
                  <div
                    className={`bubble ${p.status === 'failed' ? 'is-failed' : ''}`}
                    onClick={p.status === 'failed' ? () => retryPending(p) : undefined}
                    style={p.status === 'failed' ? { cursor: 'pointer' } : undefined}
                    title={p.status === 'failed' ? 'Klik untuk kirim ulang' : undefined}
                  >
                    {p.body && !/^\[(?:Received )?(?:image|video|audio|document|sticker)\]$/i.test(p.body.trim()) && (
                      <span className="bubble-text">{renderWaText(p.body)}</span>
                    )}
                    <span className="bubble-time">
                      {fmtTime(p.createdAt)}
                      {p.status === 'sending' && <MdCheck size={14} className="msg-ack sending" />}
                      {p.status === 'sent' && <MdDoneAll size={14} className="msg-ack sent" />}
                      {p.status === 'failed' && <MdErrorOutline size={13} className="msg-ack is-failed" />}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {showScrollButton && (
          <button 
            className="scroll-bottom-btn" 
            onClick={() => {
              const el = timelineRef.current;
              if (el) {
                el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
              }
            }}
            title="Ke pesan terbaru"
          >
            <MdKeyboardArrowDown size={24} />
          </button>
        )}

        <div className="chat-input-area" style={{ position: 'relative' }}>
          {isEmojiOpen && (
            <div className="emoji-picker-popup-container" ref={emojiPickerRef}>
              <EmojiPicker
                onEmojiClick={(emojiData) => setMessageText(prev => prev + emojiData.emoji)}
                theme={Theme.DARK}
                width="100%"
                height={350}
              />
            </div>
          )}

          {showQrDropdown && filteredQuickReplies.length > 0 && (
            <div className="qr-dropdown">
              {filteredQuickReplies.map((qr, i) => (
                <div 
                  key={qr.id} 
                  className={`qr-dropdown-item ${i === qrSelectedIndex ? 'selected' : ''}`}
                  onClick={() => {
                    const match = messageText.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
                    if (match) {
                      const prefix = messageText.substring(0, match.index! + (match[0].startsWith(' /') ? 1 : 0));
                      setMessageText(prefix + qr.content);
                      setShowQrDropdown(false);
                      fileInputRef.current?.focus(); // Balik fokus ke textarea (dummy focus biar rapi)
                    }
                  }}
                >
                  <div className="qr-icon-wrapper">
                    <MdFlashOn size={18} />
                  </div>
                  <div className="qr-dropdown-shortcut">/{qr.shortcut}</div>
                  <div className="qr-dropdown-content">{qr.content}</div>
                </div>
              ))}
            </div>
          )}

          <div className={`input-pill ${replyToMessage ? 'has-reply' : ''}`}>
            {replyToMessage && (
              <div className="reply-preview-container">
                <div className="reply-preview-content">
                  <div className="reply-sender">{replyToMessage.direction === 'in' ? activeConversation?.customerName || activeConversation?.customerPhone : 'Anda'}</div>
                  <div className="reply-text">{replyToMessage.body || 'Media'}</div>
                </div>
                <button className="reply-cancel-btn" onClick={() => setReplyToMessage(null)}><MdClose size={20} /></button>
              </div>
            )}
            <div className="input-row">
              <button ref={emojiButtonRef} className="icon-btn text-secondary" onClick={() => setIsEmojiOpen(!isEmojiOpen)}>
                <MdInsertEmoticon size={24} />
              </button>
            {isRecording ? (
              <div className="recording-ui">
                <div className="recording-indicator"></div>
                <span className="recording-time">{formatDuration(recordingDuration)}</span>
                <button className="icon-btn text-error" onClick={cancelRecording} title="Batal Rekam">
                  <MdDelete size={22} />
                </button>
              </div>
            ) : (
              <>
                <textarea
                  className="message-input"
                  rows={1}
                  placeholder="Ketik pesan..."
                  value={messageText}
                  onChange={e => {
                    const val = e.target.value;
                    setMessageText(val);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

                    // Cek trigger spesial untuk ongkir
                    if (val.match(/(?:^|\s)\/ongkir$/i)) {
                      setIsOngkirModalOpen(true);
                      setShowQrDropdown(false);
                      return;
                    }

                    // Check for Quick Reply trigger
                    const match = val.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
                    if (match) {
                      setShowQrDropdown(true);
                      setQrQuery(match[1].toLowerCase());
                      setQrSelectedIndex(0);
                    } else {
                      setShowQrDropdown(false);
                    }
                  }}
                  onKeyDown={e => {
                    if (showQrDropdown && filteredQuickReplies.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setQrSelectedIndex(i => (i + 1) % filteredQuickReplies.length);
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setQrSelectedIndex(i => (i - 1 + filteredQuickReplies.length) % filteredQuickReplies.length);
                        return;
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const selected = filteredQuickReplies[qrSelectedIndex];
                        const match = messageText.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
                        if (match) {
                          const prefix = messageText.substring(0, match.index! + (match[0].startsWith(' /') ? 1 : 0));
                          setMessageText(prefix + selected.content);
                          setShowQrDropdown(false);
                        }
                        return;
                      }
                    }

                    if (e.key !== 'Enter') return;
                    if (e.shiftKey) return; // Shift+Enter → newline (default textarea)
                    if (e.ctrlKey || e.metaKey) {
                      // Ctrl/Cmd+Enter → sisipkan baris baru di posisi kursor
                      e.preventDefault();
                      const ta = e.currentTarget;
                      const s = ta.selectionStart ?? messageText.length;
                      const en = ta.selectionEnd ?? messageText.length;
                      const next = messageText.slice(0, s) + '\n' + messageText.slice(en);
                      setMessageText(next);
                      requestAnimationFrame(() => {
                        ta.selectionStart = ta.selectionEnd = s + 1;
                        ta.style.height = 'auto';
                        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
                      });
                      return;
                    }
                    // Enter biasa → kirim
                    e.preventDefault();
                    handleSendText();
                  }}
                />
                <button className="icon-btn text-secondary" style={{ transform: 'rotate(45deg)' }} onClick={handlePickFile} disabled={isUploading} title="Kirim lampiran">
                  <MdAttachFile size={22} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  className="icon-btn text-secondary"
                  onClick={startRecording}
                  title="Mulai Rekam Voice Note"
                >
                  <MdMic size={24} />
                </button>
              </>
            )}
            </div>
          </div>
          {isRecording ? (
            <button className="btn-primary icon-only recording-send-btn" onClick={stopAndSendRecording} title="Kirim Voice Note">
              <MdSend size={22} />
            </button>
          ) : (
            <button className="btn-primary icon-only" onClick={handleSendText}><MdSend size={22} /></button>
          )}
        </div>

        {toastMessage && <div className="custom-toast">{toastMessage}</div>}

        {/* Modal Image Preview */}
        {previewUrl && (
          <div className="image-preview-modal-overlay">
            <div className="image-preview-modal">
              <div className="preview-header">
                <button className="preview-close-btn" onClick={cancelPreview}>✕</button>
                <h3>Kirim Media</h3>
              </div>
              <div className="preview-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {selectedFile?.type.startsWith('image/') && <img src={previewUrl} alt="Preview" />}
                {selectedFile?.type.startsWith('video/') && <video src={previewUrl} controls style={{ maxWidth: '100%', maxHeight: '400px' }} />}
                {selectedFile?.type.startsWith('audio/') && <audio src={previewUrl} controls style={{ width: '100%', marginTop: '20px' }} />}
                {!selectedFile?.type.startsWith('image/') && !selectedFile?.type.startsWith('video/') && !selectedFile?.type.startsWith('audio/') && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--color-surface-hover)', borderRadius: 8, width: '100%' }}>
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--color-text-light)" style={{ marginBottom: 16 }}>
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    <p style={{ margin: 0, fontWeight: 500 }}>{selectedFile?.name}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                      {(selectedFile?.size || 0) / 1024 / 1024 > 1 
                        ? `${((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB` 
                        : `${Math.round((selectedFile?.size || 0) / 1024)} KB`}
                    </p>
                  </div>
                )}
              </div>
              <div className="preview-footer">
                <input 
                  type="text" 
                  value={fileCaption} 
                  onChange={e => setFileCaption(e.target.value)} 
                  placeholder="Tambahkan keterangan..."
                  className="preview-caption-input"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !isUploading) {
                      e.preventDefault();
                      confirmSendMedia();
                    }
                  }}
                  autoFocus
                />
                <button 
                  className="preview-send-btn" 
                  onClick={() => confirmSendMedia()} 
                  disabled={isUploading}
                >
                  {isUploading ? 'Mengirim...' : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isOngkirModalOpen && (
        <div className="inbox-modal-overlay">
          <div className="inbox-modal">
            <div className="inbox-modal-header">
              <h3>Cek Ongkir (Klik Hasil)</h3>
              <button className="inbox-modal-close-btn" onClick={() => {
                setIsOngkirModalOpen(false);
                setMessageText(prev => prev.replace(/(?:^|\s)\/ongkir$/i, ''));
                setTimeout(() => fileInputRef.current?.focus(), 100);
              }}>✕</button>
            </div>
            <div className="inbox-modal-body">
              <OngkirCalculator onSelectRate={handleSelectRate} />
            </div>
          </div>
        </div>
      )}

      {isContactOpen && activeConversation && account && (
        <ContactPanel
          account={account}
          conversation={activeConversation}
          latestOrder={latestOrder}
          onClose={() => setIsContactOpen(false)}
        />
      )}
    </div>
  );
};

export default Inbox;
