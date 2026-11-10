import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

type Fine = {
  id: number;
  payer: string;
  amount: number;
  reason?: string;
  created_at?: string;
  paid?: boolean;
  paid_at?: string | null;
};

function formatCurrency(value: number) {
  return value.toLocaleString('da-DK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' kr';
}

function formatDate(value?: string | null) {
  if (!value) return 'Ukendt dato';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Ukendt dato' : date.toLocaleDateString('da-DK');
}

export default function StatsPage() {
  const { currentTeam, token } = useAuth();
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentTeam) {
      setFines([]);
      return;
    }

    const teamId = currentTeam.id;

    async function loadStats() {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`/api/fines/team/${teamId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Kunne ikke hente statistik');
        setFines(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Kunne ikke hente statistik');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [currentTeam, token]);

  const totals = useMemo(() => fines.reduce((result, fine) => {
    const amount = Number(fine.amount) || 0;
    result.total += amount;
    if (fine.paid) result.paid += amount;
    else result.outstanding += amount;
    return result;
  }, { total: 0, paid: 0, outstanding: 0 }), [fines]);

  const topPlayers = useMemo(() => {
    const grouped = new Map<string, { name: string; total: number; paid: number; outstanding: number; count: number }>();
    fines.forEach(fine => {
      const current = grouped.get(fine.payer) || {
        name: fine.payer,
        total: 0,
        paid: 0,
        outstanding: 0,
        count: 0
      };
      const amount = Number(fine.amount) || 0;
      current.total += amount;
      current.count += 1;
      if (fine.paid) current.paid += amount;
      else current.outstanding += amount;
      grouped.set(fine.payer, current);
    });
    return [...grouped.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'da-DK'));
  }, [fines]);

  const mostFines = useMemo(() => {
    return [...topPlayers].sort((a, b) => b.count - a.count || b.total - a.total)[0];
  }, [topPlayers]);

  const paidThisMonth = useMemo(() => {
    const now = new Date();
    return fines.reduce((sum, fine) => {
      if (!fine.paid || !fine.paid_at) return sum;
      const date = new Date(fine.paid_at);
      if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) return sum;
      return sum + (Number(fine.amount) || 0);
    }, 0);
  }, [fines]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('da-DK', { month: 'short' }).replace('.', ''),
        amount: 0
      };
    });
    const byKey = new Map(months.map(month => [month.key, month]));
    fines.forEach(fine => {
      if (!fine.created_at) return;
      const date = new Date(fine.created_at);
      const month = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (month) month.amount += Number(fine.amount) || 0;
    });
    return months;
  }, [fines]);

  const maxMonthAmount = Math.max(...monthlyTrend.map(month => month.amount), 1);
  const paidPercent = totals.total > 0 ? Math.round((totals.paid / totals.total) * 100) : 0;

  if (!currentTeam) {
    return (
      <div className="stats-page empty">
        <div className="empty-state">
          <h2>📊 Statistik</h2>
          <p>Vælg eller opret et team for at se statistik.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <div className="page-header">
        <div>
          <h1>📊 Statistik</h1>
          <p>Overblik over bødekassen for <span className="team-name">{currentTeam.name}</span></p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="card stats-loading">Indlæser statistik...</div>
      ) : (
        <>
          <div className="stats-metric-grid">
            <div className="card stats-metric-card">
              <span className="stats-metric-label">Samlet bødekasse</span>
              <strong>{formatCurrency(totals.total)}</strong>
              <small>{fines.length} bøder i alt</small>
            </div>
            <div className="card stats-metric-card paid">
              <span className="stats-metric-label">Betalt denne måned</span>
              <strong>{formatCurrency(paidThisMonth)}</strong>
              <small>{paidPercent}% af alle bøder er betalt</small>
            </div>
            <div className="card stats-metric-card warning">
              <span className="stats-metric-label">Stadig skyldig</span>
              <strong>{formatCurrency(totals.outstanding)}</strong>
              <small>{formatCurrency(totals.paid)} er betalt</small>
            </div>
            <div className="card stats-metric-card">
              <span className="stats-metric-label">Mest aktive spiller</span>
              <strong>{mostFines?.name || 'Ingen endnu'}</strong>
              <small>{mostFines ? `${mostFines.count} bøder` : 'Ingen bøder endnu'}</small>
            </div>
          </div>

          <div className="stats-columns">
            <section className="card stats-panel">
              <div className="stats-panel-header">
                <h2>🥇 Top 3 efter samlet beløb</h2>
              </div>
              {topPlayers.length === 0 ? <p className="muted">Ingen data endnu.</p> : (
                <div className="stats-ranking">
                  {topPlayers.slice(0, 3).map((player, index) => (
                    <div className="stats-ranking-row" key={player.name}>
                      <span className="stats-rank">{['🥇', '🥈', '🥉'][index]}</span>
                      <div className="stats-ranking-player">
                        <strong>{player.name}</strong>
                        <small>{player.count} bøde{player.count === 1 ? '' : 'r'} · {formatCurrency(player.paid)} betalt</small>
                      </div>
                      <strong>{formatCurrency(player.total)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card stats-panel">
              <div className="stats-panel-header">
                <h2>💰 Fordeling</h2>
              </div>
              <div className="payment-breakdown">
                <div className="breakdown-bar">
                  <span style={{ width: `${paidPercent}%` }} />
                </div>
                <div className="breakdown-legend">
                  <span><i className="dot paid-dot" /> Betalt <strong>{formatCurrency(totals.paid)}</strong></span>
                  <span><i className="dot owed-dot" /> Skyldig <strong>{formatCurrency(totals.outstanding)}</strong></span>
                </div>
              </div>
            </section>
          </div>

          <section className="card stats-panel monthly-panel">
            <div className="stats-panel-header">
              <div>
                <h2>📈 Udvikling måned for måned</h2>
                <p>Oprettede bøder de seneste seks måneder</p>
              </div>
            </div>
            <div className="monthly-chart" aria-label="Bødeudvikling de seneste seks måneder">
              {monthlyTrend.map(month => (
                <div className="monthly-column" key={month.key}>
                  <span className="monthly-value">{month.amount > 0 ? formatCurrency(month.amount) : ''}</span>
                  <div className="monthly-bar-wrap">
                    <div className="monthly-bar" style={{ height: `${Math.max((month.amount / maxMonthAmount) * 100, month.amount > 0 ? 8 : 2)}%` }} />
                  </div>
                  <span className="monthly-label">{month.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card stats-panel">
            <div className="stats-panel-header">
              <h2>👥 Flest bøder</h2>
            </div>
            <div className="stats-player-list">
              {[...topPlayers].sort((a, b) => b.count - a.count || b.total - a.total).map(player => (
                <div className="stats-player-row" key={player.name}>
                  <span>{player.name}</span>
                  <span>{player.count} bøde{player.count === 1 ? '' : 'r'}</span>
                </div>
              ))}
              {topPlayers.length === 0 && <p className="muted">Ingen data endnu.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
