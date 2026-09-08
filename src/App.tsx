import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Sidebar, TopHeader, NavigationTab } from './components/layout/Navbar';
import { SettingsModule } from './components/settings/SettingsModule';
import { ScheduleModule } from './components/schedule/ScheduleModule';
import { AttendanceModule } from './components/attendance/AttendanceModule';
import { JournalModule } from './components/journal/JournalModule';
import { GradingModule } from './components/grades/GradingModule';
import { IncidentModule } from './components/incidents/IncidentModule';
import { LoginModal } from './components/auth/LoginModal';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('attendance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 antialiased selection:bg-emerald-200 selection:text-emerald-950 overflow-hidden">
      {/* Sleek Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogin={() => setShowLoginModal(true)}
        onOpenChangePassword={() => setShowChangePasswordModal(true)}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenLogin={() => setShowLoginModal(true)}
          onOpenChangePassword={() => setShowChangePasswordModal(true)}
        />

        {/* Scrollable Main View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {activeTab === 'settings' && <SettingsModule />}
          {activeTab === 'schedule' && <ScheduleModule />}
          {activeTab === 'attendance' && <AttendanceModule />}
          {activeTab === 'journal' && <JournalModule />}
          {activeTab === 'grades' && <GradingModule />}
          {activeTab === 'incidents' && <IncidentModule />}
        </main>

        {/* Footer */}
        <footer className="no-print bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-400 shrink-0">
          <p>SD IT AN-NUUR • Sistem Informasi Guru & Administrasi Terpadu</p>
        </footer>
      </div>

      {/* Auth Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
