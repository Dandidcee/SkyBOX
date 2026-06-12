import React, { useState, useEffect, useRef } from 'react';
import './Inbox.css';
import {
  MdSearch,
  MdAttachFile,
  MdInsertEmoticon,
  MdMic,
  MdSend,
  MdArrowBack,
  MdFilterList,
} from 'react-icons/md';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Account, Conversation } from '../../types/db';
import { useConversations, conversationsKey } from '../../hooks/useConversations';
import { useMessages } from '../../hooks/useMessages';
import { useOrders } from '../../hooks/useOrders';
import { setConversationHandler, sendTextMessage, sendMedia } from '../../services/n8n';

const getConfidenceColor = (percent: number) => {
  if (percent >= 85) return '#3B82F6';
  if (percent >= 70) return '#EAB308';
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
const toEmbeddableUrl = (url: string | null) => {
  if (!url) return url ?? '';
  if (url.includes('lh3.googleusercontent.com')) return url; // sudah CDN
  if (url.includes('drive.google.com')) {
    const m = url.match(/(?:id=|\/d\/)([\w-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1000`;
  }
  return url;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Gagal membaca berkas'));
    reader.readAsDataURL(file);
  });

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

interface InboxProps {
  account?: Account;
  isMultiView?: boolean;
  colWidth?: string;
  onMobileChatOpenChange?: (open: boolean) => void;
}

type TabKey = 'all' | 'ai' | 'human' | 'lead' | 'waiting_payment' | 'closing';
type FilterKey = 'all' | 'confidence_high' | 'confidence_med' | 'confidence_low';

const Inbox = ({ account, isMultiView = false, colWidth, onMobileChatOpenChange }: InboxProps) => {
  const qc = useQueryClient();
  const accountId = account?.id;

  const { data: conversations = [], isLoading: convLoading, isError: convError, refetch: refetchConv } =
    useConversations(accountId);

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [listWidth, setListWidth] = useState(isMultiView ? 240 : 320);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<FilterKey>('all');
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<React.ReactNode | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Resizer lebar kolom list.
  useEffect(() => {
    let dragging = false;
    const onDown = (e: MouseEvent) => {
      const resizer = document.getElementById('inbox-resizer');
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
    qc.setQueryData<Conversation[]>(key, old =>
      old?.map(c => (c.id === activeConversation.id ? { ...c, handler: newHandler } : c)) ?? old
    );
    try {
      await setConversationHandler(account, {
        conversationId: activeConversation.id,
        phone: activeConversation.customerPhone,
        handler: newHandler,
      });
      showToast(switchingToHuman ? 'Diambil alih: Mode Manusia aktif' : 'Dikembalikan ke AI: Mode AI aktif');
    } catch (err) {
      qc.setQueryData(key, prev); // rollback
      showToast(err instanceof Error ? err.message : 'Gagal menghubungi N8N, status dikembalikan.');
    }
  };

  // Kirim balasan teks via webhook N8N.
  const handleSendText = async () => {
    const text = messageText.trim();
    if (!text || !activeConversation || !account) return;
    try {
      await sendTextMessage(account, {
        conversationId: activeConversation.id,
        phone: activeConversation.customerPhone,
        text,
      });
      setMessageText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengirim pesan.');
    }
  };

  // Kirim media (gambar/PDF): baca base64 lalu kirim ke webhook N8N (tanpa storage di frontend).
  const handlePickFile = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset agar file sama bisa dipilih lagi
    if (!file || !activeConversation || !account) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      showToast('Hanya gambar atau PDF yang didukung.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran berkas maksimal 10MB.');
      return;
    }
    setIsUploading(true);
    try {
      const dataBase64 = await fileToBase64(file);
      await sendMedia(account, {
        conversationId: activeConversation.id,
        phone: activeConversation.customerPhone,
        mediaType: isImage ? 'image' : 'document',
        filename: file.name,
        dataBase64,
        caption: messageText.trim() || undefined,
      });
      setMessageText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengirim media.');
    } finally {
      setIsUploading(false);
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
    if (filterCriteria === 'confidence_med' && (c.confidence < 70 || c.confidence >= 85)) return false;
    if (filterCriteria === 'confidence_low' && c.confidence >= 70) return false;
    if (activeTab === 'ai') return c.handler === 'ai';
    if (activeTab === 'human') return c.handler === 'human';
    if (activeTab === 'lead') return c.orderStatus === 'lead';
    if (activeTab === 'waiting_payment') return c.orderStatus === 'waiting_payment';
    if (activeTab === 'closing') return c.orderStatus === 'closing';
    return true;
  });

  const containerStyle: React.CSSProperties = colWidth
    ? ({ width: colWidth, minWidth: colWidth, maxWidth: colWidth, flexShrink: 0, flexGrow: 0, '--list-width': `${listWidth}px` } as React.CSSProperties)
    : ({ '--list-width': `${listWidth}px` } as React.CSSProperties);

  return (
    <div className={`inbox-container ${isMultiView ? 'compact-mode' : ''} ${isMultiView && isMobileChatOpen ? 'is-active-chat' : ''}`} style={containerStyle}>
      {/* Column 1: Conversation List */}
      <div ref={listRef} className={`conversation-list ${isMobileChatOpen ? 'mobile-hidden' : ''}`}>
        <div className="list-header" style={{ paddingBottom: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
              Sky<span style={{ color: 'var(--color-primary)' }}>Box</span>
            </h2>
            {account && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{account.name}</span>}
          </div>
        </div>

        <div className="search-bar" style={{ position: 'relative' }}>
          <div className="search-input-container">
            <MdSearch size={20} className="search-icon" />
            <input type="text" placeholder="Search chats..." className="search-input" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button
            className={`icon-btn ${filterCriteria !== 'all' ? 'active-filter' : 'text-secondary'}`}
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            title="Filter Chats"
          >
            <MdFilterList size={22} />
          </button>

          {isFilterDropdownOpen && (
            <div className="filter-dropdown">
              <div className={`filter-item ${filterCriteria === 'all' ? 'active' : ''}`} onClick={() => { setFilterCriteria('all'); setIsFilterDropdownOpen(false); }}>
                Semua Obrolan
              </div>
              <div className={`filter-item ${filterCriteria === 'confidence_high' ? 'active' : ''}`} onClick={() => { setFilterCriteria('confidence_high'); setIsFilterDropdownOpen(false); }}>
                <div className="status-indicator" style={{ backgroundColor: '#3B82F6' }}></div>
                Yakin
              </div>
              <div className={`filter-item ${filterCriteria === 'confidence_med' ? 'active' : ''}`} onClick={() => { setFilterCriteria('confidence_med'); setIsFilterDropdownOpen(false); }}>
                <div className="status-indicator" style={{ backgroundColor: '#EAB308' }}></div>
                Cukup Yakin
              </div>
              <div className={`filter-item ${filterCriteria === 'confidence_low' ? 'active' : ''}`} onClick={() => { setFilterCriteria('confidence_low'); setIsFilterDropdownOpen(false); }}>
                <div className="status-indicator" style={{ backgroundColor: '#EF4444' }}></div>
                Butuh Bantuan
              </div>
            </div>
          )}
        </div>

        <div className="inbox-tabs-container">
          <div className="inbox-tabs">
            <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All</button>
            <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>AI Handled</button>
            <button className={`tab-btn ${activeTab === 'human' ? 'active' : ''}`} onClick={() => setActiveTab('human')}>Human</button>
            <button className={`tab-btn ${activeTab === 'lead' ? 'active' : ''}`} onClick={() => setActiveTab('lead')}>Leads</button>
            <button className={`tab-btn ${activeTab === 'waiting_payment' ? 'active' : ''}`} onClick={() => setActiveTab('waiting_payment')}>Waiting Payment</button>
            <button className={`tab-btn ${activeTab === 'closing' ? 'active' : ''}`} onClick={() => setActiveTab('closing')}>Closing</button>
          </div>
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
            filtered.map(conv => (
              <div
                key={conv.id}
                className={`chat-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => { setActiveConversationId(conv.id); setIsMobileChatOpen(true); onMobileChatOpenChange?.(true); }}
              >
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
            ))
          )}
        </div>
      </div>

      <div id="inbox-resizer" className="inbox-resizer hide-on-mobile"></div>

      {/* Column 2: Chat Area */}
      <div className={`chat-area ${!isMobileChatOpen ? 'mobile-hidden' : ''}`}>
        <div className="chat-header">
          <div className="chat-header-info">
            <button className="icon-btn mobile-only-btn" onClick={() => { setIsMobileChatOpen(false); onMobileChatOpenChange?.(false); }}>
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
                ) : (
                  'Online'
                )}
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

        <div className="chat-timeline">
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
                ? `💳 Transfer • ${latestOrder.amount ? `Rp ${latestOrder.amount.toLocaleString('id-ID')} • ` : ''}${latestOrder.status}`
                : `📦 COD • ${latestOrder.address ? `${latestOrder.address} • ` : ''}${latestOrder.status}`}
            </div>
          )}
          {!activeConversation ? (
            <div style={{ margin: 'auto', color: 'var(--color-text-secondary)', fontSize: 13 }}>Pilih percakapan untuk melihat pesan.</div>
          ) : msgLoading ? (
            <div style={{ margin: 'auto', color: 'var(--color-text-secondary)', fontSize: 13 }}>Memuat pesan…</div>
          ) : messages.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--color-text-secondary)', fontSize: 13 }}>Belum ada pesan.</div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`bubble-wrapper ${m.direction === 'out' ? 'sent' : 'received'}`}>
                <div className={`bubble ${m.type === 'image' && m.mediaUrl ? 'has-media' : ''}`}>
                  {m.type === 'image' && m.mediaUrl && (
                    <img
                      src={toEmbeddableUrl(m.mediaUrl)}
                      alt="media"
                      onClick={() => window.open(toEmbeddableUrl(m.mediaUrl), '_blank')}
                      style={{ width: '100%', borderRadius: 6, marginBottom: 4, display: 'block', cursor: 'pointer' }}
                    />
                  )}
                  {m.type === 'document' && m.mediaUrl && (
                    <a href={toEmbeddableUrl(m.mediaUrl)} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-dark)' }}>📄 Buka dokumen</a>
                  )}
                  {m.body && <span className="bubble-text">{m.body}</span>}
                  <span className="bubble-time">{fmtTime(m.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

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

          <div className="input-pill">
            <button ref={emojiButtonRef} className="icon-btn text-secondary" onClick={() => setIsEmojiOpen(!isEmojiOpen)}>
              <MdInsertEmoticon size={24} />
            </button>
            <input
              type="text"
              placeholder="Ketik pesan..."
              className="message-input"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
            />
            <button className="icon-btn text-secondary" style={{ transform: 'rotate(45deg)' }} onClick={handlePickFile} disabled={isUploading} title="Kirim gambar/PDF">
              <MdAttachFile size={22} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              className="icon-btn text-secondary"
              onClick={() => showToast(
                <span>Aduh maaf voice note belum berfungsi, silahkan hubungi developer Sky<span style={{ color: 'var(--color-primary)' }}>Box</span> atau tim <span style={{ color: '#F59E0B', fontWeight: 600 }}>SkyFlowID</span></span>
              )}
            >
              <MdMic size={24} />
            </button>
          </div>
          <button className="btn-primary icon-only" onClick={handleSendText}><MdSend size={22} /></button>
        </div>

        {toastMessage && <div className="custom-toast">{toastMessage}</div>}
      </div>
    </div>
  );
};

export default Inbox;
