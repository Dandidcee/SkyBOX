import { useState, useMemo, useEffect } from 'react';
import { MdArrowBack, MdSearch, MdPersonAdd, MdPersonOutline, MdPhone, MdArrowDropDown } from 'react-icons/md';
import type { Contact } from '../../types/db';

const COUNTRY_CODES = [
  { code: '+62', label: 'Indonesia (+62)' },
  { code: '+54', label: 'Argentina (+54)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+43', label: 'Austria (+43)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+32', label: 'Belgium (+32)' },
  { code: '+55', label: 'Brazil (+55)' },
  { code: '+673', label: 'Brunei (+673)' },
  { code: '+855', label: 'Cambodia (+855)' },
  { code: '+1', label: 'Canada (+1)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+45', label: 'Denmark (+45)' },
  { code: '+20', label: 'Egypt (+20)' },
  { code: '+358', label: 'Finland (+358)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+852', label: 'Hong Kong (+852)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+972', label: 'Israel (+972)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+856', label: 'Laos (+856)' },
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+52', label: 'Mexico (+52)' },
  { code: '+95', label: 'Myanmar (+95)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+64', label: 'New Zealand (+64)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+47', label: 'Norway (+47)' },
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+48', label: 'Poland (+48)' },
  { code: '+7', label: 'Russia (+7)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+94', label: 'Sri Lanka (+94)' },
  { code: '+46', label: 'Sweden (+46)' },
  { code: '+41', label: 'Switzerland (+41)' },
  { code: '+886', label: 'Taiwan (+886)' },
  { code: '+66', label: 'Thailand (+66)' },
  { code: '+90', label: 'Turkey (+90)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+380', label: 'Ukraine (+380)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+1', label: 'United States (+1)' },
  { code: '+84', label: 'Vietnam (+84)' }
];

interface NewChatSidebarProps {
  isOpen?: boolean;
  contacts: Contact[];
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
  onSaveNewContact: (contact: { name: string; phone: string }) => void;
}

export default function NewChatSidebar({ isOpen, contacts, onClose, onSelectContact, onSaveNewContact }: NewChatSidebarProps) {
  const [search, setSearch] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  
  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+62');
  const [phone, setPhone] = useState('');

  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    return contacts.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search)
    );
  }, [contacts, search]);

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setIsAddingContact(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleSaveContact = () => {
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName || !phone) return;
    
    let finalPhone = phone.replace(/\D/g, '');
    if (finalPhone.startsWith('0')) {
       finalPhone = finalPhone.substring(1);
    }
    const fullPhone = `${countryCode.replace('+', '')}${finalPhone}`;
    
    onSaveNewContact({ name: fullName, phone: fullPhone });
    setIsAddingContact(false);
    setFirstName('');
    setLastName('');
    setPhone('');
  };

  return (
    <div className="new-chat-sidebar-container" style={{ 
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s cubic-bezier(0.1, 0.82, 0.25, 1)',
      overflow: 'hidden'
    }}>
      {/* 1. LAYER UTAMA (Daftar Obrolan Baru) */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-surface)', width: '100%', position: 'absolute', top: 0, left: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: 'var(--color-surface)', gap: '24px', color: 'var(--color-text-primary)' }}>
          <button className="icon-btn text-primary" onClick={onClose} style={{ padding: '0' }}>
            <MdArrowBack size={24} color="var(--color-text-primary)" />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>Obrolan baru</h2>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ position: 'relative' }}>
            <MdSearch size={20} className="text-secondary" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Cari nama atau nomor" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', height: '36px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-surface-container-low)', padding: '0 16px 0 48px', fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none' }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!search && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: '16px' }} className="chat-item" onClick={() => setIsAddingContact(true)}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <MdPersonAdd size={24} />
                </div>
                <span style={{ fontSize: '16px', color: 'var(--color-text-primary)' }}>Kontak baru</span>
              </div>
            </>
          )}

          <div style={{ padding: '24px 16px 12px', color: 'var(--color-primary)', fontSize: '16px', fontWeight: 500 }}>
            {search ? 'KONTAK' : 'A'}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredContacts.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: '16px' }} className="chat-item" onClick={() => onSelectContact(c)}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'var(--color-text-secondary)', overflow: 'hidden', flexShrink: 0 }}>
                  <MdPersonOutline size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', color: 'var(--color-text-primary)' }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{c.phone}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredContacts.length === 0 && search && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              Tidak ada kontak yang cocok
            </div>
          )}
        </div>
      </div>

      {/* 2. LAYER FORM KONTAK (Slide di atas list saat isAddingContact true) */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-surface)', 
        position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 21,
        transform: isAddingContact ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.1, 0.82, 0.25, 1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: 'var(--color-surface)', gap: '24px', color: 'var(--color-text-primary)' }}>
          <button className="icon-btn text-primary" onClick={() => setIsAddingContact(false)} style={{ padding: '0' }}>
            <MdArrowBack size={24} color="var(--color-text-primary)" />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>Kontak baru</h2>
        </div>
        
        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
             <MdPersonOutline size={24} color="var(--color-text-secondary)" style={{ marginTop: '12px' }} />
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <input 
                  type="text" 
                  placeholder="Nama depan" 
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', padding: '0 16px', fontSize: '15px', color: 'var(--color-text-primary)', outline: 'none' }}
                />
                <input 
                  type="text" 
                  placeholder="Nama belakang" 
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', padding: '0 16px', fontSize: '15px', color: 'var(--color-text-primary)', outline: 'none' }}
                />
             </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
             <MdPhone size={24} color="var(--color-text-secondary)" style={{ marginTop: '12px' }} />
             <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ position: 'relative', width: '84px', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '-8px', left: '8px', backgroundColor: 'var(--color-surface)', padding: '0 4px', fontSize: '11px', color: 'var(--color-text-secondary)', zIndex: 1 }}>Negara</span>
                  <div 
                    onClick={() => { setShowCountrySelect(!showCountrySelect); setCountrySearch(''); }}
                    style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', padding: '0 4px 0 8px', fontSize: '15px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', position: 'relative', zIndex: 0 }}
                  >
                    <span>{countryCode}</span>
                    <MdArrowDropDown size={20} color="var(--color-text-secondary)" />
                  </div>
                  
                  {showCountrySelect && (
                    <>
                      <div 
                        style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                        onClick={() => setShowCountrySelect(false)}
                      />
                      <div style={{ position: 'absolute', top: '52px', left: 0, width: '280px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50, display: 'flex', flexDirection: 'column', maxHeight: '300px' }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>
                          <div style={{ position: 'relative' }}>
                            <MdSearch size={16} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                              type="text" 
                              placeholder="Cari negara..." 
                              value={countrySearch}
                              onChange={e => setCountrySearch(e.target.value)}
                              style={{ width: '100%', padding: '8px 8px 8px 28px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', fontSize: '13px', outline: 'none', color: 'var(--color-text-primary)' }}
                              autoFocus
                            />
                          </div>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
                          {COUNTRY_CODES.filter(c => c.label.toLowerCase().includes(countrySearch.toLowerCase())).map((country, idx) => (
                            <div 
                              key={`${country.code}-${idx}`}
                              onClick={() => { setCountryCode(country.code); setShowCountrySelect(false); }}
                              style={{ padding: '10px 12px', fontSize: '14px', cursor: 'pointer', color: 'var(--color-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <span>{country.label.split(' (')[0]}</span>
                              <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500 }}>{country.code}</span>
                            </div>
                          ))}
                          {COUNTRY_CODES.filter(c => c.label.toLowerCase().includes(countrySearch.toLowerCase())).length === 0 && (
                             <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                               Negara tidak ditemukan
                             </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <input 
                  type="text" 
                  placeholder="Nomor Telepon" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ flex: 1, minWidth: 0, height: '48px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', padding: '0 12px', fontSize: '15px', color: 'var(--color-text-primary)', outline: 'none' }}
                />
             </div>
          </div>
        </div>
        
        <div style={{ marginTop: 'auto', padding: '24px 16px' }}>
           <button 
             className="btn-primary"
             onClick={handleSaveContact}
             disabled={(!firstName && !lastName) || !phone}
             style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-sm)', fontSize: '15px', fontWeight: 600, cursor: ((!firstName && !lastName) || !phone) ? 'not-allowed' : 'pointer' }}
           >
             Simpan
           </button>
        </div>
      </div>
    </div>
  );
}
