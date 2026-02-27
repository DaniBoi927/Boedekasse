import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
export default function FineTypesPage() {
    const { currentTeam, token, isFormand } = useAuth();
    const [fineTypes, setFineTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newReason, setNewReason] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [editingFineType, setEditingFineType] = useState(null);
    function formatCurrency(v) {
        return v.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
    }
    async function load() {
        if (!currentTeam)
            return;
        try {
            setLoading(true);
            const res = await fetch(`/api/fines/types/team/${currentTeam.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
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
    async function addFineType(e) {
        e.preventDefault();
        if (!newReason.trim() || !newAmount)
            return;
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
            if (!res.ok)
                throw new Error(data.error);
            setNewReason('');
            setNewAmount('');
            await load();
        }
        catch (e) {
            setError(e.message);
        }
    }
    async function updateFineType() {
        if (!editingFineType)
            return;
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
            if (!res.ok)
                throw new Error(data.error);
            setEditingFineType(null);
            await load();
        }
        catch (e) {
            setError(e.message);
        }
    }
    async function deleteFineType(id) {
        if (!confirm('Er du sikker på du vil slette denne bødetype?'))
            return;
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
        }
        catch (e) {
            setError(e.message);
        }
    }
    if (!currentTeam) {
        return (_jsx("div", { className: "fine-types-page empty", children: _jsxs("div", { className: "empty-state", children: [_jsx("h2", { children: "\uD83D\uDCCB B\u00F8detyper" }), _jsx("p", { children: "V\u00E6lg eller opret et team for at se b\u00F8detyper." })] }) }));
    }
    return (_jsxs("div", { className: "fine-types-page", children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { children: "\uD83D\uDCCB B\u00F8detyper" }), _jsxs("p", { children: ["Her kan du se alle b\u00F8detyper for ", _jsx("span", { className: "team-name", children: currentTeam.name })] })] }), error && _jsx("div", { className: "error-banner", children: error }), _jsxs("div", { className: "card add-fine-type-card", children: [_jsx("h2", { children: "\u2795 Opret ny b\u00F8detype" }), _jsx("form", { onSubmit: addFineType, className: "add-fine-type-form-large", children: _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u00C5rsag" }), _jsx("input", { placeholder: "Fx 'Kom for sent', 'Glemte bold'...", value: newReason, onChange: e => setNewReason(e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Bel\u00F8b (kr)" }), _jsx("input", { type: "number", placeholder: "50", value: newAmount, onChange: e => setNewAmount(e.target.value), step: "0.01", min: "0" })] }), _jsx("button", { type: "submit", className: "primary", disabled: loading, children: "+ Tilf\u00F8j b\u00F8detype" })] }) })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "\uD83D\uDCDC Alle b\u00F8detyper" }), loading && fineTypes.length === 0 ? (_jsx("div", { className: "muted", children: "Indl\u00E6ser..." })) : fineTypes.length === 0 ? (_jsxs("div", { className: "empty-fine-types", children: [_jsx("span", { className: "icon", children: "\uD83D\uDCDD" }), _jsx("p", { children: "Ingen b\u00F8detyper oprettet endnu" }), _jsx("p", { className: "hint", children: "Opret den f\u00F8rste b\u00F8detype ovenfor!" })] })) : (_jsx("div", { className: "fine-types-grid", children: fineTypes.map(ft => (_jsx("div", { className: "fine-type-card", children: editingFineType?.id === ft.id ? (_jsxs("div", { className: "fine-type-edit-mode", children: [_jsx("input", { value: editingFineType.reason, onChange: e => setEditingFineType({ ...editingFineType, reason: e.target.value }), className: "edit-input" }), _jsx("input", { type: "number", value: editingFineType.amount, onChange: e => setEditingFineType({ ...editingFineType, amount: Number(e.target.value) }), className: "edit-input amount" }), _jsxs("div", { className: "edit-actions", children: [_jsx("button", { onClick: updateFineType, className: "save-btn", children: "\u2713 Gem" }), _jsx("button", { onClick: () => setEditingFineType(null), className: "cancel-btn", children: "\u2715 Annuller" })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "fine-type-info", children: [_jsx("span", { className: "fine-type-reason", children: ft.reason }), _jsx("span", { className: "fine-type-amount", children: formatCurrency(ft.amount) })] }), isFormand && (_jsxs("div", { className: "fine-type-actions", children: [_jsx("button", { onClick: () => setEditingFineType(ft), className: "edit-btn", children: "\u270F\uFE0F Rediger" }), _jsx("button", { onClick: () => deleteFineType(ft.id), className: "delete-btn", children: "\uD83D\uDDD1\uFE0F Slet" })] }))] })) }, ft.id))) }))] })] }));
}
