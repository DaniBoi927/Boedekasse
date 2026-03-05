import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

type FineType = {
  id: number;
  team_id: number;
  reason: string;
  amount: number;
  created_by: number;
  created_by_name?: string;
};

export default function FineTypesPage() {
  const { currentTeam, token, isFormand } = useAuth();
  const [fineTypes, setFineTypes] = useState<FineType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [newReason, setNewReason] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingFineType, setEditingFineType] = useState<FineType | null>(null);

  function formatCurrency(v: number) {
    return v.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
  }

  async function load() {
    if (!currentTeam) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/fines/types/team/${currentTeam.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
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

  async function addFineType(e: React.FormEvent) {
    e.preventDefault();
    if (!newReason.trim() || !newAmount) return;
    
    try {
      setError(null);
      const res = await fetch('/api/fines/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          team_id: currentTeam?.id,
          reason: newReason.trim(),
          amount: Number(newAmount)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setNewReason('');
      setNewAmount('');
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function updateFineType() {
    if (!editingFineType) return;
    
    try {
      setError(null);
      const res = await fetch(`/api/fines/types/${editingFineType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: editingFineType.reason,
          amount: editingFineType.amount
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setEditingFineType(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteFineType(id: number) {
    if (!confirm('Er du sikker på du vil slette denne bødetype?')) return;
    
    try {
      setError(null);
      const res = await fetch(`/api/fines/types/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!currentTeam) {
    return (
      <div className="fine-types-page empty">
        <div className="empty-state">
          <h2>📋 Bødetyper</h2>
          <p>Vælg eller opret et team for at se bødetyper.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fine-types-page">
      <div className="page-header">
        <h1>📋 Bødetyper</h1>
        <p>Her kan du se alle bødetyper for <span className="team-name">{currentTeam.name}</span></p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card add-fine-type-card">
        <h2>Opret ny bødetype</h2>
        <form onSubmit={addFineType} className="add-fine-type-form-large">
          <div className="form-group">
            <label>Årsag</label>
            <input
              placeholder="Fx 'Kom for sent', 'Glemte bold'..."
              value={newReason}
              onChange={e => setNewReason(e.target.value)}
            />
          </div>
          <div className="add-fine-type-row">
            <div className="form-group">
              <label>Beløb (kr)</label>
              <input
                type="number"
                placeholder="50"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
            <button type="submit" className="primary" disabled={loading}>
              Tilføj bødetype
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>📜 Alle bødetyper</h2>
        {loading && fineTypes.length === 0 ? (
          <div className="muted">Indlæser...</div>
        ) : fineTypes.length === 0 ? (
          <div className="empty-fine-types">
            <span className="icon">📝</span>
            <p>Ingen bødetyper oprettet endnu</p>
            <p className="hint">Opret den første bødetype ovenfor!</p>
          </div>
        ) : (
          <div className="fine-types-grid">
            {fineTypes.map(ft => (
              <div key={ft.id} className="fine-type-card">
                {editingFineType?.id === ft.id ? (
                  <div className="fine-type-edit-mode">
                    <input
                      value={editingFineType.reason}
                      onChange={e => setEditingFineType({...editingFineType, reason: e.target.value})}
                      className="edit-input"
                    />
                    <input
                      type="number"
                      value={editingFineType.amount}
                      onChange={e => setEditingFineType({...editingFineType, amount: Number(e.target.value)})}
                      className="edit-input amount"
                    />
                    <div className="edit-actions">
                      <button onClick={updateFineType} className="save-btn">✓ Gem</button>
                      <button onClick={() => setEditingFineType(null)} className="cancel-btn">✕ Annuller</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="fine-type-info">
                      <span className="fine-type-reason">{ft.reason}</span>
                      <span className="fine-type-amount">{formatCurrency(ft.amount)}</span>
                    </div>
                    {isFormand && (
                      <div className="fine-type-actions">
                        <button onClick={() => setEditingFineType(ft)} className="edit-btn">✏️ Rediger</button>
                        <button onClick={() => deleteFineType(ft.id)} className="delete-btn">🗑️ Slet</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
