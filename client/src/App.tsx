import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import Sidebar from './Sidebar';
import FinesPage from './FinesPage';
import FineTypesPage from './FineTypesPage';
import TeamPage from './TeamPage';
import LeaguePage from './LeaguePage';

type Page = 'fines' | 'fine-types' | 'team' | 'league';

function AppContent() {
  const { user, loading, currentTeam } = useAuth();
  const [page, setPage] = useState<Page>('fines');
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? true : window.innerWidth > 900
  ));

  function closeSidebarOnMobile() {
    if (window.innerWidth <= 900) setSidebarOpen(false);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">🎾</div>
        <p>Indlæser...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label="Luk menu" onClick={() => setSidebarOpen(false)} />}
      <Sidebar onClose={() => setSidebarOpen(false)} onNavigate={closeSidebarOnMobile} />
      <main className="main-content">
        <nav className="page-nav">
          <button
            className="sidebar-toggle"
            type="button"
            aria-label={sidebarOpen ? 'Skjul menu' : 'Vis menu'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(open => !open)}
          >
            ☰
          </button>
          <button
            className={page === 'fines' ? 'active' : ''}
            onClick={() => setPage('fines')}
          >
            📋 Bøder
          </button>
          <button
            className={page === 'fine-types' ? 'active' : ''}
            onClick={() => setPage('fine-types')}
          >
            📜 Bødetyper
          </button>
          <button
            className={page === 'league' ? 'active' : ''}
            onClick={() => setPage('league')}
          >
            🏆 Liga
          </button>
          <button
            className={page === 'team' ? 'active' : ''}
            onClick={() => setPage('team')}
          >
            👥 Team
          </button>
          {currentTeam && (
            <span className="current-team-name">{currentTeam.name}</span>
          )}
        </nav>
        
        {page === 'fines' && <FinesPage />}
        {page === 'fine-types' && <FineTypesPage />}
        {page === 'league' && <LeaguePage />}
        {page === 'team' && <TeamPage />}
        
        <footer className="footer">Bygget med ❤️ til padel 🎾</footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
