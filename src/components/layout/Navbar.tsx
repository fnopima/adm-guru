import React, { useState } from 'react';
import { 
  GraduationCap, 
  Cloud, 
  CloudOff, 
  RotateCw, 
  UserCheck, 
  ShieldCheck, 
  KeyRound, 
  LogOut, 
  Database,
  ChevronDown,
  Settings,
  Calendar,
  ClipboardCheck,
  BookOpen,
  Award,
  ShieldAlert,
  Menu,
  X,
  Sparkles,
  MonitorPlay
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LoginModal } from '../auth/LoginModal';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { ConfirmModal } from '../common/ConfirmModal';

export type NavigationTab = 'settings' | 'schedule' | 'attendance' | 'journal' | 'grades' | 'incidents' | 'multimedia';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  onOpenLogin?: () => void;
  onOpenChangePassword?: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLogin,
  onOpenChangePassword,
  mobileOpen,
  setMobileOpen
}) => {
  const { 
    schoolSettings, 
    currentUser, 
    syncStatus, 
    isSyncing, 
    resetToDefaultData 
  } = useApp();
  
  const [showInternalLogin, setShowInternalLogin] = useState(false);
  const [showInternalPassword, setShowInternalPassword] = useState(false);

  const handleTabClick = (tabId: NavigationTab) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const mainNavItems = [
    { id: 'schedule' as NavigationTab, label: 'Penjadwalan', icon: Calendar },
    { id: 'attendance' as NavigationTab, label: 'Presensi Siswa', icon: ClipboardCheck },
    { id: 'journal' as NavigationTab, label: 'Jurnal Mengajar', icon: BookOpen },
    { id: 'grades' as NavigationTab, label: 'Pengolahan Nilai', icon: Award },
    { id: 'incidents' as NavigationTab, label: 'Kejadian Murid', icon: ShieldAlert },
    { id: 'multimedia' as NavigationTab, label: 'Jadwal Penggunaan Ruang Multimedia', icon: MonitorPlay },
  ];

  const academicNavItems = [
    { id: 'settings' as NavigationTab, label: 'Pengaturan & Master', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Aside */}
      <aside 
        className={`no-print fixed md:static inset-y-0 left-0 z-50 w-64 bg-emerald-950 text-emerald-100 flex flex-col shadow-xl border-r border-emerald-900/80 shrink-0 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-emerald-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center font-black text-emerald-950 text-lg shadow-xs">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm tracking-tight leading-tight">
                {schoolSettings.schoolName || 'SD IT AN-NUUR'}
              </span>
              <span className="text-[10px] text-amber-300/80 uppercase tracking-widest leading-none mt-0.5 font-medium">
                Sistem Informasi Guru
              </span>
            </div>
          </div>
          
          {/* Mobile Close Button */}
          <button 
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-emerald-300 hover:text-white p-1 rounded-md cursor-pointer"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-4">
          {/* Menu Utama */}
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-300/60 tracking-widest px-3 mb-2">
              Akademik
            </p>
            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    id={`sidebar-nav-${item.id}`}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-emerald-700 text-white font-semibold shadow-xs border-l-4 border-amber-400'
                        : 'text-emerald-100/80 hover:bg-emerald-900/80 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-emerald-300/80'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pengaturan */}
          <div className="border-t border-emerald-900/80 pt-4">
            <p className="text-[10px] uppercase font-bold text-emerald-300/60 tracking-widest px-3 mb-2">
              Pengaturan
            </p>
            <div className="space-y-1">
              {academicNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    id={`sidebar-nav-${item.id}`}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-emerald-700 text-white font-semibold shadow-xs border-l-4 border-amber-400'
                        : 'text-emerald-100/80 hover:bg-emerald-900/80 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-emerald-300/80'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Card Footer */}
        <div className="p-4 bg-[#032a1f] mt-auto border-t border-emerald-900/90 space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
              currentUser.role === 'admin' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-emerald-600 text-white font-bold'
            }`}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-amber-300/80 truncate uppercase font-medium">
                {currentUser.role === 'admin' ? 'Administrator' : 'Wali / Guru'} • ID: {currentUser.id.slice(0, 7)}
              </p>
            </div>
          </div>

          {/* Academic Info & Cloud Sync */}
          <div className="flex items-center justify-between text-[10px] text-emerald-200/70 pt-1 border-t border-emerald-900/80">
            <span>TP {schoolSettings.academicYear} • Sem. {schoolSettings.semester}</span>
            <span className="flex items-center gap-1">
              {isSyncing ? (
                <RotateCw className="w-3 h-3 text-amber-400 animate-spin" />
              ) : syncStatus === 'synced' ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Cloud className="w-3 h-3" /> Cloud Aktif
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <CloudOff className="w-3 h-3" /> Offline
                </span>
              )}
            </span>
          </div>

          {/* Quick User Actions */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => onOpenChangePassword ? onOpenChangePassword() : setShowInternalPassword(true)}
              className="px-2 py-1 bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 rounded text-[11px] font-medium transition cursor-pointer text-center border border-emerald-800/60"
            >
              Password
            </button>
            <button
              onClick={() => onOpenLogin ? onOpenLogin() : setShowInternalLogin(true)}
              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[11px] font-medium transition cursor-pointer text-center border border-amber-400/30"
            >
              Ganti Akun
            </button>
          </div>
        </div>
      </aside>

      {showInternalLogin && (
        <LoginModal 
          isOpen={showInternalLogin} 
          onClose={() => setShowInternalLogin(false)} 
        />
      )}

      {showInternalPassword && (
        <ChangePasswordModal 
          isOpen={showInternalPassword} 
          onClose={() => setShowInternalPassword(false)} 
        />
      )}
    </>
  );
};

interface TopHeaderProps {
  activeTab: NavigationTab;
  onToggleMobileMenu: () => void;
  onOpenLogin?: () => void;
  onOpenChangePassword?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onToggleMobileMenu,
  onOpenLogin,
  onOpenChangePassword
}) => {
  const { schoolSettings, currentUser, resetToDefaultData } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await resetToDefaultData();
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const getTabTitle = (tab: NavigationTab) => {
    switch (tab) {
      case 'settings': return 'Pengaturan & Master Data';
      case 'schedule': return 'Penjadwalan Pelajaran';
      case 'attendance': return 'Presensi Harian Siswa';
      case 'journal': return 'Jurnal Pembelajaran Guru';
      case 'grades': return 'Pengolahan Nilai Asesmen';
      case 'incidents': return 'Catatan Kejadian Murid';
      case 'multimedia': return 'Jadwal Penggunaan Ruang Multimedia';
      default: return 'Sistem Informasi Guru';
    }
  };

  const todayDateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="no-print h-16 bg-white border-b border-emerald-100 px-4 sm:px-6 flex items-center justify-between shadow-2xs z-30 shrink-0">
      {/* Left: Hamburger (mobile) & Title breadcrumb */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 text-slate-600 hover:text-emerald-800 rounded-md hover:bg-emerald-50 transition cursor-pointer"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            {getTabTitle(activeTab)}
          </h1>
          <div className="hidden sm:block h-4 w-[1px] bg-slate-200" />
          <span className="hidden sm:inline-flex bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded text-xs font-bold border border-emerald-200">
            {schoolSettings.schoolName}
          </span>
          <span className="hidden lg:inline-flex bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded text-xs font-semibold">
            {todayDateFormatted}
          </span>
        </div>
      </div>

      {/* Right: Quick actions and user menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Reset / Seed Shortcut */}
        <button
          onClick={() => setShowResetConfirm(true)}
          disabled={isResetting}
          title="Muat Ulang Data Percontohan SD IT An Nuur"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isResetting ? 'Memuat...' : 'Reset Data'}</span>
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            id="btn-header-user-menu"
            className="flex items-center gap-2 py-1 px-2 sm:px-2.5 rounded-lg hover:bg-emerald-50/70 transition border border-transparent hover:border-emerald-200 cursor-pointer"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-2xs ${
              currentUser.role === 'admin' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-emerald-600 text-white font-bold'
            }`}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1">
                <span>{currentUser.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                  currentUser.role === 'admin' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {currentUser.role}
                </span>
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div 
              className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-emerald-100 py-1.5 z-50 animate-in fade-in zoom-in-95"
              onClick={() => setShowUserMenu(false)}
            >
              <div className="px-3 py-2 border-b border-slate-100 text-xs bg-emerald-50/40">
                <p className="font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500">Role: <span className="uppercase font-bold text-emerald-700">{currentUser.role}</span></p>
              </div>

              <button
                onClick={() => onOpenChangePassword && onOpenChangePassword()}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-slate-500" />
                <span>Ubah Password Pribadi</span>
              </button>

              <button
                onClick={() => onOpenLogin && onOpenLogin()}
                className="w-full px-3 py-2 text-left text-xs text-emerald-800 hover:bg-emerald-50 font-semibold flex items-center gap-2.5 transition cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Ganti Akun / Masuk</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reset Data Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetData}
        title="Muat Ulang Data Percontohan"
        message="Apakah Anda yakin ingin memuat ulang data percontohan (SD IT An Nuur) ke Firebase Firestore? Data rombel, guru, siswa, dan presensi percontohan akan diperbarui."
        confirmText="Ya, Reset Data"
        cancelText="Batal"
        isDanger={true}
        isLoading={isResetting}
      />
    </header>
  );
};

// Backward-compatible export
export const Navbar: React.FC<any> = (props) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} {...props} />
      <TopHeader onToggleMobileMenu={() => setMobileOpen(!mobileOpen)} {...props} />
    </>
  );
};
