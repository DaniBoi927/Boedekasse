import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

type StandingTeam = {
  position: number;
  name: string;
  points: number;
  played: number;
  wins: string;
  sets: string;
  games: string;
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
  const [showAddStanding, setShowAddStanding] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  
  // Setup form
  const [rankedinUrl, setRankedinUrl] = useState('');
  const [teamName, setTeamName] = useState('');
  const [poolName, setPoolName] = useState('');
  const [saving, setSaving] = useState(false);

  // Standing form
  const [standingForm, setStandingForm] = useState({
    position: 1, name: '', points: 0, played: 0, wins: '0-0', sets: '0-0', games: '0-0', isCurrentTeam: false
  });

  // Match form
  const [matchForm, setMatchForm] = useState({
    round: 1, date: '', time: '', homeTeam: '', awayTeam: '', result: '', location: ''
  });

  useEffect(() => {
    if (currentTeam) {
      loadLeagueData();
    }
  }, [currentTeam]);

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

  async function addStanding() {
    if (!currentTeam) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/league/standing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(standingForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setShowAddStanding(false);
      setStandingForm({ position: (leagueData?.standings.length || 0) + 1, name: '', points: 0, played: 0, wins: '0-0', sets: '0-0', games: '0-0', isCurrentTeam: false });
      await loadLeagueData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteStanding(position: number) {
    if (!currentTeam || !confirm('Slet denne placering?')) return;
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
      <div className="league-page empty">
        <div className="empty-state">
          <h2>🏆 Liga</h2>
          <p>Vælg eller opret et team for at se liga information.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="league-page">
        <div className="page-header">
          <h1>🏆 Liga</h1>
        </div>
        <div className="loading-state">
          <div className="loading-spinner">⚽</div>
          <p>Henter liga data...</p>
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
          <p>Konfigurer liga for {currentTeam.name}</p>
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
            <label>Dit holdnavn</label>
            <input
              type="text"
              placeholder="Fx 'Bajer Før Bandeja'"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
            />
            <span className="field-hint">Bruges til at markere jeres kampe</span>
          </div>

          <div className="form-group">
            <label>Rankedin URL (valgfri)</label>
            <input
              type="url"
              placeholder="https://www.rankedin.com/..."
              value={rankedinUrl}
              onChange={e => setRankedinUrl(e.target.value)}
            />
            <span className="field-hint">Link til jeres liga på Rankedin</span>
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

  // Add standing modal
  if (showAddStanding) {
    return (
      <div className="league-page">
        <div className="page-header">
          <h1>🏆 Liga</h1>
          <p>Tilføj hold til tabellen</p>
        </div>

        <div className="card league-setup-card">
          <h2>➕ Tilføj hold</h2>

          {error && <div className="error-banner">{error}</div>}

          <div className="form-row-grid">
            <div className="form-group">
              <label>Position</label>
              <input
                type="number"
                value={standingForm.position}
                onChange={e => setStandingForm({...standingForm, position: parseInt(e.target.value)})}
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Holdnavn</label>
              <input
                value={standingForm.name}
                onChange={e => setStandingForm({...standingForm, name: e.target.value})}
                placeholder="Holdnavn"
              />
            </div>
          </div>

          <div className="form-row-grid">
            <div className="form-group">
              <label>Point</label>
              <input
                type="number"
                value={standingForm.points}
                onChange={e => setStandingForm({...standingForm, points: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="form-group">
              <label>Spillet</label>
              <input
                type="number"
                value={standingForm.played}
                onChange={e => setStandingForm({...standingForm, played: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="form-row-grid">
            <div className="form-group">
              <label>Sejre (V-T)</label>
              <input
                value={standingForm.wins}
                onChange={e => setStandingForm({...standingForm, wins: e.target.value})}
                placeholder="1-0"
              />
            </div>
            <div className="form-group">
              <label>Sæt</label>
              <input
                value={standingForm.sets}
                onChange={e => setStandingForm({...standingForm, sets: e.target.value})}
                placeholder="4-2"
              />
            </div>
            <div className="form-group">
              <label>Partier</label>
              <input
                value={standingForm.games}
                onChange={e => setStandingForm({...standingForm, games: e.target.value})}
                placeholder="10-6"
              />
            </div>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={standingForm.isCurrentTeam}
              onChange={e => setStandingForm({...standingForm, isCurrentTeam: e.target.checked})}
            />
            Dette er vores hold
          </label>

          <div className="button-row">
            <button className="primary" onClick={addStanding} disabled={saving || !standingForm.name}>
              {saving ? 'Gemmer...' : '➕ Tilføj'}
            </button>
            <button onClick={() => setShowAddStanding(false)}>Annuller</button>
          </div>
        </div>
      </div>
    );
  }

  // Add match modal
  if (showAddMatch) {
    return (
      <div className="league-page">
        <div className="page-header">
          <h1>🏆 Liga</h1>
          <p>Tilføj kamp</p>
        </div>

        <div className="card league-setup-card">
          <h2>➕ Tilføj kamp</h2>

          {error && <div className="error-banner">{error}</div>}

          <div className="form-row-grid">
            <div className="form-group">
              <label>Runde</label>
              <input
                type="number"
                value={matchForm.round}
                onChange={e => setMatchForm({...matchForm, round: parseInt(e.target.value)})}
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Dato</label>
              <input
                type="date"
                value={matchForm.date}
                onChange={e => setMatchForm({...matchForm, date: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Tid</label>
              <input
                type="time"
                value={matchForm.time}
                onChange={e => setMatchForm({...matchForm, time: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row-grid">
            <div className="form-group">
              <label>Hjemmehold</label>
              <input
                value={matchForm.homeTeam}
                onChange={e => setMatchForm({...matchForm, homeTeam: e.target.value})}
                placeholder="Holdnavn"
              />
            </div>
            <div className="form-group">
              <label>Udehold</label>
              <input
                value={matchForm.awayTeam}
                onChange={e => setMatchForm({...matchForm, awayTeam: e.target.value})}
                placeholder="Holdnavn"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Resultat (valgfri - efterlad tom for kommende kamp)</label>
            <input
              value={matchForm.result}
              onChange={e => setMatchForm({...matchForm, result: e.target.value})}
              placeholder="Fx 4-2"
            />
          </div>

          <div className="form-group">
            <label>Lokation</label>
            <input
              value={matchForm.location}
              onChange={e => setMatchForm({...matchForm, location: e.target.value})}
              placeholder="Hallens navn og adresse"
            />
          </div>

          <div className="button-row">
            <button className="primary" onClick={addMatch} disabled={saving || !matchForm.homeTeam || !matchForm.awayTeam}>
              {saving ? 'Gemmer...' : '➕ Tilføj'}
            </button>
            <button onClick={() => setShowAddMatch(false)}>Annuller</button>
          </div>
        </div>
      </div>
    );
  }

  // No data yet - show setup prompt
  if (!leagueData) {
    return (
      <div className="league-page">
        <div className="page-header">
          <h1>🏆 Liga</h1>
          <p>Følg med i jeres liga-placering</p>
        </div>

        <div className="card">
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

  return (
    <div className="league-page">
      <div className="page-header">
        <h1>🏆 Liga</h1>
        <p>{leagueData.poolName || 'Din liga'}</p>
      </div>

      {isFormand && (
        <button className="settings-btn league-settings-btn" onClick={() => setShowSetup(true)}>
          ⚙️ Rediger
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
          🔗 Se fuld tabel på Rankedin
        </a>
      )}

      {/* Standings Table */}
      <div className="card standings-card">
        <div className="card-header-row">
          <h2>📊 Tabel</h2>
          {isFormand && (
            <button className="small-btn" onClick={() => {
              setStandingForm({ position: (leagueData.standings.length || 0) + 1, name: '', points: 0, played: 0, wins: '0-0', sets: '0-0', games: '0-0', isCurrentTeam: false });
              setShowAddStanding(true);
            }}>
              ➕ Tilføj hold
            </button>
          )}
        </div>

        {leagueData.standings.length === 0 ? (
          <div className="empty-state small">
            <p>Ingen hold tilføjet endnu</p>
          </div>
        ) : (
          <div className="standings-table-wrapper">
            <table className="standings-table">
              <thead>
                <tr>
                  <th className="pos">#</th>
                  <th className="team">Hold</th>
                  <th className="pts">Point</th>
                  <th className="played">Spillet</th>
                  <th className="wins">Sejre</th>
                  <th className="sets">Sæt</th>
                  <th className="games">Partier</th>
                  {isFormand && <th className="actions"></th>}
                </tr>
              </thead>
              <tbody>
                {leagueData.standings.map(team => (
                  <tr key={team.position} className={team.isCurrentTeam ? 'current-team' : ''}>
                    <td className="pos">{team.position}.</td>
                    <td className="team">
                      {team.isCurrentTeam && <span className="team-marker">●</span>}
                      {team.name}
                    </td>
                    <td className="pts">{team.points}</td>
                    <td className="played">{team.played}</td>
                    <td className="wins">{team.wins}</td>
                    <td className="sets">{team.sets}</td>
                    <td className="games">{team.games}</td>
                    {isFormand && (
                      <td className="actions">
                        <button className="delete-btn-small" onClick={() => deleteStanding(team.position)}>🗑️</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {leagueData.lastUpdated && (
          <div className="last-updated">
            Sidst opdateret: {new Date(leagueData.lastUpdated).toLocaleString('da-DK')}
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
              ➕ Tilføj kamp
            </button>
          )}
        </div>

        {leagueData.matches.length === 0 ? (
          <div className="empty-state small">
            <p>Ingen kampe tilføjet endnu</p>
          </div>
        ) : (
          <div className="matches-list">
            {/* Upcoming */}
            {upcomingMatches.length > 0 && (
              <>
                <h3 className="matches-section-title">Kommende kampe</h3>
                {upcomingMatches.map(match => (
                  <div 
                    key={match.id} 
                    className={`match-item ${match.involvesCurrentTeam ? 'our-match' : ''}`}
                  >
                    <div className="match-header">
                      <span className="match-round">Runde {match.round}</span>
                      <span className="match-date">{match.date} {match.time && `kl. ${match.time}`}</span>
                      {isFormand && (
                        <button className="delete-btn-small" onClick={() => deleteMatch(match.id)}>🗑️</button>
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
                      <div className="match-location">📍 {match.location}</div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Played */}
            {playedMatches.length > 0 && (
              <>
                <h3 className="matches-section-title">Spillede kampe</h3>
                {playedMatches.map(match => (
                  <div 
                    key={match.id} 
                    className={`match-item played ${match.involvesCurrentTeam ? 'our-match' : ''}`}
                  >
                    <div className="match-header">
                      <span className="match-round">Runde {match.round}</span>
                      <span className="match-date">{match.date}</span>
                      {isFormand && (
                        <button className="delete-btn-small" onClick={() => deleteMatch(match.id)}>🗑️</button>
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
  );
}
