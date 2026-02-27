import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from './AuthContext';
export default function Sidebar() {
    const { user, teams, currentTeam, setCurrentTeam, logout, loadTeams, token } = useAuth();
    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [showJoinTeam, setShowJoinTeam] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [mobilepayLink, setMobilepayLink] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function createTeam(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: teamName, mobilepay_link: mobilepayLink || null })
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            await loadTeams();
            setTeamName('');
            setMobilepayLink('');
            setShowCreateTeam(false);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    async function joinTeam(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/teams/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ invite_code: inviteCode })
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            await loadTeams();
            setInviteCode('');
            setShowJoinTeam(false);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("aside", { className: "sidebar", children: [_jsx("div", { className: "sidebar-header", children: _jsx("h1", { children: "\uD83C\uDFBE Padel B\u00F8dekasse" }) }), _jsxs("div", { className: "sidebar-user", children: [_jsx("div", { className: "user-avatar", children: user?.name?.charAt(0).toUpperCase() }), _jsxs("div", { className: "user-info", children: [_jsx("span", { className: "user-name", children: user?.name }), _jsx("span", { className: "user-email", children: user?.email })] })] }), _jsx("nav", { className: "sidebar-nav", children: _jsxs("div", { className: "nav-section", children: [_jsx("h3", { children: "Mine Teams" }), _jsx("ul", { className: "team-list", children: teams.map(team => (_jsx("li", { children: _jsxs("button", { className: `team-item ${currentTeam?.id === team.id ? 'active' : ''}`, onClick: () => setCurrentTeam(team), children: [_jsx("span", { className: "team-name", children: team.name }), team.role === 'formand' && _jsx("span", { className: "badge", children: "Formand" })] }) }, team.id))) }), _jsxs("div", { className: "team-actions", children: [_jsx("button", { className: "small-btn", onClick: () => setShowCreateTeam(true), children: "+ Opret team" }), _jsx("button", { className: "small-btn", onClick: () => setShowJoinTeam(true), children: "\uD83D\uDD17 Tilslut team" })] })] }) }), _jsx("div", { className: "sidebar-footer", children: _jsx("button", { className: "logout-btn", onClick: logout, children: "Log ud" }) }), showCreateTeam && (_jsx("div", { className: "modal-overlay", onClick: () => setShowCreateTeam(false), children: _jsxs("div", { className: "modal", onClick: e => e.stopPropagation(), children: [_jsx("h2", { children: "Opret nyt team" }), _jsxs("form", { onSubmit: createTeam, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "teamName", children: "Team navn" }), _jsx("input", { id: "teamName", type: "text", value: teamName, onChange: e => setTeamName(e.target.value), placeholder: "F.eks. Padel Mandagsholdet", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "mobilepayLink", children: "MobilePay Box link (valgfrit)" }), _jsx("input", { id: "mobilepayLink", type: "url", value: mobilepayLink, onChange: e => setMobilepayLink(e.target.value), placeholder: "https://qr.mobilepay.dk/box/..." }), _jsx("small", { className: "form-hint", children: "Inds\u00E6t dit MobilePay Box link s\u00E5 medlemmer kan betale direkte" })] }), error && _jsx("div", { className: "error", children: error }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", onClick: () => setShowCreateTeam(false), children: "Annuller" }), _jsx("button", { type: "submit", className: "primary", disabled: loading, children: loading ? 'Opretter...' : 'Opret team' })] })] }), _jsx("p", { className: "modal-note", children: "Du bliver automatisk formand for teamet og kan invitere andre." })] }) })), showJoinTeam && (_jsx("div", { className: "modal-overlay", onClick: () => setShowJoinTeam(false), children: _jsxs("div", { className: "modal", onClick: e => e.stopPropagation(), children: [_jsx("h2", { children: "Tilslut et team" }), _jsxs("form", { onSubmit: joinTeam, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "inviteCode", children: "Invitationskode" }), _jsx("input", { id: "inviteCode", type: "text", value: inviteCode, onChange: e => setInviteCode(e.target.value.toUpperCase()), placeholder: "F.eks. A1B2C3D4", required: true })] }), error && _jsx("div", { className: "error", children: error }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", onClick: () => setShowJoinTeam(false), children: "Annuller" }), _jsx("button", { type: "submit", className: "primary", disabled: loading, children: loading ? 'Tilslutter...' : 'Tilslut team' })] })] }), _jsx("p", { className: "modal-note", children: "Sp\u00F8rg din formand om teamets invitationskode." })] }) }))] }));
}
