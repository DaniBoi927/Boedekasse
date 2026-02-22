import React, { useEffect, useState } from 'react'

type Fine = {
  id: number
  payer: string
  amount: number
  reason?: string
  created_at?: string
  paid?: boolean
  paid_by?: string | null
  paid_at?: string | null
}

export default function App() {
  const [fines, setFines] = useState<Fine[]>([])
  const [payer, setPayer] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all')
  const [totals, setTotals] = useState<Array<{ payer: string; outstanding: number; total: number }>>([])
  const [error, setError] = useState<string | null>(null)

  function formatCurrency(v: number) {
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr'
  }

  async function load() {
    try {
      setLoading(true)
      const res = await fetch('/api/fines')
      const data = await res.json()
      if (!Array.isArray(data)) {
        console.error('Unexpected /api/fines response, expected array:', data)
        setFines([])
      } else {
        setFines(data)
      }

      const totalsRes = await fetch('/api/fines/stats/totals')
      const t = await totalsRes.json()
      if (!Array.isArray(t)) {
        console.error('Unexpected /api/fines/stats/totals response, expected array:', t)
        setTotals([])
      } else {
        setTotals(t)
      }
    } catch (e) {
      console.error('Load failed', e)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!payer.trim()) return setError('Payer required')
    const n = Number(amount)
    if (!amount || isNaN(n) || n <= 0) return setError('Enter a valid amount')
    try {
      setLoading(true)
      await fetch('/api/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payer: payer.trim(), amount: n, reason: reason.trim() })
      })
      setPayer('')
      setAmount('')
      setReason('')
      await load()
    } catch (e) {
      console.error(e)
      setError('Failed to add fine')
    } finally {
      setLoading(false)
    }
  }

  async function markPaid(id: number) {
    const paid_by = prompt('Who paid?') || ''
    if (!paid_by) return
    try {
      setLoading(true)
      await fetch(`/api/fines/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_by })
      })
      await load()
    } catch (e) {
      console.error(e)
      setError('Failed to mark paid')
    } finally {
      setLoading(false)
    }
  }

  const displayed = Array.isArray(fines)
    ? fines.filter(f => {
        if (filter === 'all') return true
        if (filter === 'paid') return !!f.paid
        return !f.paid
      })
    : []

  return (
    <div className="app">
      <header className="topbar">
        <h1>Boedekasse</h1>
        <p className="subtitle">Track fines — who owes what. Clean, simple, shared.</p>
      </header>

      <main className="main">
        <section className="left">
          <div className="card">
            <h2>Add fine</h2>
            <form onSubmit={add} className="add-form">
              <div className="row">
                <input aria-label="payer" placeholder="Payer (name)" value={payer} onChange={e => setPayer(e.target.value)} />
                <input aria-label="amount" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <input aria-label="reason" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
              <div className="form-actions">
                <button className="primary" type="submit" disabled={loading}>Add fine</button>
                <button type="button" onClick={() => { setPayer(''); setAmount(''); setReason(''); setError(null) }}>Clear</button>
              </div>
              {error && <div className="error">{error}</div>}
            </form>
          </div>

          <div className="card">
            <h2>Totals</h2>
            {totals.length === 0 ? (
              <div className="muted">No data yet</div>
            ) : (
              <ul className="totals-list">
                {totals.map(t => (
                  <li key={t.payer} className="totals-item">
                    <strong>{t.payer}</strong>
                    <div className="totals-values">
                      <span className="outstanding">{formatCurrency(Number(t.outstanding))} outstanding</span>
                      <span className="total">{formatCurrency(Number(t.total))} total</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="right">
          <div className="card">
            <div className="list-header">
              <h2>Fines</h2>
              <div className="filters">
                <label>
                  <input type="radio" name="filter" checked={filter === 'all'} onChange={() => setFilter('all')} /> All
                </label>
                <label>
                  <input type="radio" name="filter" checked={filter === 'unpaid'} onChange={() => setFilter('unpaid')} /> Unpaid
                </label>
                <label>
                  <input type="radio" name="filter" checked={filter === 'paid'} onChange={() => setFilter('paid')} /> Paid
                </label>
              </div>
            </div>

            {loading ? (
              <div className="muted">Loading…</div>
            ) : (
              <table className="fines">
                <thead>
                  <tr>
                    <th>Payer</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Created</th>
                    <th>Paid</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(f => (
                    <tr key={f.id} className={f.paid ? 'paid' : ''}>
                      <td>{f.payer}</td>
                      <td>{formatCurrency(Number(f.amount))}</td>
                      <td className="reason">{f.reason}</td>
                      <td className="muted small">{f.created_at ? new Date(f.created_at).toLocaleString() : ''}</td>
                      <td>{f.paid ? `Yes ${f.paid_by ? `(${f.paid_by})` : ''}` : 'No'}</td>
                      <td>{!f.paid && <button onClick={() => markPaid(f.id)}>Mark paid</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {fines.length === 0 && !loading && <div className="muted">No fines yet — add one on the left.</div>}
          </div>
        </section>
      </main>

      <footer className="footer">Built with ♥ — run frontend on <a href="http://localhost:5173">5173</a></footer>
    </div>
  )
}
