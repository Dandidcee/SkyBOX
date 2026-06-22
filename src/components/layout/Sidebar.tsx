import React, { useState, useEffect } from 'react';
import { 
  MdDashboard,
  MdChat,
  MdInsertChart,
  MdNotifications,
  MdIntegrationInstructions,
  MdSettings,
  MdInventory2,
  MdLocalShipping,
  MdReceiptLong,
  MdKeyboardArrowDown,
  MdAdd,
  MdEdit,
  MdCheck,
  MdDarkMode,
  MdLightMode,
  MdChevronLeft,
  MdChevronRight,
  MdLogout,
  MdFlashOn,
  MdAutoAwesome
} from 'react-icons/md';
import type { Account } from '../../App';
import './Sidebar.css';

const menuItems = [
  { id: 'dashboard', icon: MdDashboard, label: 'Dashboard' },
  { id: 'inbox', icon: MdChat, label: 'Inbox' },
  { id: 'analytics', icon: MdInsertChart, label: 'Analytics' },
  { id: 'catalog', icon: MdInventory2, label: 'Produk & Pengetahuan' },
  { id: 'orders', icon: MdReceiptLong, label: 'Tracking Order' },
  { id: 'ongkir', icon: MdLocalShipping, label: 'Cek Ongkir' },
  { id: 'quickreplies', icon: MdFlashOn, label: 'Balasan Cepat' },
  { id: 'templates', icon: MdAutoAwesome, label: 'Template (Ads)' },
  { id: 'notifications', icon: MdNotifications, label: 'Notifikasi' },
  { id: 'integrations', icon: MdIntegrationInstructions, label: 'Integrations' },
  { id: 'settings', icon: MdSettings, label: 'Settings' },
];

interface SidebarProps {
  isVisible?: boolean;
  toggleSidebar?: () => void;
  accounts: Account[];
  activeAccountIds: string[];
  toggleAccount: (id: string) => void;
  onRenameAccount: (id: string, name: string) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  userEmail?: string;
  onLogout?: () => void;
  unreadChats?: number;
  unreadNotifs?: number;
}
const Sidebar = ({ isVisible = true, toggleSidebar, accounts, activeAccountIds, toggleAccount, onRenameAccount, activeView, setActiveView, userEmail, onLogout, unreadChats = 0, unreadNotifs = 0 }: SidebarProps) => {
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // Theme Toggle State
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const primaryAccount = accounts.find(a => a.id === activeAccountIds[0]) || accounts[0];

  const handleEditClick = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(currentName);
  };

  const handleSaveEdit = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (editName.trim()) {
      onRenameAccount(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className={`sidebar ${!isVisible ? 'hidden-desktop' : ''}`}>
      <button 
        className="sidebar-toggle-btn hide-on-mobile" 
        onClick={toggleSidebar}
        title="Toggle Sidebar"
      >
        {isVisible ? <MdChevronLeft size={20} /> : <MdChevronRight size={20} />}
      </button>

      <div className="sidebar-header">
        <div 
          className="account-switcher" 
          onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
        >
          <div className="account-info">
            <div className="logo-icon" style={{ backgroundColor: primaryAccount?.color || 'var(--color-text-secondary)' }}>
              <MdChat size={18} color="white" />
            </div>
            <div className="account-text">
              <span className="account-name">{primaryAccount?.name || 'Belum ada akun'} {activeAccountIds.length > 1 && `(+${activeAccountIds.length - 1})`}</span>
              <span className="account-number">{activeAccountIds.length} Akun Aktif</span>
            </div>
          </div>
          <MdKeyboardArrowDown size={18} className="switcher-icon" />
        </div>
        
        {isAccountDropdownOpen && (
          <div className="account-dropdown">
            {accounts.map(acc => {
              const isActive = activeAccountIds.includes(acc.id);
              return (
              <div 
                key={acc.id} 
                className={`dropdown-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (editingId !== acc.id) {
                    toggleAccount(acc.id);
                  }
                }}
              >
                <div className="checkbox-wrapper">
                  <input 
                    type="checkbox" 
                    checked={isActive} 
                    onChange={() => {}} 
                    className="account-checkbox"
                  />
                </div>
                <div className="logo-icon small" style={{ backgroundColor: acc.color }}>
                  <MdChat size={14} color="white" />
                </div>
                
                {editingId === acc.id ? (
                  <div className="edit-account-wrapper" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(e, acc.id)}
                      className="edit-account-input"
                      autoFocus
                    />
                    <button className="save-edit-btn" onClick={(e) => handleSaveEdit(e as React.MouseEvent, acc.id)}>
                      <MdCheck size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="dropdown-account-name">{acc.name}</span>
                    <button 
                      className="edit-account-btn" 
                      onClick={(e) => handleEditClick(e, acc.id, acc.name)}
                      title="Edit Account Name"
                    >
                      <MdEdit size={14} />
                    </button>
                  </>
                )}
              </div>
            )})}
            
            <div className="dropdown-divider"></div>
            <div
              className="dropdown-item add-account"
              onClick={() => { setActiveView('integrations'); setIsAccountDropdownOpen(false); }}
            >
              <MdAdd size={18} />
              <span>Add Account (Webhook)</span>
            </div>
          </div>
        )}
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.id}>
              <a 
                href="#" 
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveView(item.id); }}
              >
                <item.icon size={22} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
                {item.id === 'inbox' && unreadChats > 0 && <span className="sidebar-badge">{unreadChats > 99 ? '99+' : unreadChats}</span>}
                {item.id === 'notifications' && unreadNotifs > 0 && <span className="sidebar-badge">{unreadNotifs > 99 ? '99+' : unreadNotifs}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{(userEmail?.[0] || 'A').toUpperCase()}</div>
          <div className="user-info">
            <span className="user-name" title={userEmail}>{userEmail || 'Admin'}</span>
            <span className="user-role">Admin</span>
          </div>
        </div>
        <button
          className="icon-btn theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title="Toggle Dark/Light Mode"
        >
          {theme === 'light' ? <MdDarkMode size={20} /> : <MdLightMode size={20} />}
        </button>
        <button
          className="icon-btn logout-btn"
          onClick={() => {
            if (window.confirm('Apakah Anda yakin ingin keluar?')) {
              onLogout?.();
            }
          }}
          title="Keluar"
        >
          <MdLogout size={20} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
