import React, { useState, useEffect, useRef, useMemo } from 'react';
import './Inbox.css';
import { 
  MdSearch, MdCheck, MdClose, MdAttachFile,
  MdArrowBack, MdSend, MdInsertEmoticon, MdFlashOn, MdReply,
  MdMic, MdDelete, MdDoneAll, MdErrorOutline,
  MdMoreVert, MdKeyboardArrowDown, MdPlayArrow, MdPause, MdChat,
  MdChevronLeft, MdChevronRight, MdAutoAwesome
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
import { useContactMutations } from '../../hooks/useContacts';
import { setConversationHandler, sendTextMessage, sendMedia, sendTemplateMessage } from '../../services/n8n';
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

const ProgressAvatar = ({ name, confidence, handler }: { name: string; confidence: number; handler?: string }) => {
  const ringColor = getConfidenceColor(confidence);
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;
  const initial = (name || '?').charAt(0).toUpperCase();
  const avatarBg = handler === 'ai' ? 'var(--color-primary)' : '#EAB308';

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
      <div className="chat-avatar" style={{ backgroundColor: avatarBg, width: 36, height: 36, fontSize: '16px', zIndex: 1, margin: 0 }}>
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
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mediaUrl?: string;
};

const Inbox = ({ account, isMultiView = false, colWidth, onMobileChatOpenChange, initialConversationId, onNavigate }: InboxProps) => {
  const qc = useQueryClient();
  const accountId = account?.id;

  const { data: conversations = [], isLoading: convLoading, isError: convError, refetch: refetchConv } =
    useConversations(accountId);
  const { data: contacts = [] } = useContacts(accountId || '');
  const { add: addContact } = useContactMutations(accountId || '');

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(!!initialConversationId);
  const [listWidth, setListWidth] = useState(isMultiView ? 240 : 320);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId ?? null);
  const [addContactPhone, setAddContactPhone] = useState<string | null>(null);
  
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
  
  // State untuk Modal Template Meta
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateLang, setTemplateLang] = useState('id');
  const [templateVariables, setTemplateVariables] = useState('');
  const [templateVarsArray, setTemplateVarsArray] = useState<string[]>([]);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const [savedMetaTemplates, setSavedMetaTemplates] = useState<{name: string, lang: string, components?: any[]}[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('savedMetaTemplates') || '[]');
    } catch(e) {
      return [];
    }
  });

  const handleSaveMetaTemplate = () => {
    if (!templateName.trim()) return;
    const newTemplate = { name: templateName.trim(), lang: templateLang.trim() || 'id' };
    const updated = [...savedMetaTemplates.filter(t => t.name !== newTemplate.name), newTemplate];
    setSavedMetaTemplates(updated);
    localStorage.setItem('savedMetaTemplates', JSON.stringify(updated));
  };

  const handleDeleteMetaTemplate = (name: string) => {
    const updated = savedMetaTemplates.filter(t => t.name !== name);
    setSavedMetaTemplates(updated);
    localStorage.setItem('savedMetaTemplates', JSON.stringify(updated));
  };

  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);

  const handleSyncTemplates = async (silent = false) => {
    if (!accountId) return;
    try {
      setIsSyncingTemplates(true);
      const res = await api.get(`/meta/templates/${accountId}`);
      if (res.data && Array.isArray(res.data)) {
        const templates = res.data.map((t: any) => ({
          name: t.name,
          lang: t.language,
          components: t.components
        }));
        setSavedMetaTemplates(templates);
        localStorage.setItem('savedMetaTemplates', JSON.stringify(templates));
        if (silent !== true) {
          const { useUiStore } = await import('../../lib/uiStore');
          useUiStore.getState().notify('Berhasil sinkronisasi template', 'success');
        }
      }
    } catch (err: any) {
      console.error(err);
      if (silent !== true) {
        const { useUiStore } = await import('../../lib/uiStore');
        useUiStore.getState().notify(err.response?.data?.error || 'Gagal sinkronisasi template', 'error');
      }
    } finally {
      setIsSyncingTemplates(false);
    }
  };

  useEffect(() => {
    // Auto-sync secara background jika cache template kosong (misal login di HP/device baru)
    if (accountId && savedMetaTemplates.length === 0) {
      handleSyncTemplates(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const isRecordingCancelledRef = useRef<boolean>(false);

  // State untuk Reply Pesan
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  const renderMessageBody = (body: string) => {
    if (!body) return null;
    const match = body.match(/^\[Template:\s*([^|\]]+)(?:\|(.*))?\]$/i);
    if (match) {
      const tName = match[1].trim();
      const rawVars = match[2];
      const vars = rawVars ? rawVars.split(',') : [];
      
      const template = savedMetaTemplates.find(t => t.name === tName);
      if (template) {
        if (template.components) {
          const bodyComp = template.components.find((c: any) => c.type === 'BODY' || c.type === 'body');
          if (bodyComp && bodyComp.text) {
            let finalText = bodyComp.text;
            vars.forEach((v: string, i: number) => {
              finalText = finalText.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), v);
            });
            
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>
                  [Template: {tName}]
                </span>
                <span>{renderWaText(finalText)}</span>
              </div>
            );
          }
        } else {
          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>
                [Template: {tName}]
              </span>
              <span style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                (Isi template belum tersedia. Klik "Sync dari Meta" di menu template untuk memuat)
              </span>
            </div>
          );
        }
      }
    }
    return renderWaText(body);
  };

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
    
  const isSavedContact = activeConversation ? contacts.some(c => c.phone === activeConversation.customerPhone) : true;

  const { data: messages = [], isLoading: msgLoading } = useMessages(resolvedConversationId ?? undefined);
  const { data: orders = [] } = useOrders(resolvedConversationId ?? undefined);
  const latestOrder = orders[0] ?? null;

  const is24HourWindowOpen = useMemo(() => {
    const lastUserMsg = [...messages].reverse().find(m => m.direction === 'in');
    if (!lastUserMsg) return false;
    const diffHours = (Date.now() - new Date(lastUserMsg.createdAt).getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }, [messages]);

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

  // Kirim Pesan Template Meta
  const handleSendTemplateMessage = async () => {
    const tName = templateName.trim();
    if (!tName || !activeConversation || !account) return;
    
    const tempId = `tmp-${tempIdRef.current++}`;
    const convId = activeConversation.id;
    const selectedTemplateForVars = savedMetaTemplates.find(t => t.name === tName);
    let numVariables = 0;
    let hasComponents = false;
    if (selectedTemplateForVars && selectedTemplateForVars.components) {
      hasComponents = true;
      const bodyComp = selectedTemplateForVars.components.find((c: any) => c.type === 'BODY' || c.type === 'body');
      if (bodyComp && bodyComp.text) {
        const matches = [...bodyComp.text.matchAll(/\{\{(\d+)\}\}/g)];
        matches.forEach(m => {
          const num = parseInt(m[1], 10);
          if (num > numVariables) numVariables = num;
        });
      }
    }

    let templateComponents: any[] | undefined = undefined;
    let varsBody = '';
    
    let finalVars: string[] = [];
    if (hasComponents && numVariables > 0) {
      finalVars = templateVarsArray.slice(0, numVariables).map(v => v || '');
    } else if (templateVariables.trim()) {
      finalVars = templateVariables.split(',').map(v => v.trim());
    }

    if (finalVars.length > 0) {
      const vars = finalVars.map(v => ({ type: 'text', text: v }));
      templateComponents = [
        {
          type: 'body',
          parameters: vars
        }
      ];
      varsBody = '|' + finalVars.join(',');
    }
    setTemplateVariables('');
    setTemplateVarsArray([]);
    
    setPending(prev => [...prev, { id: tempId, conversationId: convId, body: `[Template: ${tName}${varsBody}]`, status: 'sending', createdAt: new Date().toISOString(), type: 'template' as any }]);
    setShowTemplateModal(false);
    setTemplateName('');
    
    try {
      await sendTemplateMessage(account, {
        conversationId: convId,
        phone: activeConversation.customerPhone,
        chatId: activeConversation.chatId,
        templateName: tName,
        templateLang: templateLang,
        templateComponents: templateComponents
      });
      setPending(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'sent' } : m)));
    } catch (err) {
      setPending(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m)));
      showToast(err instanceof Error ? err.message : 'Gagal mengirim template.');
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

  const retryPending = async (p: PendingMsg) => {
    if (!account) return;
    const conv = conversations.find(c => c.id === p.conversationId);
    if (!conv) return;
    setPending(prev => prev.map(m => (m.id === p.id ? { ...m, status: 'sending' } : m)));
    try {
      if (p.mediaType && p.mediaUrl) {
        await sendMedia(account, {
          conversationId: conv.id,
          phone: conv.customerPhone,
          chatId: conv.chatId,
          mediaType: p.mediaType as any,
          filename: 'retry',
          caption: p.body && !/^\[(?:Received )?(?:image|video|audio|document|sticker)\]$/i.test(p.body.trim()) ? p.body : undefined,
          mediaUrl: p.mediaUrl,
        });
      } else {
        await sendTextMessage(account, {
          conversationId: conv.id,
          phone: conv.customerPhone,
          chatId: conv.chatId,
          text: p.body,
        });
      }
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

      const tempId = `tmp-${tempIdRef.current++}`;
      const convId = activeConversation.id;
      const finalCaption = (fileToUpload ? undefined : fileCaption.trim()) || '';
      
      setPending(prev => [...prev, { 
        id: tempId, 
        conversationId: convId, 
        body: finalCaption, 
        status: 'sending', 
        createdAt: new Date().toISOString(),
        mediaType: mediaType as any,
        mediaUrl: uploadData.url
      }]);

      setMessageText('');
      setReplyToMessage(null);
      cancelPreview();

      // Kirim URL ke N8N
      const replyId = replyToMessage?.externalId || null;
      try {
        await sendMedia(account, {
          conversationId: convId,
          phone: activeConversation.customerPhone,
          chatId: activeConversation.chatId,
          mediaType: mediaType as 'image' | 'video' | 'audio' | 'document',
          filename: file.name,
          caption: finalCaption || undefined,
          mediaUrl: uploadData.url,
          replyToMessageId: replyId,
        });
        setPending(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'sent' } : m)));
      } catch (err) {
        setPending(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m)));
        showToast(err instanceof Error ? err.message : 'Gagal mengirim media.');
      }
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
                  <ProgressAvatar name={conv.customerName || conv.customerPhone} confidence={conv.confidence} handler={conv.handler} />
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
              setIsContactOpen(false);
              onMobileChatOpenChange?.(false); 
              if (window.history.state?.chatOpen) {
                window.history.back();
              }
            }}>
              <MdArrowBack size={24} />
            </button>
            <div className="chat-avatar" style={{ backgroundColor: activeConversation?.handler === 'ai' ? 'var(--color-primary)' : '#EAB308' }}>
              {(activeConversation?.customerName || activeConversation?.customerPhone || 'S').charAt(0)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3>{activeConversation ? (activeConversation.customerName || activeConversation.customerPhone) : 'Pilih percakapan'}</h3>
                {/* Tambah Kontak dipindah ke ContactPanel */}
              </div>
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
          <div className="chat-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="icon-btn text-secondary"
              onClick={() => {
                setIsChatSearchOpen(!isChatSearchOpen);
                if (isChatSearchOpen) setChatSearchQuery('');
              }}
              title="Cari Pesan"
              style={{ borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isChatSearchOpen ? 'rgba(0,0,0,0.05)' : 'transparent' }}
            >
              <MdSearch size={20} />
            </button>
            <button
              className="icon-btn text-secondary"
              onClick={() => setShowTemplateModal(true)}
              title="Kirim Pesan Template Meta"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <MdAutoAwesome size={20} />
            </button>
            {account?.aiEnabled && (
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
            )}
          </div>
        </div>

        {isChatSearchOpen && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <MdSearch size={20} className="text-secondary" />
            <input 
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Cari pesan di percakapan ini..."
              style={{ flex: 1, border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '14px', color: 'var(--color-text-primary)' }}
              autoFocus
            />
            {chatSearchQuery && (
              <button className="icon-btn text-secondary" onClick={() => setChatSearchQuery('')} style={{ padding: 4 }}>
                <MdClose size={16} />
              </button>
            )}
          </div>
        )}

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
              {messages.filter(m => {
                if (!chatSearchQuery.trim()) return true;
                if (!m.body) return false;
                return m.body.toLowerCase().includes(chatSearchQuery.toLowerCase());
              }).map((m, index, arr) => {
                const quotedMsg = m.replyToMessageId ? messages.find(orig => orig.externalId === m.replyToMessageId) : null;
                const hasCaption = m.body && !/^\[(?:Received )?(?:image|video|audio|document|sticker)\]$/i.test(m.body.trim());
                
                const currentDate = new Date(m.createdAt).toDateString();
                const prevDate = index > 0 ? new Date(arr[index - 1].createdAt).toDateString() : null;
                const showDateSeparator = currentDate !== prevDate;
                
                const fmtDateSeparator = (isoString: string) => {
                  const d = new Date(isoString);
                  const today = new Date();
                  const yesterday = new Date();
                  yesterday.setDate(today.getDate() - 1);
                  if (d.toDateString() === today.toDateString()) return 'Hari ini';
                  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
                  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                };

                return (
                  <React.Fragment key={m.id}>
                    {showDateSeparator && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px' }}>
                        <span style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '4px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          {fmtDateSeparator(m.createdAt)}
                        </span>
                      </div>
                    )}
                    <div id={`msg-${m.id}`} className={`bubble-wrapper ${m.direction === 'out' ? 'sent' : 'received'}`}>
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
                        <span className="bubble-text">{renderMessageBody(m.body)}</span>
                      )}
                      <span className="bubble-time">
                        {fmtTime(m.createdAt)}
                        {m.direction === 'out' && (
                          <span style={{ marginLeft: '4px', display: 'inline-flex', alignItems: 'center' }}>
                            {m.status === 'read' && <MdDoneAll size={14} className="msg-ack read" style={{ color: '#3B82F6' }} />}
                            {m.status === 'delivered' && <MdDoneAll size={14} className="msg-ack delivered" />}
                            {(!m.status || m.status === 'sent') && <MdCheck size={14} className="msg-ack sent" />}
                            {m.status === 'failed' && <MdErrorOutline size={14} className="msg-ack failed" style={{ color: '#EF4444' }} title={m.errorMessage || 'Gagal terkirim'} />}
                          </span>
                        )}
                      </span>
                    </div>
                    {/* Tombol Reply */}
                    <button className="reply-bubble-btn" onClick={() => setReplyToMessage(m)} title="Balas Pesan">
                      <MdReply size={18} />
                    </button>
                  </div>
                  </React.Fragment>
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
                      <span className="bubble-text">{renderMessageBody(p.body)}</span>
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
          {!is24HourWindowOpen && activeConversation ? (
            <div style={{
              backgroundColor: 'var(--color-bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              textAlign: 'center',
              padding: '16px 32px'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                Sesi obrolan 24 jam telah berakhir. Anda hanya dapat membalas menggunakan Pesan Template sampai pelanggan membalas kembali.
              </span>
              <button
                className="btn-primary"
                onClick={() => setShowTemplateModal(true)}
                style={{ fontSize: '13px', padding: '8px 16px', height: 'auto', display: 'inline-flex' }}
              >
                Kirim Pesan Template Meta
              </button>
            </div>
          ) : (
            <>
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
            </>
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
          isSavedContact={isSavedContact}
          onAddContact={() => setAddContactPhone(activeConversation.customerPhone)}
        />
      )}

      {addContactPhone && (
        <div className="inbox-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setAddContactPhone(null); }}>
          <div className="inbox-modal" style={{ maxWidth: '400px' }}>
            <div className="inbox-modal-header">
              <h3>Simpan Kontak</h3>
              <button className="inbox-modal-close-btn" onClick={() => setAddContactPhone(null)}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="inbox-modal-body">
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Nomor: {addContactPhone}</p>
              <input 
                autoFocus
                type="text" 
                placeholder="Nama Kontak" 
                className="chat-input"
                style={{ width: '100%', marginBottom: '16px', border: '1px solid var(--color-border)', borderRadius: '6px', height: '40px', padding: '0 12px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value;
                    if (val.trim()) {
                      addContact.mutate({ name: val.trim(), phone: addContactPhone });
                      setAddContactPhone(null);
                    }
                  }
                }}
                id="new-contact-name-input"
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setAddContactPhone(null)}>Batal</button>
                <button className="btn-primary" onClick={() => {
                  const val = (document.getElementById('new-contact-name-input') as HTMLInputElement).value;
                  if (val.trim()) {
                    addContact.mutate({ name: val.trim(), phone: addContactPhone });
                    setAddContactPhone(null);
                  }
                }}>Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Template Meta */}
      {showTemplateModal && (
        <div className="inbox-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowTemplateModal(false); }}>
          <div className="inbox-modal" style={{ maxWidth: '420px' }}>
            <div className="inbox-modal-header">
              <h3>Kirim Pesan Template Meta</h3>
              <button className="inbox-modal-close-btn" onClick={() => setShowTemplateModal(false)}>
                <MdClose size={20} />
              </button>
            </div>
            
            <div className="inbox-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                Gunakan ini untuk mengirim pesan pertama ke pelanggan atau mengirim pesan yang sudah di-approve oleh Meta.
              </p>

              {savedMetaTemplates.length === 0 ? (
                 <button 
                   onClick={() => handleSyncTemplates()} 
                   disabled={isSyncingTemplates}
                   className="btn-secondary"
                   style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                 >
                   {isSyncingTemplates ? 'Mensinkronisasi...' : 'Tarik Template dari WhatsApp Meta'}
                 </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Cari & Pilih Template <span style={{color: 'var(--color-error)'}}>*</span></label>
                    <button 
                      onClick={() => handleSyncTemplates()} 
                      disabled={isSyncingTemplates}
                      style={{ fontSize: '12px', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isSyncingTemplates ? 'Memuat...' : '⟳ Sync Ulang'}
                    </button>
                  </div>
                  
                  <div 
                    className="chat-input"
                    style={{ 
                      width: '100%', border: '1px solid var(--color-border)', borderRadius: '8px', minHeight: '40px', padding: '0 12px',
                      display: 'flex', alignItems: 'center', cursor: 'pointer', justifyContent: 'space-between', backgroundColor: 'var(--color-bg-primary)'
                    }}
                    onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                  >
                    <span style={{ color: templateName ? 'inherit' : 'var(--color-text-secondary)' }}>
                      {templateName ? `${templateName} (${templateLang})` : 'Pilih template...'}
                    </span>
                    <MdKeyboardArrowDown size={20} className="text-secondary" />
                  </div>

                  {isTemplateDropdownOpen && (
                    <div style={{ 
                      marginTop: '4px',
                      backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', 
                      borderRadius: '8px', overflow: 'hidden'
                    }}>
                      <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>
                        <input 
                          type="text" 
                          value={templateSearchQuery}
                          onChange={(e) => setTemplateSearchQuery(e.target.value)}
                          placeholder="Ketik untuk mencari..."
                          className="chat-input"
                          style={{ width: '100%', height: '32px', borderRadius: '4px', border: '1px solid var(--color-border)', padding: '0 8px', fontSize: '13px' }}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '4px 0' }}>
                        {savedMetaTemplates.filter(t => t.name.toLowerCase().includes(templateSearchQuery.toLowerCase())).map(t => (
                          <div 
                            key={t.name}
                            onClick={() => { 
                              setTemplateName(t.name); 
                              setTemplateLang(t.lang); 
                              setIsTemplateDropdownOpen(false); 
                              setTemplateSearchQuery('');
                            }}
                            style={{ 
                              padding: '8px 12px', fontSize: '13px', cursor: 'pointer', 
                              backgroundColor: templateName === t.name ? 'var(--color-surface-hover)' : 'transparent',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = templateName === t.name ? 'var(--color-surface-hover)' : 'transparent'}
                          >
                            <span>{t.name} <span style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>({t.lang})</span></span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteMetaTemplate(t.name); }} 
                              style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '2px' }}
                              title="Hapus dari cache"
                            >
                              <MdClose size={14} />
                            </button>
                          </div>
                        ))}
                        {savedMetaTemplates.filter(t => t.name.toLowerCase().includes(templateSearchQuery.toLowerCase())).length === 0 && (
                          <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                            Template tidak ditemukan
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const selected = savedMetaTemplates.find(t => t.name === templateName);
                let numVars = 0;
                let hasComponents = false;
                let bodyTextPreview = '';
                if (selected && selected.components) {
                  hasComponents = true;
                  const bodyComp = selected.components.find((c: any) => c.type === 'BODY' || c.type === 'body');
                  if (bodyComp && bodyComp.text) {
                    bodyTextPreview = bodyComp.text;
                    const matches = [...bodyComp.text.matchAll(/\{\{(\d+)\}\}/g)];
                    matches.forEach(m => {
                      const num = parseInt(m[1], 10);
                      if (num > numVars) numVars = num;
                    });
                  }
                }

                if (hasComponents) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ 
                        fontSize: '13px', 
                        color: 'var(--color-text-secondary)', 
                        padding: '12px', 
                        backgroundColor: 'rgba(0,0,0,0.05)', 
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.5'
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', opacity: 0.7 }}>Preview Template:</div>
                        {bodyTextPreview}
                      </div>

                      {numVars > 0 ? (
                        Array.from({ length: numVars }).map((_, idx) => (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600 }}>Variabel {idx + 1}</label>
                            <input
                              type="text"
                              value={templateVarsArray[idx] || ''}
                              onChange={(e) => {
                                const newVars = [...templateVarsArray];
                                newVars[idx] = e.target.value;
                                setTemplateVarsArray(newVars);
                              }}
                              placeholder={`Isi untuk variabel {{${idx + 1}}}`}
                              className="chat-input"
                              style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: '8px', height: '40px', padding: '0 12px' }}
                            />
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                          Template ini tidak memerlukan variabel.
                        </div>
                      )}
                    </div>
                  );
                }

                // Jika belum di-sync atau tidak ada komponen, tidak usah tampilkan fallback textarea
                return null;
              })()}

            </div>

            <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <button 
                className="btn-secondary" 
                onClick={handleSaveMetaTemplate}
                disabled={!templateName.trim()}
                title="Simpan template ini"
                style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 10px', height: '36px' }}
              >
                <MdCheck size={16} /> Simpan
              </button>
              
              <button
                className="btn-secondary"
                onClick={() => setShowTemplateModal(false)}
                style={{ height: '36px', fontSize: '13px', padding: '6px 16px' }}
              >
                Batal
              </button>
              <button
                className="btn-primary"
                onClick={handleSendTemplateMessage}
                disabled={!templateName.trim()}
                style={{ height: '36px', fontSize: '13px', padding: '6px 16px' }}
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inbox;
