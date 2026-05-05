import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import LuckyWheel from './LuckyWheel';

type Fine = {
  id: number;
  payer: string;
  amount: number;
  reason?: string;
  created_at?: string;
  paid?: boolean;
  paid_by?: string | null;
  paid_at?: string | null;
  created_by_name?: string;
  wheel_used?: boolean;
};

type Total = {
  payer: string;
  outstanding: number;
  total: number;
};

type Member = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
};

type FineType = {
  id: number;
  team_id: number;
  reason: string;
  amount: number;
  created_by: number;
  created_by_name?: string;
};

export default function FinesPage() {
  const { currentTeam, token, isFormand, user } = useAuth();
  const [fines, setFines] = useState<Fine[]>([]);
  const [totals, setTotals] = useState<Total[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [fineTypes, setFineTypes] = useState<FineType[]>([]);
  const [payer, setPayer] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [selectedFineType, setSelectedFineType] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'outstanding' | 'paid' | 'count' | 'latest' | 'name'>('outstanding');
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [payModalFineId, setPayModalFineId] = useState<number | null>(null);
  const [payModalPayer, setPayModalPayer] = useState('');
  const [wheelFine, setWheelFine] = useState<Fine | null>(null);

  function formatCurrency(v: number) {
    return v.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
  }

  function paidAmount(t: Total) {
    return Number(t.total) - Number(t.outstanding);
  }

  async function load() {
    if (!currentTeam) return;
    try {
      setLoading(true);
      const [finesRes, totalsRes, membersRes, fineTypesRes] = await Promise.all([
        fetch(`/api/fines/team/${currentTeam.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/fines/team/${currentTeam.id}/totals`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/teams/${currentTeam.id}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/fines/types/team/${currentTeam.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (finesRes.ok) {
        const data = await finesRes.json();
        setFines(Array.isArray(data) ? data : []);
      }
      if (totalsRes.ok) {
        const data = await totalsRes.json();
        setTotals(Array.isArray(data) ? data : []);
      }
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(Array.isArray(data) ? data : []);
      }
      if (fineTypesRes.ok) {
        const data = await fineTypesRes.json();
        setFineTypes(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Load failed', e);
      setError('Kunne ikke hente data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [currentTeam]);

  useEffect(() => {
    if (!selectedFineType) return;
    const fineType = fineTypes.find(f => f.id === selectedFineType);
    if (!fineType) return;
    setReason(fineType.reason);
    setAmount(String(fineType.amount));
  }, [selectedFineType, fineTypes]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!payer.trim()) return setError('Spiller er påkrævet');
    const fineType = selectedFineType ? fineTypes.find(f => f.id === selectedFineType) : undefined;
    const resolvedAmount = amount || (fineType ? String(fineType.amount) : '');
    const resolvedReason = reason.trim() || fineType?.reason || '';
    const n = Number(resolvedAmount);
    if (!resolvedAmount || isNaN(n) || n <= 0) return setError('Indtast et gyldigt beløb');
    if (!currentTeam) return setError('Vælg et team først');

    try {
      setLoading(true);
      const res = await fetch('/api/fines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          payer: payer.trim(),
          amount: n,
          reason: resolvedReason,
          team_id: currentTeam.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setPayer('');
      setAmount('');
      setReason('');
      setSelectedFineType('');
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Kunne ikke tilføje bøde');
    } finally {
      setLoading(false);
    }
  }

  async function markPaid(id: number, paid_by: string) {
    if (!paid_by) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/fines/${id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paid_by })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayModalFineId(null);
      setPayModalPayer('');
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Kunne ikke markere som betalt');
    } finally {
      setLoading(false);
    }
  }

  function openPayModal(fineId: number, currentPayer: string) {
    setPayModalFineId(fineId);
    setPayModalPayer(currentPayer);
  }

  async function deleteFine(id: number) {
    if (!confirm('Er du sikker på du vil slette denne bøde?')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/fines/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await load();
    } catch (e: any) {
      setError(e.message || 'Kunne ikke slette bøde');
    } finally {
      setLoading(false);
    }
  }

  async function handleWheelResult(multiplier: number, label: string) {
    if (!wheelFine) return;
    
    try {
      setLoading(true);
      if (multiplier === 0) {
        // Slet bøden
        const res = await fetch(`/api/fines/${wheelFine.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Kunne ikke slette bøde');
      } else {
        // Opdater beløbet og marker wheel som brugt
        const newAmount = wheelFine.amount * multiplier;
        const res = await fetch(`/api/fines/${wheelFine.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ amount: newAmount, wheel_used: true })
        });
        if (!res.ok) throw new Error('Kunne ikke opdatere bøde');
      }
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setWheelFine(null);
    }
  }

  const displayed = useMemo(() => {
    const query = search.trim().toLowerCase();
    return fines.filter(f => {
      if (filter === 'paid' && !f.paid) return false;
      if (filter === 'unpaid' && f.paid) return false;
      if (!query) return true;
      return [
        f.payer,
        f.reason || '',
        f.paid_by || '',
        formatCurrency(Number(f.amount))
      ].some(value => value.toLowerCase().includes(query));
    });
  }, [fines, filter, search]);

  const fineGroups = useMemo(() => {
    const grouped = new Map<string, {
      payer: string;
      fines: Fine[];
      total: number;
      outstanding: number;
      paid: number;
      paidCount: number;
      unpaidCount: number;
      latestTime: number;
    }>();

    for (const fine of displayed) {
      const existing = grouped.get(fine.payer) || {
        payer: fine.payer,
        fines: [],
        total: 0,
        outstanding: 0,
        paid: 0,
        paidCount: 0,
        unpaidCount: 0,
        latestTime: 0
      };
      const amountValue = Number(fine.amount);
      const fineTime = fine.created_at ? new Date(fine.created_at).getTime() : 0;
      existing.fines.push(fine);
      existing.total += amountValue;
      existing.latestTime = Math.max(existing.latestTime, Number.isNaN(fineTime) ? 0 : fineTime);
      if (fine.paid) {
        existing.paid += amountValue;
        existing.paidCount += 1;
      } else {
        existing.outstanding += amountValue;
        existing.unpaidCount += 1;
      }
      grouped.set(fine.payer, existing);
    }

    return [...grouped.values()]
      .map(group => ({
        ...group,
        fines: [...group.fines].sort((a, b) => {
          if (a.paid !== b.paid) return a.paid ? 1 : -1;
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        })
      }))
      .sort((a, b) => {
        if (sortBy === 'name') return a.payer.localeCompare(b.payer, 'da-DK');
        if (sortBy === 'paid') return b.paid - a.paid || a.payer.localeCompare(b.payer, 'da-DK');
        if (sortBy === 'count') return b.fines.length - a.fines.length || a.payer.localeCompare(b.payer, 'da-DK');
        if (sortBy === 'latest') return b.latestTime - a.latestTime || a.payer.localeCompare(b.payer, 'da-DK');
        return b.outstanding - a.outstanding || a.payer.localeCompare(b.payer, 'da-DK');
      });
  }, [displayed, sortBy]);

  const displayedTotals = useMemo(() => {
    return displayed.reduce(
      (sum, fine) => {
        const amountValue = Number(fine.amount);
        sum.total += amountValue;
        if (fine.paid) sum.paid += amountValue;
        else sum.outstanding += amountValue;
        return sum;
      },
      { total: 0, paid: 0, outstanding: 0 }
    );
  }, [displayed]);

  function togglePlayer(player: string) {
    setExpandedPlayers(current => {
      const next = new Set(current);
      if (next.has(player)) next.delete(player);
      else next.add(player);
      return next;
    });
  }

  function setAllGroups(open: boolean) {
    setExpandedPlayers(open ? new Set(fineGroups.map(group => group.payer)) : new Set());
  }

  if (!currentTeam) {
    return (
      <div className="fines-page empty">
        <div className="empty-state">
          <h2>📋 Bøder</h2>
          <p>Vælg eller opret et team for at se bøder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fines-page">
      <div className="page-header">
        <h1>🏆 Bøder</h1>
        <p>Oversigt over alle bøder for <span className="team-name">{currentTeam.name}</span></p>
      </div>
      <div className="fines-grid">
        <section className="left">
          {isFormand && (
            <div className="card add-fine-card">
              <div className="add-fine-header">
                <span className="add-fine-icon">🎾</span>
                <h2>Tilføj bøde</h2>
              </div>
              <form onSubmit={add} className="add-form">
                <div className="row">
                  <select
                    aria-label="payer"
                    value={payer}
                    onChange={e => {
                      setPayer(e.target.value);
                      setError(null);
                    }}
                    className="player-select"
                  >
                    <option value="">Vælg spiller...</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                  <input
                    aria-label="amount"
                    placeholder="Beløb (kr)"
                    value={amount}
                    onChange={e => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>
                <select
                  value={selectedFineType}
                  onChange={e => {
                    const id = e.target.value;
                    setSelectedFineType(id ? Number(id) : '');
                    setError(null);
                    if (id) {
                      const ft = fineTypes.find(f => f.id === Number(id));
                      if (ft) {
                        setReason(ft.reason);
                        setAmount(String(ft.amount));
                      }
                    }
                  }}
                  className="player-select full-width"
                >
                  <option value="">Vælg bødetype...</option>
                  {fineTypes.map(ft => (
                    <option key={ft.id} value={ft.id}>
                      {ft.reason} ({formatCurrency(ft.amount)})
                    </option>
                  ))}
                </select>
                <input
                  aria-label="reason"
                  placeholder="Eller skriv egen årsag..."
                  value={reason}
                  onChange={e => {
                    setReason(e.target.value);
                    setSelectedFineType('');
                    setError(null);
                  }}
                  className="reason-input"
                />
                <div className="form-actions">
                  <button className="primary" type="submit" disabled={loading}>
                    Tilføj bøde
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayer('');
                      setAmount('');
                      setReason('');
                      setSelectedFineType('');
                      setError(null);
                    }}
                  >
                    Ryd
                  </button>
                </div>
                {error && <div className="error">{error}</div>}
              </form>
            </div>
          )}

          {/* Personligt overblik */}
          {user && totals.length > 0 && (
            <div className="card personal-summary">
              <h2>👤 Dit overblik</h2>
              {(() => {
                const myTotal = totals.find(t => t.payer === user.name);
                const myOutstanding = myTotal ? Number(myTotal.outstanding) : 0;
                const myPaid = myTotal ? Number(myTotal.total) - Number(myTotal.outstanding) : 0;
                return (
                  <div className="personal-stats">
                    <div className={`personal-outstanding ${myOutstanding > 0 ? 'owes' : 'clear'}`}>
                      <span className="label">Du skylder:</span>
                      <span className="amount">
                        {myOutstanding > 0 ? formatCurrency(myOutstanding) : '✓ Intet!'}
                      </span>
                    </div>
                    {myPaid > 0 && (
                      <div className="personal-paid">
                        <span className="small-label">Du har betalt {formatCurrency(myPaid)} i alt</span>
                      </div>
                    )}
                    {myOutstanding === 0 && myPaid === 0 && (
                      <div className="personal-clean">
                        <span className="small-label">🎉 Du har ingen bøder endnu!</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="card">
            <h2>🏆 Leaderboard</h2>
            {totals.length === 0 ? (
              <div className="muted">Ingen data endnu</div>
            ) : (
              <>
                <div className="team-stats">
                  <div className="team-total">
                    <span className="label">💰 Samlet udestående:</span>
                    <span className="amount outstanding">
                      {formatCurrency(totals.reduce((sum, t) => sum + Number(t.outstanding), 0))}
                    </span>
                  </div>
                  <div className="team-total">
                    <span className="label">✅ All-time betalt:</span>
                    <span className="amount paid">
                      {formatCurrency(totals.reduce((sum, t) => sum + (Number(t.total) - Number(t.outstanding)), 0))}
                    </span>
                  </div>
                  <div className="team-total grand-total">
                    <span className="label">📊 Total bøder (all-time):</span>
                    <span className="amount">
                      {formatCurrency(totals.reduce((sum, t) => sum + Number(t.total), 0))}
                    </span>
                  </div>
                </div>
                <ul className="leaderboard">
                  {[...totals]
                    .sort((a, b) => {
                      const paidDiff = paidAmount(b) - paidAmount(a);
                      if (paidDiff !== 0) return paidDiff;
                      return a.payer.localeCompare(b.payer, 'da-DK');
                    })
                    .map((t, idx) => (
                      <li key={t.payer} className={`leaderboard-item ${Number(t.outstanding) === 0 ? 'paid-up' : ''}`}>
                        <span className="rank">
                          {idx === 0 && paidAmount(t) > 0 ? '🥇' : 
                           idx === 1 && paidAmount(t) > 0 ? '🥈' : 
                           idx === 2 && paidAmount(t) > 0 ? '🥉' : 
                           `${idx + 1}.`}
                        </span>
                        <span className="name">{t.payer}</span>
                        <span className="stats">
                          <span className={`outstanding ${Number(t.outstanding) > 0 ? 'owes' : 'clear'}`}>
                            {Number(t.outstanding) > 0 
                              ? formatCurrency(Number(t.outstanding))
                              : '✓ Betalt'}
                          </span>
                          <span className="total-small">({formatCurrency(paidAmount(t))} betalt)</span>
                        </span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section className="right">
          <div className="card">
            <div className="list-header">
              <h2>🏆 Bøder</h2>
              <div className="fine-count">{displayed.length} af {fines.length}</div>
            </div>

            {loading && fines.length === 0 ? (
              <div className="muted">Indlæser...</div>
            ) : (
              <>
                <div className="fine-toolbar">
                  <div className="fine-search-wrap">
                    <span className="fine-search-icon">⌕</span>
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Søg efter spiller eller årsag"
                      className="fine-search"
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="fine-sort"
                  >
                    <option value="outstanding">Mest ubetalt</option>
                    <option value="paid">Mest betalt</option>
                    <option value="count">Flest bøder</option>
                    <option value="latest">Nyeste først</option>
                    <option value="name">Navn A-Å</option>
                  </select>
                </div>

                <div className="fine-filters" role="tablist" aria-label="Bødefilter">
                  <button className={filter === 'unpaid' ? 'active' : ''} onClick={() => setFilter('unpaid')} type="button">
                    Ubetalte
                  </button>
                  <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')} type="button">
                    Alle
                  </button>
                  <button className={filter === 'paid' ? 'active' : ''} onClick={() => setFilter('paid')} type="button">
                    Betalte
                  </button>
                </div>

                <div className="fine-summary-strip">
                  <div>
                    <span>Ubetalt</span>
                    <strong>{formatCurrency(displayedTotals.outstanding)}</strong>
                  </div>
                  <div>
                    <span>Betalt</span>
                    <strong>{formatCurrency(displayedTotals.paid)}</strong>
                  </div>
                  <div>
                    <span>Bøder</span>
                    <strong>{displayed.length}</strong>
                  </div>
                </div>

                <div className="group-actions">
                  <button type="button" onClick={() => setAllGroups(true)}>Åbn alle</button>
                  <button type="button" onClick={() => setAllGroups(false)}>Luk alle</button>
                </div>

                {fineGroups.length === 0 ? (
                  <div className="muted fine-empty">
                    Ingen bøder matcher filtrene.
                  </div>
                ) : (
                  <div className="fine-groups">
                    {fineGroups.map(group => {
                      const expanded = expandedPlayers.has(group.payer);
                      return (
                        <div key={group.payer} className="fine-group">
                          <button
                            type="button"
                            className="fine-group-summary"
                            onClick={() => togglePlayer(group.payer)}
                            aria-expanded={expanded}
                          >
                            <span className="group-chevron">{expanded ? '▾' : '▸'}</span>
                            <span className="group-player">
                              <strong>{group.payer}</strong>
                              <span>{group.fines.length} bøde{group.fines.length === 1 ? '' : 'r'}</span>
                            </span>
                            <span className={`group-money ${group.outstanding > 0 ? 'owes' : 'clear'}`}>
                              <small>Ubetalt</small>
                              {group.outstanding > 0 ? formatCurrency(group.outstanding) : 'Betalt'}
                            </span>
                            <span className="group-money">
                              <small>Betalt</small>
                              {formatCurrency(group.paid)}
                            </span>
                          </button>

                          {expanded && (
                            <div className="fine-details">
                              {group.fines.map(f => (
                                <div key={f.id} className={`fine-detail ${f.paid ? 'paid' : ''}`}>
                                  <div className="fine-detail-main">
                                    <strong>{formatCurrency(Number(f.amount))}</strong>
                                    <span>{f.reason || 'Ingen årsag'}</span>
                                  </div>
                                  <div className="fine-detail-meta">
                                    {f.paid ? `Betalt${f.paid_by ? ` af ${f.paid_by}` : ''}` : 'Ubetalt'}
                                  </div>
                                  {isFormand && (
                                    <div className="fine-detail-actions">
                                      {!f.paid && (
                                        <>
                                          <button type="button" onClick={() => openPayModal(f.id, f.payer)}>Betalt</button>
                                          {!f.wheel_used && (
                                            <button type="button" className="wheel-btn" onClick={() => setWheelFine(f)}>🎰</button>
                                          )}
                                        </>
                                      )}
                                      <button type="button" className="danger compact" onClick={() => deleteFine(f.id)}>Slet</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {fines.length === 0 && !loading && (
              <div className="muted">
                Ingen bøder endnu {isFormand ? '— tilføj en ovenfor.' : ''}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Pay Modal */}
      {payModalFineId && (
        <div className="modal-overlay" onClick={() => setPayModalFineId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>💰 Marker som betalt</h3>
            <p className="modal-subtitle">Hvem har betalt denne bøde?</p>
            <select
              value={payModalPayer}
              onChange={e => setPayModalPayer(e.target.value)}
              className="player-select"
              autoFocus
            >
              <option value="">Vælg medlem...</option>
              {members.map(m => (
                <option key={m.user_id} value={m.name}>{m.name}</option>
              ))}
            </select>
            <div className="modal-actions">
              <button 
                className="primary" 
                onClick={() => markPaid(payModalFineId, payModalPayer)}
                disabled={!payModalPayer || loading}
              >
                {loading ? 'Gemmer...' : 'Bekræft betaling'}
              </button>
              <button onClick={() => setPayModalFineId(null)}>Annuller</button>
            </div>
          </div>
        </div>
      )}

      {/* Lucky Wheel */}
      <LuckyWheel
        isOpen={!!wheelFine}
        onClose={() => setWheelFine(null)}
        onResult={handleWheelResult}
        fineName={wheelFine?.reason || 'Bøde'}
        fineAmount={wheelFine?.amount || 0}
        fineId={wheelFine?.id || 0}
      />

      {/* Floating MobilePay Button - only show if team has mobilepay_link */}
      {currentTeam?.mobilepay_link && (
        <a 
          href={currentTeam.mobilepay_link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="mobilepay-fab"
        >
          <span className="mp-icon">📱</span>
          <span className="mp-text">Betal med MobilePay</span>
        </a>
      )}
    </div>
  );
}
