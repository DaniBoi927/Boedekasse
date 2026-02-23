import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

type Member = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  joined_at: string;
};

export default function TeamPage() {
  const { currentTeam, token, isFormand, loadTeams } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentTeam) {
      loadMembers();
    }
  }, [currentTeam]);

  async function loadMembers() {
    if (!currentTeam) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMembers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(memberId: number, newRole: string) {
    setError('');
    try {
      const res = await fetch(`/api/teams/${currentTeam?.id}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      await loadMembers();
      await loadTeams();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function copyInviteCode() {
    if (currentTeam) {
      navigator.clipboard.writeText(currentTeam.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!currentTeam) {
    return (
      <div className="team-page empty">
        <div className="empty-state">
          <h2>🎾 Velkommen til Padel Bødekasse</h2>
          <p>Opret et team eller tilslut dig et eksisterende team for at komme i gang.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-page">
      <div className="page-header">
        <h1>👥 Team</h1>
        <p>Administrer medlemmer i <span className="team-name">{currentTeam.name}</span></p>
      </div>
      <div className="team-header">
        <div>
          <h2>{currentTeam.name}</h2>
          <p className="team-role">
            Du er {currentTeam.role === 'formand' ? '👑 Formand' : '👤 Medlem'}
          </p>
        </div>
        <div className="invite-code-box">
          <span className="label">Invitationskode:</span>
          <code className="invite-code">{currentTeam.invite_code}</code>
          <button className="copy-btn" onClick={copyInviteCode}>
            {copied ? '✓ Kopieret!' : '📋 Kopier'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3>Medlemmer ({members.length})</h3>
        {loading ? (
          <p className="muted">Indlæser...</p>
        ) : (
          <ul className="members-list">
            {members.map(member => (
              <li key={member.id} className="member-item">
                <div className="member-avatar">{member.name.charAt(0).toUpperCase()}</div>
                <div className="member-info">
                  <span className="member-name">{member.name}</span>
                  <span className="member-email">{member.email}</span>
                </div>
                <div className="member-role">
                  {member.role === 'formand' ? (
                    <span className="badge formand">👑 Formand</span>
                  ) : (
                    <span className="badge member">Medlem</span>
                  )}
                </div>
                {isFormand && member.role !== 'formand' && (
                  <button 
                    className="small-btn"
                    onClick={() => changeRole(member.id, 'formand')}
                  >
                    Gør til formand
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="team-info">
        <p className="muted">
          💡 <strong>Tip:</strong> Del invitationskoden med dine medspillere så de kan tilslutte sig teamet.
        </p>
        {isFormand && (
          <p className="muted">
            👑 <strong>Som formand</strong> kan du give bøder og markere dem som betalt.
          </p>
        )}
      </div>
    </div>
  );
}
