import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export default function App() {
    const [fines, setFines] = useState([]);
    const [payer, setPayer] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [totals, setTotals] = useState([]);
    const [error, setError] = useState(null);
    function formatCurrency(v) {
        return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
    }
    async function load() {
        try {
            setLoading(true);
            const res = await fetch('/api/fines');
            const data = await res.json();
            if (!Array.isArray(data)) {
                console.error('Unexpected /api/fines response, expected array:', data);
                setFines([]);
            }
            else {
                setFines(data);
            }
            const totalsRes = await fetch('/api/fines/stats/totals');
            const t = await totalsRes.json();
            if (!Array.isArray(t)) {
                console.error('Unexpected /api/fines/stats/totals response, expected array:', t);
                setTotals([]);
            }
            else {
                setTotals(t);
            }
        }
        catch (e) {
            console.error('Load failed', e);
            setError('Failed to load data');
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
    }, []);
    async function add(e) {
        e.preventDefault();
        setError(null);
        if (!payer.trim())
            return setError('Payer required');
        const n = Number(amount);
        if (!amount || isNaN(n) || n <= 0)
            return setError('Enter a valid amount');
        try {
            setLoading(true);
            await fetch('/api/fines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payer: payer.trim(), amount: n, reason: reason.trim() })
            });
            setPayer('');
            setAmount('');
            setReason('');
            await load();
        }
        catch (e) {
            console.error(e);
            setError('Failed to add fine');
        }
        finally {
            setLoading(false);
        }
    }
    async function markPaid(id) {
        const paid_by = prompt('Who paid?') || '';
        if (!paid_by)
            return;
        try {
            setLoading(true);
            await fetch(`/api/fines/${id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paid_by })
            });
            await load();
        }
        catch (e) {
            console.error(e);
            setError('Failed to mark paid');
        }
        finally {
            setLoading(false);
        }
    }
    const displayed = Array.isArray(fines)
        ? fines.filter(f => {
            if (filter === 'all')
                return true;
            if (filter === 'paid')
                return !!f.paid;
            return !f.paid;
        })
        : [];
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "topbar", children: [_jsx("h1", { children: "Boedekasse" }), _jsx("p", { className: "subtitle", children: "Track fines \u2014 who owes what. Clean, simple, shared." })] }), _jsxs("main", { className: "main", children: [_jsxs("section", { className: "left", children: [_jsxs("div", { className: "card", children: [_jsx("h2", { children: "Add fine" }), _jsxs("form", { onSubmit: add, className: "add-form", children: [_jsxs("div", { className: "row", children: [_jsx("input", { "aria-label": "payer", placeholder: "Payer (name)", value: payer, onChange: e => setPayer(e.target.value) }), _jsx("input", { "aria-label": "amount", placeholder: "Amount", value: amount, onChange: e => setAmount(e.target.value) })] }), _jsx("input", { "aria-label": "reason", placeholder: "Reason (optional)", value: reason, onChange: e => setReason(e.target.value) }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { className: "primary", type: "submit", disabled: loading, children: "Add fine" }), _jsx("button", { type: "button", onClick: () => { setPayer(''); setAmount(''); setReason(''); setError(null); }, children: "Clear" })] }), error && _jsx("div", { className: "error", children: error })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Totals" }), totals.length === 0 ? (_jsx("div", { className: "muted", children: "No data yet" })) : (_jsx("ul", { className: "totals-list", children: totals.map(t => (_jsxs("li", { className: "totals-item", children: [_jsx("strong", { children: t.payer }), _jsxs("div", { className: "totals-values", children: [_jsxs("span", { className: "outstanding", children: [formatCurrency(Number(t.outstanding)), " outstanding"] }), _jsxs("span", { className: "total", children: [formatCurrency(Number(t.total)), " total"] })] })] }, t.payer))) }))] })] }), _jsx("section", { className: "right", children: _jsxs("div", { className: "card", children: [_jsxs("div", { className: "list-header", children: [_jsx("h2", { children: "Fines" }), _jsxs("div", { className: "filters", children: [_jsxs("label", { children: [_jsx("input", { type: "radio", name: "filter", checked: filter === 'all', onChange: () => setFilter('all') }), " All"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "filter", checked: filter === 'unpaid', onChange: () => setFilter('unpaid') }), " Unpaid"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "filter", checked: filter === 'paid', onChange: () => setFilter('paid') }), " Paid"] })] })] }), loading ? (_jsx("div", { className: "muted", children: "Loading\u2026" })) : (_jsxs("table", { className: "fines", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Payer" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Reason" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Paid" }), _jsx("th", {})] }) }), _jsx("tbody", { children: displayed.map(f => (_jsxs("tr", { className: f.paid ? 'paid' : '', children: [_jsx("td", { children: f.payer }), _jsx("td", { children: formatCurrency(Number(f.amount)) }), _jsx("td", { className: "reason", children: f.reason }), _jsx("td", { className: "muted small", children: f.created_at ? new Date(f.created_at).toLocaleString() : '' }), _jsx("td", { children: f.paid ? `Yes ${f.paid_by ? `(${f.paid_by})` : ''}` : 'No' }), _jsx("td", { children: !f.paid && _jsx("button", { onClick: () => markPaid(f.id), children: "Mark paid" }) })] }, f.id))) })] })), fines.length === 0 && !loading && _jsx("div", { className: "muted", children: "No fines yet \u2014 add one on the left." })] }) })] }), _jsxs("footer", { className: "footer", children: ["Built with \u2665 \u2014 run frontend on ", _jsx("a", { href: "http://localhost:5173", children: "5173" })] })] }));
}
