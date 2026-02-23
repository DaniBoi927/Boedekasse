import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export default function Sidebar() {
  const { user, teams, currentTeam, setCurrentTeam, logout, loadTeams, token } = useAuth();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [mobilepayLink, setMobilepayLink] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: teamName, mobilepay_link: mobilepayLink || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      await loadTeams();
      setTeamName('');
      setMobilepayLink('');
      setShowCreateTeam(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function joinTeam(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ invite_code: inviteCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      await loadTeams();
      setInviteCode('');
      setShowJoinTeam(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>🎾 Padel Bødekasse</h1>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
        <div className="user-info">
          <span className="user-name">{user?.name}</span>
          <span className="user-email">{user?.email}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3>Mine Teams</h3>
          <ul className="team-list">
            {teams.map(team => (
              <li key={team.id}>
                <button
                  className={`team-item ${currentTeam?.id === team.id ? 'active' : ''}`}
                  onClick={() => setCurrentTeam(team)}
                >
                  <span className="team-name">{team.name}</span>
                  {team.role === 'formand' && <span className="badge">Formand</span>}
                </button>
              </li>
            ))}
          </ul>

          <div className="team-actions">
            <button className="small-btn" onClick={() => setShowCreateTeam(true)}>
              + Opret team
            </button>
            <button className="small-btn" onClick={() => setShowJoinTeam(true)}>
              🔗 Tilslut team
            </button>
          </div>
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          Log ud
        </button>
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="modal-overlay" onClick={() => setShowCreateTeam(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Opret nyt team</h2>
            <form onSubmit={createTeam}>
              <div className="form-group">
                <label htmlFor="teamName">Team navn</label>
                <input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="F.eks. Padel Mandagsholdet"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="mobilepayLink">MobilePay Box link (valgfrit)</label>
                <input
                  id="mobilepayLink"
                  type="url"
                  value={mobilepayLink}
                  onChange={e => setMobilepayLink(e.target.value)}
                  placeholder="https://qr.mobilepay.dk/box/..."
                />
                <small className="form-hint">Indsæt dit MobilePay Box link så medlemmer kan betale direkte</small>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateTeam(false)}>Annuller</button>
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? 'Opretter...' : 'Opret team'}
                </button>
              </div>
            </form>
            <p className="modal-note">
              Du bliver automatisk formand for teamet og kan invitere andre.
            </p>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinTeam && (
        <div className="modal-overlay" onClick={() => setShowJoinTeam(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Tilslut et team</h2>
            <form onSubmit={joinTeam}>
              <div className="form-group">
                <label htmlFor="inviteCode">Invitationskode</label>
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="F.eks. A1B2C3D4"
                  required
                />
              </div>
              {error && <div className="error">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowJoinTeam(false)}>Annuller</button>
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? 'Tilslutter...' : 'Tilslut team'}
                </button>
              </div>
            </form>
            <p className="modal-note">
              Spørg din formand om teamets invitationskode.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
