import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

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
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [error, setError] = useState<string | null>(null);
  const [payModalFineId, setPayModalFineId] = useState<number | null>(null);
  const [payModalPayer, setPayModalPayer] = useState('');

  function formatCurrency(v: number) {
    return v.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
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

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!payer.trim()) return setError('Spiller er påkrævet');
    const n = Number(amount);
    if (!amount || isNaN(n) || n <= 0) return setError('Indtast et gyldigt beløb');
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
          reason: reason.trim(),
          team_id: currentTeam.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setPayer('');
      setAmount('');
      setReason('');
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

  const displayed = fines.filter(f => {
    if (filter === 'all') return true;
    if (filter === 'paid') return !!f.paid;
    return !f.paid;
  });

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
            <div className="card">
              <h2>➕ Tilføj bøde</h2>
              <form onSubmit={add} className="add-form">
                <div className="row">
                  <select
                    aria-label="payer"
                    value={payer}
                    onChange={e => setPayer(e.target.value)}
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
                    onChange={e => setAmount(e.target.value)}
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="fine-type-select-wrapper">
                  <select
                    value={selectedFineType}
                    onChange={e => {
                      const id = e.target.value;
                      setSelectedFineType(id ? Number(id) : '');
                      if (id) {
                        const ft = fineTypes.find(f => f.id === Number(id));
                        if (ft) {
                          setReason(ft.reason);
                          setAmount(String(ft.amount));
                        }
                      }
                    }}
                    className="player-select"
                  >
                    <option value="">Vælg bødetype...</option>
                    {fineTypes.map(ft => (
                      <option key={ft.id} value={ft.id}>
                        {ft.reason} ({formatCurrency(ft.amount)})
                      </option>
                    ))}
                  </select>
                  <span className="or-text">eller skriv selv:</span>
                </div>
                <input
                  aria-label="reason"
                  placeholder="Eller skriv egen årsag..."
                  value={reason}
                  onChange={e => {
                    setReason(e.target.value);
                    setSelectedFineType('');
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
                    .sort((a, b) => Number(b.outstanding) - Number(a.outstanding))
                    .map((t, idx) => (
                      <li key={t.payer} className={`leaderboard-item ${Number(t.outstanding) === 0 ? 'paid-up' : ''}`}>
                        <span className="rank">
                          {idx === 0 && Number(t.outstanding) > 0 ? '🥇' : 
                           idx === 1 && Number(t.outstanding) > 0 ? '🥈' : 
                           idx === 2 && Number(t.outstanding) > 0 ? '🥉' : 
                           `${idx + 1}.`}
                        </span>
                        <span className="name">{t.payer}</span>
                        <span className="stats">
                          <span className={`outstanding ${Number(t.outstanding) > 0 ? 'owes' : 'clear'}`}>
                            {Number(t.outstanding) > 0 
                              ? formatCurrency(Number(t.outstanding))
                              : '✓ Betalt'}
                          </span>
                          <span className="total-small">({formatCurrency(Number(t.total))} total)</span>
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
              <div className="filters">
                <label>
                  <input
                    type="radio"
                    name="filter"
                    checked={filter === 'all'}
                    onChange={() => setFilter('all')}
                  />{' '}
                  Alle
                </label>
                <label>
                  <input
                    type="radio"
                    name="filter"
                    checked={filter === 'unpaid'}
                    onChange={() => setFilter('unpaid')}
                  />{' '}
                  Ubetalte
                </label>
                <label>
                  <input
                    type="radio"
                    name="filter"
                    checked={filter === 'paid'}
                    onChange={() => setFilter('paid')}
                  />{' '}
                  Betalte
                </label>
              </div>
            </div>

            {loading && fines.length === 0 ? (
              <div className="muted">Indlæser...</div>
            ) : (
              <table className="fines">
                <thead>
                  <tr>
                    <th>Spiller</th>
                    <th>Beløb</th>
                    <th>Årsag</th>
                    <th>Betalt</th>
                    {isFormand && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(f => (
                    <tr key={f.id} className={f.paid ? 'paid' : ''}>
                      <td>{f.payer}</td>
                      <td>{formatCurrency(Number(f.amount))}</td>
                      <td className="reason">{f.reason}</td>
                      <td>{f.paid ? `Ja ${f.paid_by ? `(${f.paid_by})` : ''}` : 'Nej'}</td>
                      {isFormand && (
                        <td className="actions">
                          {!f.paid && (
                            <button onClick={() => openPayModal(f.id, f.payer)}>✓ Betalt</button>
                          )}
                          <button className="danger" onClick={() => deleteFine(f.id)}>Slet</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {/* Floating MobilePay Button */}
      <a 
        href="https://qr.mobilepay.dk/box/b5158899-fa51-4d48-b6d7-582bc4aa32df/pay-in" 
        target="_blank" 
        rel="noopener noreferrer"
        className="mobilepay-fab"
      >
        <span className="mp-icon">📱</span>
        <span className="mp-text">Betal med MobilePay</span>
      </a>
    </div>
  );
}
