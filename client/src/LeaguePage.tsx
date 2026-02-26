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
  lastUpdated: string;
};

export default function LeaguePage() {
  const { currentTeam, token, isFormand } = useAuth();
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [rankedinUrl, setRankedinUrl] = useState('');
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);

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
        // No league configured yet
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
    } catch (err: any) {
      console.error('Load league error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveLeagueSettings() {
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
          team_name: teamName
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

  // Show setup if no league data or user wants to edit
  if (showSetup || (!leagueData && !loading)) {
    return (
      <div className="league-page">
        <div className="page-header">
          <h1>🏆 Liga</h1>
          <p>Konfigurer liga-forbindelse for {currentTeam.name}</p>
        </div>

        {!isFormand ? (
          <div className="card">
            <div className="empty-state">
              <span className="icon">⚙️</span>
              <p>Liga er ikke konfigureret endnu.</p>
              <p className="hint">Bed en formand om at tilføje liga-information.</p>
            </div>
          </div>
        ) : (
          <div className="card league-setup-card">
            <h2>⚙️ Liga Opsætning</h2>
            <p className="setup-description">
              Indtast jeres Rankedin URL og holdnavn for at se tabellen og kommende kampe.
            </p>

            {error && <div className="error-banner">{error}</div>}

            <div className="form-group">
              <label>Rankedin URL</label>
              <input
                type="url"
                placeholder="https://www.rankedin.com/en/teamleague/..."
                value={rankedinUrl}
                onChange={e => setRankedinUrl(e.target.value)}
              />
              <span className="field-hint">
                Find jeres liga på rankedin.com og kopier URL'en til standings-siden
              </span>
            </div>

            <div className="form-group">
              <label>Holdnavn på Rankedin</label>
              <input
                type="text"
                placeholder="Fx 'Bajer Før Bandeja'"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
              />
              <span className="field-hint">
                Skriv holdnavnet præcis som det står på Rankedin
              </span>
            </div>

            <div className="button-row">
              <button 
                className="primary" 
                onClick={saveLeagueSettings}
                disabled={saving || !rankedinUrl || !teamName}
              >
                {saving ? 'Gemmer...' : '💾 Gem indstillinger'}
              </button>
              {leagueData && (
                <button onClick={() => setShowSetup(false)}>
                  Annuller
                </button>
              )}
            </div>
          </div>
        )}
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

  if (!leagueData) {
    return null;
  }

  const upcomingMatches = leagueData.matches.filter(m => m.isUpcoming);
  const playedMatches = leagueData.matches.filter(m => !m.isUpcoming);

  return (
    <div className="league-page">
      <div className="page-header">
        <h1>🏆 Liga</h1>
        <p>{leagueData.poolName}</p>
      </div>

      {isFormand && (
        <button className="settings-btn league-settings-btn" onClick={() => setShowSetup(true)}>
          ⚙️ Rediger
        </button>
      )}

      {error && <div className="error-banner">{error}</div>}

      {/* Standings Table */}
      <div className="card standings-card">
        <h2>📊 Tabel</h2>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="last-updated">
          Sidst opdateret: {new Date(leagueData.lastUpdated).toLocaleString('da-DK')}
        </div>
      </div>

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <div className="card matches-card">
          <h2>📅 Kommende kampe</h2>
          <div className="matches-list">
            {upcomingMatches.map((match, i) => (
              <div 
                key={i} 
                className={`match-item ${match.involvesCurrentTeam ? 'our-match' : ''}`}
              >
                <div className="match-header">
                  <span className="match-round">Runde {match.round}</span>
                  <span className="match-date">{match.date} kl. {match.time}</span>
                </div>
                <div className="match-teams">
                  <span className={`home-team ${match.homeTeam === leagueData.standings.find(s => s.isCurrentTeam)?.name ? 'our-team' : ''}`}>
                    {match.homeTeam}
                  </span>
                  <span className="vs">vs</span>
                  <span className={`away-team ${match.awayTeam === leagueData.standings.find(s => s.isCurrentTeam)?.name ? 'our-team' : ''}`}>
                    {match.awayTeam}
                  </span>
                </div>
                <div className="match-location">
                  📍 {match.location}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Played Matches */}
      {playedMatches.length > 0 && (
        <div className="card matches-card played-matches">
          <h2>✅ Spillede kampe</h2>
          <div className="matches-list">
            {playedMatches.map((match, i) => (
              <div 
                key={i} 
                className={`match-item ${match.involvesCurrentTeam ? 'our-match' : ''}`}
              >
                <div className="match-header">
                  <span className="match-round">Runde {match.round}</span>
                  <span className="match-date">{match.date}</span>
                </div>
                <div className="match-teams">
                  <span className={`home-team ${match.homeTeam === leagueData.standings.find(s => s.isCurrentTeam)?.name ? 'our-team' : ''}`}>
                    {match.homeTeam}
                  </span>
                  <span className="match-result">{match.result}</span>
                  <span className={`away-team ${match.awayTeam === leagueData.standings.find(s => s.isCurrentTeam)?.name ? 'our-team' : ''}`}>
                    {match.awayTeam}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
