import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import Sidebar from './Sidebar';
import FinesPage from './FinesPage';
import FineTypesPage from './FineTypesPage';
import TeamPage from './TeamPage';

type Page = 'fines' | 'fine-types' | 'team';

function AppContent() {
  const { user, loading, currentTeam } = useAuth();
  const [page, setPage] = useState<Page>('fines');

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
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <nav className="page-nav">
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
