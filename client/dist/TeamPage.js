import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
export default function TeamPage() {
    const { currentTeam, token, isFormand, loadTeams, setCurrentTeam } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [mobilepayLink, setMobilepayLink] = useState('');
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (currentTeam) {
            loadMembers();
            setMobilepayLink(currentTeam.mobilepay_link || '');
        }
    }, [currentTeam]);
    async function loadMembers() {
        if (!currentTeam)
            return;
        setLoading(true);
        try {
            const res = await fetch(`/api/teams/${currentTeam.id}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setMembers(await res.json());
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }
    async function changeRole(memberId, newRole) {
        setError('');
        try {
            const res = await fetch(`/api/teams/${currentTeam?.id}/members/${memberId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            await loadMembers();
            await loadTeams();
        }
        catch (err) {
            setError(err.message);
        }
    }
    function copyInviteCode() {
        if (currentTeam) {
            navigator.clipboard.writeText(currentTeam.invite_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }
    async function saveTeamSettings() {
        if (!currentTeam)
            return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/teams/${currentTeam.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ mobilepay_link: mobilepayLink || null })
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            await loadTeams();
            setShowSettings(false);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSaving(false);
        }
    }
    async function deleteTeam() {
        if (!currentTeam)
            return;
        const confirmed = window.confirm(`Er du sikker på du vil slette "${currentTeam.name}"?\n\nDette sletter ALLE bøder, bødetyper og medlemskaber permanent. Denne handling kan ikke fortrydes!`);
        if (!confirmed)
            return;
        const doubleConfirm = window.confirm('SIDSTE ADVARSEL: Alle data vil blive slettet permanent. Fortsæt?');
        if (!doubleConfirm)
            return;
        setError('');
        try {
            const res = await fetch(`/api/teams/${currentTeam.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            setCurrentTeam(null);
            await loadTeams();
        }
        catch (err) {
            setError(err.message);
        }
    }
    if (!currentTeam) {
        return (_jsx("div", { className: "team-page empty", children: _jsxs("div", { className: "empty-state", children: [_jsx("h2", { children: "\uD83C\uDFBE Velkommen til Padel B\u00F8dekasse" }), _jsx("p", { children: "Opret et team eller tilslut dig et eksisterende team for at komme i gang." })] }) }));
    }
    return (_jsxs("div", { className: "team-page", children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { children: "\uD83D\uDC65 Team" }), _jsxs("p", { children: ["Administrer medlemmer i ", _jsx("span", { className: "team-name", children: currentTeam.name })] })] }), _jsxs("div", { className: "team-header", children: [_jsxs("div", { children: [_jsx("h2", { children: currentTeam.name }), _jsxs("p", { className: "team-role", children: ["Du er ", currentTeam.role === 'formand' ? '👑 Formand' : '👤 Medlem'] })] }), _jsxs("div", { className: "team-header-actions", children: [isFormand && (_jsx("button", { className: "settings-btn", onClick: () => setShowSettings(true), children: "\u2699\uFE0F Indstillinger" })), _jsxs("div", { className: "invite-code-box", children: [_jsx("span", { className: "label", children: "Invitationskode:" }), _jsx("code", { className: "invite-code", children: currentTeam.invite_code }), _jsx("button", { className: "copy-btn", onClick: copyInviteCode, children: copied ? '✓ Kopieret!' : '📋 Kopier' })] })] })] }), error && _jsx("div", { className: "error", children: error }), _jsxs("div", { className: "card", children: [_jsxs("h3", { children: ["Medlemmer (", members.length, ")"] }), loading ? (_jsx("p", { className: "muted", children: "Indl\u00E6ser..." })) : (_jsx("ul", { className: "members-list", children: members.map(member => (_jsxs("li", { className: "member-item", children: [_jsx("div", { className: "member-avatar", children: member.name.charAt(0).toUpperCase() }), _jsxs("div", { className: "member-info", children: [_jsx("span", { className: "member-name", children: member.name }), _jsx("span", { className: "member-email", children: member.email })] }), _jsx("div", { className: "member-role", children: member.role === 'formand' ? (_jsx("span", { className: "badge formand", children: "\uD83D\uDC51 Formand" })) : (_jsx("span", { className: "badge member", children: "Medlem" })) }), isFormand && member.role !== 'formand' && (_jsx("button", { className: "small-btn", onClick: () => changeRole(member.id, 'formand'), children: "G\u00F8r til formand" })), isFormand && member.role === 'formand' && member.user_id !== currentTeam?.created_by && (_jsx("button", { className: "small-btn danger-btn", onClick: () => changeRole(member.id, 'member'), children: "Fjern formand" }))] }, member.id))) }))] }), _jsxs("div", { className: "team-info", children: [_jsxs("p", { className: "muted", children: ["\uD83D\uDCA1 ", _jsx("strong", { children: "Tip:" }), " Del invitationskoden med dine medspillere s\u00E5 de kan tilslutte sig teamet."] }), isFormand && (_jsxs("p", { className: "muted", children: ["\uD83D\uDC51 ", _jsx("strong", { children: "Som formand" }), " kan du give b\u00F8der og markere dem som betalt."] }))] }), showSettings && (_jsx("div", { className: "modal-overlay", onClick: () => setShowSettings(false), children: _jsxs("div", { className: "modal", onClick: e => e.stopPropagation(), children: [_jsx("h2", { children: "\u2699\uFE0F Team indstillinger" }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "MobilePay Box link" }), _jsx("input", { type: "url", value: mobilepayLink, onChange: e => setMobilepayLink(e.target.value), placeholder: "https://qr.mobilepay.dk/box/..." }), _jsx("small", { className: "form-hint", children: "Inds\u00E6t dit MobilePay Box link s\u00E5 medlemmer kan betale direkte" })] }), error && _jsx("div", { className: "error", children: error }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", onClick: () => setShowSettings(false), children: "Annuller" }), _jsx("button", { className: "primary", onClick: saveTeamSettings, disabled: saving, children: saving ? 'Gemmer...' : 'Gem indstillinger' })] }), _jsx("hr", { className: "modal-divider" }), _jsxs("div", { className: "danger-zone", children: [_jsx("h3", { children: "\u26A0\uFE0F Farezone" }), _jsx("p", { className: "muted", children: "Disse handlinger kan ikke fortrydes." }), _jsx("button", { className: "danger-btn full-width", onClick: deleteTeam, children: "\uD83D\uDDD1\uFE0F Slet team permanent" })] })] }) }))] }));
}
