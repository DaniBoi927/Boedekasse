import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import LuckyWheel from './LuckyWheel';
export default function FinesPage() {
    const { currentTeam, token, isFormand, user } = useAuth();
    const [fines, setFines] = useState([]);
    const [totals, setTotals] = useState([]);
    const [members, setMembers] = useState([]);
    const [fineTypes, setFineTypes] = useState([]);
    const [payer, setPayer] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [selectedFineType, setSelectedFineType] = useState('');
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [error, setError] = useState(null);
    const [payModalFineId, setPayModalFineId] = useState(null);
    const [payModalPayer, setPayModalPayer] = useState('');
    const [wheelFine, setWheelFine] = useState(null);
    function formatCurrency(v) {
        return v.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
    }
    async function load() {
        if (!currentTeam)
            return;
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
        }
        catch (e) {
            console.error('Load failed', e);
            setError('Kunne ikke hente data');
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
    }, [currentTeam]);
    async function add(e) {
        e.preventDefault();
        setError(null);
        if (!payer.trim())
            return setError('Spiller er påkrævet');
        const n = Number(amount);
        if (!amount || isNaN(n) || n <= 0)
            return setError('Indtast et gyldigt beløb');
        if (!currentTeam)
            return setError('Vælg et team først');
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
            if (!res.ok)
                throw new Error(data.error);
            setPayer('');
            setAmount('');
            setReason('');
            await load();
        }
        catch (e) {
            console.error(e);
            setError(e.message || 'Kunne ikke tilføje bøde');
        }
        finally {
            setLoading(false);
        }
    }
    async function markPaid(id, paid_by) {
        if (!paid_by)
            return;
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
            if (!res.ok)
                throw new Error(data.error);
            setPayModalFineId(null);
            setPayModalPayer('');
            await load();
        }
        catch (e) {
            console.error(e);
            setError(e.message || 'Kunne ikke markere som betalt');
        }
        finally {
            setLoading(false);
        }
    }
    function openPayModal(fineId, currentPayer) {
        setPayModalFineId(fineId);
        setPayModalPayer(currentPayer);
    }
    async function deleteFine(id) {
        if (!confirm('Er du sikker på du vil slette denne bøde?'))
            return;
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
        }
        catch (e) {
            setError(e.message || 'Kunne ikke slette bøde');
        }
        finally {
            setLoading(false);
        }
    }
    async function handleWheelResult(multiplier, label) {
        if (!wheelFine)
            return;
        try {
            setLoading(true);
            if (multiplier === 0) {
                // Slet bøden
                const res = await fetch(`/api/fines/${wheelFine.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok)
                    throw new Error('Kunne ikke slette bøde');
            }
            else {
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
                if (!res.ok)
                    throw new Error('Kunne ikke opdatere bøde');
            }
            await load();
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
            setWheelFine(null);
        }
    }
    const displayed = fines.filter(f => {
        if (filter === 'all')
            return true;
        if (filter === 'paid')
            return !!f.paid;
        return !f.paid;
    });
    if (!currentTeam) {
        return (_jsx("div", { className: "fines-page empty", children: _jsxs("div", { className: "empty-state", children: [_jsx("h2", { children: "\uD83D\uDCCB B\u00F8der" }), _jsx("p", { children: "V\u00E6lg eller opret et team for at se b\u00F8der." })] }) }));
    }
    return (_jsxs("div", { className: "fines-page", children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { children: "\uD83C\uDFC6 B\u00F8der" }), _jsxs("p", { children: ["Oversigt over alle b\u00F8der for ", _jsx("span", { className: "team-name", children: currentTeam.name })] })] }), _jsxs("div", { className: "fines-grid", children: [_jsxs("section", { className: "left", children: [isFormand && (_jsxs("div", { className: "card add-fine-card", children: [_jsxs("div", { className: "add-fine-header", children: [_jsx("span", { className: "add-fine-icon", children: "\uD83C\uDFBE" }), _jsx("h2", { children: "Tilf\u00F8j b\u00F8de" })] }), _jsxs("form", { onSubmit: add, className: "add-form", children: [_jsxs("div", { className: "row", children: [_jsxs("select", { "aria-label": "payer", value: payer, onChange: e => setPayer(e.target.value), className: "player-select", children: [_jsx("option", { value: "", children: "V\u00E6lg spiller..." }), members.map(m => (_jsx("option", { value: m.name, children: m.name }, m.user_id)))] }), _jsx("input", { "aria-label": "amount", placeholder: "Bel\u00F8b (kr)", value: amount, onChange: e => setAmount(e.target.value), type: "number", step: "0.01", min: "0" })] }), _jsxs("select", { value: selectedFineType, onChange: e => {
                                                    const id = e.target.value;
                                                    setSelectedFineType(id ? Number(id) : '');
                                                    if (id) {
                                                        const ft = fineTypes.find(f => f.id === Number(id));
                                                        if (ft) {
                                                            setReason(ft.reason);
                                                            setAmount(String(ft.amount));
                                                        }
                                                    }
                                                }, className: "player-select full-width", children: [_jsx("option", { value: "", children: "V\u00E6lg b\u00F8detype..." }), fineTypes.map(ft => (_jsxs("option", { value: ft.id, children: [ft.reason, " (", formatCurrency(ft.amount), ")"] }, ft.id)))] }), _jsx("input", { "aria-label": "reason", placeholder: "Eller skriv egen \u00E5rsag...", value: reason, onChange: e => {
                                                    setReason(e.target.value);
                                                    setSelectedFineType('');
                                                }, className: "reason-input" }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { className: "primary", type: "submit", disabled: loading, children: "Tilf\u00F8j b\u00F8de" }), _jsx("button", { type: "button", onClick: () => {
                                                            setPayer('');
                                                            setAmount('');
                                                            setReason('');
                                                            setSelectedFineType('');
                                                            setError(null);
                                                        }, children: "Ryd" })] }), error && _jsx("div", { className: "error", children: error })] })] })), user && totals.length > 0 && (_jsxs("div", { className: "card personal-summary", children: [_jsx("h2", { children: "\uD83D\uDC64 Dit overblik" }), (() => {
                                        const myTotal = totals.find(t => t.payer === user.name);
                                        const myOutstanding = myTotal ? Number(myTotal.outstanding) : 0;
                                        const myPaid = myTotal ? Number(myTotal.total) - Number(myTotal.outstanding) : 0;
                                        return (_jsxs("div", { className: "personal-stats", children: [_jsxs("div", { className: `personal-outstanding ${myOutstanding > 0 ? 'owes' : 'clear'}`, children: [_jsx("span", { className: "label", children: "Du skylder:" }), _jsx("span", { className: "amount", children: myOutstanding > 0 ? formatCurrency(myOutstanding) : '✓ Intet!' })] }), myPaid > 0 && (_jsx("div", { className: "personal-paid", children: _jsxs("span", { className: "small-label", children: ["Du har betalt ", formatCurrency(myPaid), " i alt"] }) })), myOutstanding === 0 && myPaid === 0 && (_jsx("div", { className: "personal-clean", children: _jsx("span", { className: "small-label", children: "\uD83C\uDF89 Du har ingen b\u00F8der endnu!" }) }))] }));
                                    })()] })), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "\uD83C\uDFC6 Leaderboard" }), totals.length === 0 ? (_jsx("div", { className: "muted", children: "Ingen data endnu" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "team-stats", children: [_jsxs("div", { className: "team-total", children: [_jsx("span", { className: "label", children: "\uD83D\uDCB0 Samlet udest\u00E5ende:" }), _jsx("span", { className: "amount outstanding", children: formatCurrency(totals.reduce((sum, t) => sum + Number(t.outstanding), 0)) })] }), _jsxs("div", { className: "team-total", children: [_jsx("span", { className: "label", children: "\u2705 All-time betalt:" }), _jsx("span", { className: "amount paid", children: formatCurrency(totals.reduce((sum, t) => sum + (Number(t.total) - Number(t.outstanding)), 0)) })] }), _jsxs("div", { className: "team-total grand-total", children: [_jsx("span", { className: "label", children: "\uD83D\uDCCA Total b\u00F8der (all-time):" }), _jsx("span", { className: "amount", children: formatCurrency(totals.reduce((sum, t) => sum + Number(t.total), 0)) })] })] }), _jsx("ul", { className: "leaderboard", children: [...totals]
                                                    .sort((a, b) => Number(b.outstanding) - Number(a.outstanding))
                                                    .map((t, idx) => (_jsxs("li", { className: `leaderboard-item ${Number(t.outstanding) === 0 ? 'paid-up' : ''}`, children: [_jsx("span", { className: "rank", children: idx === 0 && Number(t.outstanding) > 0 ? '🥇' :
                                                                idx === 1 && Number(t.outstanding) > 0 ? '🥈' :
                                                                    idx === 2 && Number(t.outstanding) > 0 ? '🥉' :
                                                                        `${idx + 1}.` }), _jsx("span", { className: "name", children: t.payer }), _jsxs("span", { className: "stats", children: [_jsx("span", { className: `outstanding ${Number(t.outstanding) > 0 ? 'owes' : 'clear'}`, children: Number(t.outstanding) > 0
                                                                        ? formatCurrency(Number(t.outstanding))
                                                                        : '✓ Betalt' }), _jsxs("span", { className: "total-small", children: ["(", formatCurrency(Number(t.total)), " total)"] })] })] }, t.payer))) })] }))] })] }), _jsx("section", { className: "right", children: _jsxs("div", { className: "card", children: [_jsxs("div", { className: "list-header", children: [_jsx("h2", { children: "\uD83C\uDFC6 B\u00F8der" }), _jsxs("div", { className: "filters", children: [_jsxs("label", { children: [_jsx("input", { type: "radio", name: "filter", checked: filter === 'all', onChange: () => setFilter('all') }), ' ', "Alle"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "filter", checked: filter === 'unpaid', onChange: () => setFilter('unpaid') }), ' ', "Ubetalte"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "filter", checked: filter === 'paid', onChange: () => setFilter('paid') }), ' ', "Betalte"] })] })] }), loading && fines.length === 0 ? (_jsx("div", { className: "muted", children: "Indl\u00E6ser..." })) : (_jsxs("table", { className: "fines", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Spiller" }), _jsx("th", { children: "Bel\u00F8b" }), _jsx("th", { children: "\u00C5rsag" }), _jsx("th", { children: "Betalt" }), isFormand && _jsx("th", {})] }) }), _jsx("tbody", { children: displayed.map(f => (_jsxs("tr", { className: f.paid ? 'paid' : '', children: [_jsx("td", { children: f.payer }), _jsx("td", { children: formatCurrency(Number(f.amount)) }), _jsx("td", { className: "reason", children: f.reason }), _jsx("td", { children: f.paid ? `Ja ${f.paid_by ? `(${f.paid_by})` : ''}` : 'Nej' }), isFormand && (_jsxs("td", { className: "actions", children: [!f.paid && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => openPayModal(f.id, f.payer), children: "\u2713 Betalt" }), !f.wheel_used && (_jsx("button", { className: "wheel-btn", onClick: () => setWheelFine(f), children: "\uD83C\uDFB0" }))] })), _jsx("button", { className: "danger", onClick: () => deleteFine(f.id), children: "Slet" })] }))] }, f.id))) })] })), fines.length === 0 && !loading && (_jsxs("div", { className: "muted", children: ["Ingen b\u00F8der endnu ", isFormand ? '— tilføj en ovenfor.' : ''] }))] }) })] }), payModalFineId && (_jsx("div", { className: "modal-overlay", onClick: () => setPayModalFineId(null), children: _jsxs("div", { className: "modal", onClick: e => e.stopPropagation(), children: [_jsx("h3", { children: "\uD83D\uDCB0 Marker som betalt" }), _jsx("p", { className: "modal-subtitle", children: "Hvem har betalt denne b\u00F8de?" }), _jsxs("select", { value: payModalPayer, onChange: e => setPayModalPayer(e.target.value), className: "player-select", autoFocus: true, children: [_jsx("option", { value: "", children: "V\u00E6lg medlem..." }), members.map(m => (_jsx("option", { value: m.name, children: m.name }, m.user_id)))] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "primary", onClick: () => markPaid(payModalFineId, payModalPayer), disabled: !payModalPayer || loading, children: loading ? 'Gemmer...' : 'Bekræft betaling' }), _jsx("button", { onClick: () => setPayModalFineId(null), children: "Annuller" })] })] }) })), _jsx(LuckyWheel, { isOpen: !!wheelFine, onClose: () => setWheelFine(null), onResult: handleWheelResult, fineName: wheelFine?.reason || 'Bøde', fineAmount: wheelFine?.amount || 0, fineId: wheelFine?.id || 0 }), currentTeam?.mobilepay_link && (_jsxs("a", { href: currentTeam.mobilepay_link, target: "_blank", rel: "noopener noreferrer", className: "mobilepay-fab", children: [_jsx("span", { className: "mp-icon", children: "\uD83D\uDCF1" }), _jsx("span", { className: "mp-text", children: "Betal med MobilePay" })] }))] }));
}
