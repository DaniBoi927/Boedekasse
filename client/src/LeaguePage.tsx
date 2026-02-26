import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

type StandingTeam = {
  position: number;
  name: string;
  points: number;
  played: number;
  wins: string;
  sets: string;
  isCurrentTeam?: boolean;
};

type Match = {
  id: number;
  round: number;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  result: string | null;
  location: string;
  isUpcoming: boolean;
  involvesCurrentTeam?: boolean;
};

type LeagueData = {
  poolName: string;
  standings: StandingTeam[];
  matches: Match[];
  lastUpdated: string | null;
  rankedinUrl?: string;
  teamName?: string;
};

export default function LeaguePage() {
  const { currentTeam, token, isFormand } = useAuth();
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  
  // Setup form
  const [rankedinUrl, setRankedinUrl] = useState('');
  const [teamName, setTeamName] = useState('');
  const [poolName, setPoolName] = useState('');
  const [saving, setSaving] = useState(false);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{position: number, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // New team row
  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', points: '', played: '', wins: '', sets: '' });

  // Match form
  const [matchForm, setMatchForm] = useState({
    round: 1, date: '', time: '', homeTeam: '', awayTeam: '', result: '', location: ''
  });

  useEffect(() => {
    if (currentTeam) {
      loadLeagueData();
    }
  }, [currentTeam]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  async function loadLeagueData() {
    if (!currentTeam) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/league`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 404) {
        setLeagueData(null);
        return;
      }
      if (!res.ok) {
        throw new Error('Kunne ikke hente liga data');
      }
      const data = await res.json();
      setLeagueData(data);
      setRankedinUrl(data.rankedinUrl || '');
      setTeamName(data.teamName || '');
      setPoolName(data.poolName || '');
    } catch (err: any) {
      console.error('Load league error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!currentTeam) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/league`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          rankedin_url: rankedinUrl,
          team_name: teamName,
          poolName: poolName
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setShowSetup(false);
      await loadLeagueData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Start editing a cell
  function startEdit(position: number, field: string, currentValue: any) {
    if (!isFormand) return;
    setEditingCell({ position, field });
    setEditValue(String(currentValue));
  }

  // Save inline edit
  async function saveInlineEdit() {
    if (!editingCell || !currentTeam || !leagueData) return;
    
    const team = leagueData.standings.find(t => t.position === editingCell.position);
    if (!team) return;

    const updatedTeam = { ...team };
    const field = editingCell.field;
    
    if (field === 'points' || field === 'played') {
      (updatedTeam as any)[field] = parseInt(editValue) || 0;
    } else if (field === 'isCurrentTeam') {
      updatedTeam.isCurrentTeam = editValue === 'true';
    } else {
      (updatedTeam as any)[field] = editValue;
    }

    try {
      // Delete old and add updated
      await fetch(`/api/teams/${currentTeam.id}/league/standing/${team.position}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetch(`/api/teams/${currentTeam.id}/league/standing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedTeam)
      });
      
      setEditingCell(null);
      await loadLeagueData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }

  // Add new team row
  async function addTeamRow() {
    if (!currentTeam || !newTeam.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/league/standing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          position: (leagueData?.standings.length || 0) + 1,
          name: newTeam.name,
          points: parseInt(newTeam.points) || 0,
          played: parseInt(newTeam.played) || 0,
          wins: newTeam.wins || '0-0',
          sets: newTeam.sets || '0-0',
          isCurrentTeam: false
        })
      });
      if (!res.ok) throw new Error('Kunne ikke tilføje hold');
      setAddingTeam(false);
      setNewTeam({ name: '', points: '', played: '', wins: '', sets: '' });
      await loadLeagueData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteStanding(position: number) {
    if (!currentTeam || !confirm('Slet dette hold?')) return;
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/league/standing/${position}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Kunne ikke slette');
      await loadLeagueData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggleCurrentTeam(position: number) {
    if (!currentTeam || !leagueData) return;
    const team = leagueData.standings.find(t => t.position === position);
    if (!team) return;

    try {
      await fetch(`/api/teams/${currentTeam.id}/league/standing/${position}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetch(`/api/teams/${currentTeam.id}/league/standing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...team, isCurrentTeam: !team.isCurrentTeam })
      });
      
      await loadLeagueData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function addMatch() {
    if (!currentTeam) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/league/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(matchForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setShowAddMatch(false);
      setMatchForm({ round: (leagueData?.matches.length || 0) + 1, date: '', time: '', homeTeam: '', awayTeam: '', result: '', location: '' });
      await loadLeagueData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMatch(matchId: number) {
    if (!currentTeam || !confirm('Slet denne kamp?')) return;
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/league/match/${matchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Kunne ikke slette');
      await loadLeagueData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!currentTeam) {
    return (
      <div className="league-page">
        <div className="empty-state">
          <span className="icon">🏆</span>
          <p>Vælg et hold for at se liga</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="league-page">
        <div className="loading-state">
          <span className="loading-spinner">🏐</span>
          <p>Indlæser liga...</p>
        </div>
      </div>
    );
  }

  // Setup modal
  if (showSetup) {
    return (
      <div className="league-page">
        <div className="page-header">
          <h1>🏆 Liga</h1>
          <p>Konfigurer din liga</p>
        </div>

        <div className="card league-setup-card">
          <h2>⚙️ Liga Opsætning</h2>

          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label>Pulje/Serie navn</label>
            <input
              type="text"
              placeholder="Fx 'Øst - Serie 6 - B'"
              value={poolName}
              onChange={e => setPoolName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Dit holdnavn (bruges til at markere jeres hold)</label>
            <input
              type="text"
              placeholder="Fx 'Bajer Før Bandeja'"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Rankedin URL (valgfri)</label>
            <input
              type="url"
              placeholder="https://www.rankedin.com/..."
              value={rankedinUrl}
              onChange={e => setRankedinUrl(e.target.value)}
            />
          </div>

          <div className="button-row">
            <button className="primary" onClick={saveSettings} disabled={saving}>
              {saving ? 'Gemmer...' : '💾 Gem'}
            </button>
            <button onClick={() => setShowSetup(false)}>Annuller</button>
          </div>
        </div>
      </div>
    );
  }

  // Add match modal - simplified
  if (showAddMatch) {
    // Get team names from standings for dropdown
    const teamOptions = leagueData?.standings.map(s => s.name) || [];
    
    return (
      <div className="match-form-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddMatch(false)}>
        <div className="match-form-card">
          <button className="close-btn" onClick={() => setShowAddMatch(false)}>×</button>
          
          <h2>📅 Ny kamp</h2>
          
          {error && <div className="error-banner">{error}</div>}

          {/* Teams - dropdowns */}
          <div className="match-form-teams">
            <select
              className="team-select home"
              value={matchForm.homeTeam}
              onChange={e => setMatchForm({...matchForm, homeTeam: e.target.value})}
            >
              <option value="">Hjemmehold</option>
              {teamOptions.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
            <span className="vs-badge">VS</span>
            <select
              className="team-select away"
              value={matchForm.awayTeam}
              onChange={e => setMatchForm({...matchForm, awayTeam: e.target.value})}
            >
              <option value="">Udehold</option>
              {teamOptions.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* When - cleaner */}
          <div className="match-form-datetime">
            <input
              type="date"
              className="date-input"
              value={matchForm.date}
              onChange={e => setMatchForm({...matchForm, date: e.target.value})}
            />
            <input
              type="time"
              className="time-input"
              value={matchForm.time}
              onChange={e => setMatchForm({...matchForm, time: e.target.value})}
            />
          </div>

          {/* Where */}
          <div className="match-form-location">
            <input
              value={matchForm.location}
              onChange={e => setMatchForm({...matchForm, location: e.target.value})}
              placeholder="📍 Lokation (valgfri)"
            />
          </div>

          {/* Result only */}
          <div className="match-form-result">
            <input
              value={matchForm.result}
              onChange={e => setMatchForm({...matchForm, result: e.target.value})}
              placeholder="Resultat (tom = kommende kamp)"
            />
          </div>

          <button 
            className="primary full-width" 
            onClick={addMatch} 
            disabled={saving || !matchForm.homeTeam || !matchForm.awayTeam}
          >
            {saving ? 'Gemmer...' : '✓ Tilføj kamp'}
          </button>
        </div>
      </div>
    );
  }

  // No league data yet
  if (!leagueData) {
    return (
      <div className="league-page empty">
        <div className="card league-setup-card">
          <div className="empty-state">
            <span className="icon">📊</span>
            <p>Liga er ikke konfigureret endnu</p>
            {isFormand ? (
              <button className="primary" onClick={() => setShowSetup(true)}>
                ⚙️ Opsæt liga
              </button>
            ) : (
              <p className="hint">Bed en formand om at tilføje liga-information</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const upcomingMatches = leagueData.matches.filter(m => m.isUpcoming);
  const playedMatches = leagueData.matches.filter(m => !m.isUpcoming);

  // Render editable cell
  function renderCell(team: StandingTeam, field: string, value: any, className: string = '') {
    const isEditing = editingCell?.position === team.position && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <td className={className}>
          <input
            ref={inputRef}
            className="inline-edit-input"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveInlineEdit}
            onKeyDown={handleKeyDown}
          />
        </td>
      );
    }
    
    return (
      <td 
        className={`${className} ${isFormand ? 'editable' : ''}`}
        onClick={() => startEdit(team.position, field, value)}
      >
        {field === 'name' && team.isCurrentTeam && <span className="team-marker">●</span>}
        {value}
      </td>
    );
  }

  return (
    <div className="league-page">
      <div className="page-header">
        <h1>🏆 {leagueData.poolName || 'Liga'}</h1>
      </div>

      {isFormand && (
        <button className="settings-btn league-settings-btn" onClick={() => setShowSetup(true)}>
          ⚙️
        </button>
      )}

      {error && <div className="error-banner">{error}</div>}

      {/* External link */}
      {leagueData.rankedinUrl && (
        <a 
          href={leagueData.rankedinUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="rankedin-link"
        >
          🔗 Se på Rankedin
        </a>
      )}

      <div className="league-grid">
        {/* Standings Table */}
        <div className="card standings-card">
          <div className="card-header-row">
            <h2>📊 Tabel</h2>
          </div>

          <div className="standings-table-wrapper">
            <table className="standings-table">
              <thead>
                <tr>
                  <th className="pos">#</th>
                  <th className="team">Hold</th>
                  <th className="pts">P</th>
                  <th className="played">S</th>
                  <th className="wins">M</th>
                  <th className="sets">Sæt</th>
                  {isFormand && <th className="actions"></th>}
                </tr>
              </thead>
              <tbody>
                {leagueData.standings.map(team => (
                  <tr key={team.position} className={team.isCurrentTeam ? 'current-team' : ''}>
                    <td className="pos">{team.position}.</td>
                    {renderCell(team, 'name', team.name, 'team')}
                    {renderCell(team, 'points', team.points, 'pts')}
                    {renderCell(team, 'played', team.played, 'played')}
                    {renderCell(team, 'wins', team.wins, 'wins')}
                    {renderCell(team, 'sets', team.sets, 'sets')}
                    {isFormand && (
                      <td className="actions">
                        <button 
                          className={`star-btn ${team.isCurrentTeam ? 'active' : ''}`} 
                          onClick={() => toggleCurrentTeam(team.position)}
                          title="Marker som vores hold"
                        >
                          ★
                        </button>
                        <button className="delete-btn-small" onClick={() => deleteStanding(team.position)}>🗑️</button>
                      </td>
                    )}
                  </tr>
                ))}
                
                {/* Add new team row */}
                {isFormand && addingTeam && (
                  <tr className="adding-row">
                    <td className="pos">{(leagueData.standings.length || 0) + 1}.</td>
                    <td className="team">
                      <input
                        className="inline-edit-input"
                        placeholder="Holdnavn"
                        value={newTeam.name}
                        onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                        autoFocus
                      />
                    </td>
                    <td className="pts">
                      <input
                        className="inline-edit-input small"
                        placeholder="0"
                        value={newTeam.points}
                        onChange={e => setNewTeam({...newTeam, points: e.target.value})}
                      />
                    </td>
                    <td className="played">
                      <input
                        className="inline-edit-input small"
                        placeholder="0"
                        value={newTeam.played}
                        onChange={e => setNewTeam({...newTeam, played: e.target.value})}
                      />
                    </td>
                    <td className="wins">
                      <input
                        className="inline-edit-input small"
                        placeholder="0-0"
                        value={newTeam.wins}
                        onChange={e => setNewTeam({...newTeam, wins: e.target.value})}
                      />
                    </td>
                    <td className="sets">
                      <input
                        className="inline-edit-input small"
                        placeholder="0-0"
                        value={newTeam.sets}
                        onChange={e => setNewTeam({...newTeam, sets: e.target.value})}
                      />
                    </td>
                    <td className="actions">
                      <button className="save-btn" onClick={addTeamRow} disabled={!newTeam.name.trim()}>✓</button>
                      <button className="cancel-btn" onClick={() => { setAddingTeam(false); setNewTeam({ name: '', points: '', played: '', wins: '', sets: '' }); }}>✕</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {isFormand && !addingTeam && (
            <button className="add-row-btn" onClick={() => setAddingTeam(true)}>
              + Tilføj hold
            </button>
          )}

          {leagueData.lastUpdated && (
            <div className="last-updated">
              Opdateret: {new Date(leagueData.lastUpdated).toLocaleDateString('da-DK')}
            </div>
          )}
        </div>

        {/* Matches */}
        <div className="card matches-card">
          <div className="card-header-row">
            <h2>📅 Kampe</h2>
            {isFormand && (
              <button className="small-btn" onClick={() => {
                setMatchForm({ round: (leagueData.matches.length || 0) + 1, date: '', time: '', homeTeam: '', awayTeam: '', result: '', location: '' });
                setShowAddMatch(true);
              }}>
                +
              </button>
            )}
          </div>

          {leagueData.matches.length === 0 ? (
            <div className="empty-state small">
              <p>Ingen kampe</p>
            </div>
          ) : (
            <div className="matches-list">
              {/* Upcoming */}
              {upcomingMatches.length > 0 && (
                <>
                  <h3 className="matches-section-title">Kommende</h3>
                  {upcomingMatches.map(match => (
                    <div 
                      key={match.id} 
                      className={`match-item ${match.involvesCurrentTeam ? 'our-match' : ''}`}
                    >
                      <div className="match-header">
                        <span className="match-round">R{match.round}</span>
                        <span className="match-date">{match.date} {match.time && `${match.time}`}</span>
                        {isFormand && (
                          <button className="delete-btn-small" onClick={() => deleteMatch(match.id)}>×</button>
                        )}
                      </div>
                      <div className="match-teams">
                        <span className={`home-team ${match.homeTeam.toLowerCase() === teamName?.toLowerCase() ? 'our-team' : ''}`}>
                          {match.homeTeam}
                        </span>
                        <span className="vs">vs</span>
                        <span className={`away-team ${match.awayTeam.toLowerCase() === teamName?.toLowerCase() ? 'our-team' : ''}`}>
                          {match.awayTeam}
                        </span>
                      </div>
                      {match.location && (
                        <div className="match-location">{match.location}</div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Played */}
              {playedMatches.length > 0 && (
                <>
                  <h3 className="matches-section-title">Spillede</h3>
                  {playedMatches.map(match => (
                    <div 
                      key={match.id} 
                      className={`match-item played ${match.involvesCurrentTeam ? 'our-match' : ''}`}
                    >
                      <div className="match-header">
                        <span className="match-round">R{match.round}</span>
                        <span className="match-date">{match.date}</span>
                        {isFormand && (
                          <button className="delete-btn-small" onClick={() => deleteMatch(match.id)}>×</button>
                        )}
                      </div>
                      <div className="match-teams">
                        <span className={`home-team ${match.homeTeam.toLowerCase() === teamName?.toLowerCase() ? 'our-team' : ''}`}>
                          {match.homeTeam}
                        </span>
                        <span className="match-result">{match.result}</span>
                        <span className={`away-team ${match.awayTeam.toLowerCase() === teamName?.toLowerCase() ? 'our-team' : ''}`}>
                          {match.awayTeam}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
