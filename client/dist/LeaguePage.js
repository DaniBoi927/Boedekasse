import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
export default function LeaguePage() {
    const { currentTeam, token, isFormand } = useAuth();
    const [leagueData, setLeagueData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSetup, setShowSetup] = useState(false);
    const [showAddMatch, setShowAddMatch] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    // Setup form
    const [rankedinUrl, setRankedinUrl] = useState('');
    const [teamName, setTeamName] = useState('');
    const [poolName, setPoolName] = useState('');
    const [saving, setSaving] = useState(false);
    // Inline editing
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);
    // New team row
    const [addingTeam, setAddingTeam] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', points: '', played: '', wins: '', sets: '' });
    // Match form
    const [matchForm, setMatchForm] = useState({
        round: 1, date: '', time: '', homeTeam: '', awayTeam: '', result: '', location: ''
    });
    useEffect(() => {
        if (currentTeam) {
            loadLeagueData();
        }
    }, [currentTeam]);
    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingCell]);
    async function loadLeagueData() {
        if (!currentTeam)
            return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/teams/${currentTeam.id}/league`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 404) {
                setLeagueData(null);
                return;
            }
            if (!res.ok) {
                throw new Error('Kunne ikke hente liga data');
            }
            const data = await res.json();
            setLeagueData(data);
            setRankedinUrl(data.rankedinUrl || '');
            setTeamName(data.teamName || '');
            setPoolName(data.poolName || '');
        }
        catch (err) {
            console.error('Load league error:', err);
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    async function saveSettings() {
        if (!currentTeam)
            return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/teams/${currentTeam.id}/league`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    rankedin_url: rankedinUrl,
                    team_name: teamName,
                    poolName: poolName
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            setShowSetup(false);
            await loadLeagueData();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSaving(false);
        }
    }
    // Start editing a cell
    function startEdit(position, field, currentValue) {
        if (!isFormand)
            return;
        setEditingCell({ position, field });
        setEditValue(String(currentValue));
    }
    // Save inline edit
    async function saveInlineEdit() {
        if (!editingCell || !currentTeam || !leagueData)
            return;
        const team = leagueData.standings.find(t => t.position === editingCell.position);
        if (!team)
            return;
        const updatedTeam = { ...team };
        const field = editingCell.field;
        if (field === 'points' || field === 'played') {
            updatedTeam[field] = parseInt(editValue) || 0;
        }
        else if (field === 'isCurrentTeam') {
            updatedTeam.isCurrentTeam = editValue === 'true';
        }
        else {
            updatedTeam[field] = editValue;
        }
        try {
            // Delete old and add updated
            await fetch(`/api/teams/${currentTeam.id}/league/standing/${team.position}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetch(`/api/teams/${currentTeam.id}/league/standing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updatedTeam)
            });
            setEditingCell(null);
            await loadLeagueData();
        }
        catch (err) {
            setError(err.message);
        }
    }
    function handleKeyDown(e) {
        if (e.key === 'Enter') {
            saveInlineEdit();
        }
        else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    }
    // Add new team row
    async function addTeamRow() {
        if (!currentTeam || !newTeam.name.trim())
            return;
        setSaving(true);
        try {
            const res = await fetch(`/api/teams/${currentTeam.id}/league/standing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    position: (leagueData?.standings.length || 0) + 1,
                    name: newTeam.name,
                    points: parseInt(newTeam.points) || 0,
                    played: parseInt(newTeam.played) || 0,
                    wins: newTeam.wins || '0-0',
                    sets: newTeam.sets || '0-0',
                    isCurrentTeam: false
                })
            });
            if (!res.ok)
                throw new Error('Kunne ikke tilføje hold');
            setAddingTeam(false);
            setNewTeam({ name: '', points: '', played: '', wins: '', sets: '' });
            await loadLeagueData();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSaving(false);
        }
    }
    async function deleteStanding(position) {
        if (!currentTeam || !confirm('Slet dette hold?'))
            return;
        try {
            const res = await fetch(`/api/teams/${currentTeam.id}/league/standing/${position}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok)
                throw new Error('Kunne ikke slette');
            await loadLeagueData();
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function toggleCurrentTeam(position) {
        if (!currentTeam || !leagueData)
            return;
        const team = leagueData.standings.find(t => t.position === position);
        if (!team)
            return;
        try {
            await fetch(`/api/teams/${currentTeam.id}/league/standing/${position}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetch(`/api/teams/${currentTeam.id}/league/standing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ...team, isCurrentTeam: !team.isCurrentTeam })
            });
            await loadLeagueData();
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function addMatch() {
        if (!currentTeam)
            return;
        setSaving(true);
        try {
            const res = await fetch(`/api/teams/${currentTeam.id}/league/match`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(matchForm)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            setShowAddMatch(false);
            setMatchForm({ round: (leagueData?.matches.length || 0) + 1, date: '', time: '', homeTeam: '', awayTeam: '', result: '', location: '' });
            await loadLeagueData();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSaving(false);
        }
    }
    async function deleteMatch(matchId) {
        if (!currentTeam || !confirm('Slet denne kamp?'))
            return;
        try {
            const res = await fetch(`/api/teams/${currentTeam.id}/league/match/${matchId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok)
                throw new Error('Kunne ikke slette');
            await loadLeagueData();
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function updateMatch() {
        if (!currentTeam || !editingMatch)
            return;
        setSaving(true);
        try {
            // Delete and recreate with updated data
            await fetch(`/api/teams/${currentTeam.id}/league/match/${editingMatch.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const res = await fetch(`/api/teams/${currentTeam.id}/league/match`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    round: editingMatch.round,
                    date: editingMatch.date,
                    time: editingMatch.time,
                    homeTeam: editingMatch.homeTeam,
                    awayTeam: editingMatch.awayTeam,
                    result: editingMatch.result || '',
                    location: editingMatch.location
                })
            });
            if (!res.ok)
                throw new Error('Kunne ikke opdatere');
            setEditingMatch(null);
            await loadLeagueData();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSaving(false);
        }
    }
    function startEditMatch(match) {
        setEditingMatch({ ...match });
    }
}
if (!currentTeam) {
    return (_jsx("div", { className: "league-page", children: _jsxs("div", { className: "empty-state", children: [_jsx("span", { className: "icon", children: "\uD83C\uDFC6" }), _jsx("p", { children: "V\u00E6lg et hold for at se liga" })] }) }));
}
if (loading) {
    return (_jsx("div", { className: "league-page", children: _jsxs("div", { className: "loading-state", children: [_jsx("span", { className: "loading-spinner", children: "\uD83C\uDFD0" }), _jsx("p", { children: "Indl\u00E6ser liga..." })] }) }));
}
// Setup modal
if (showSetup) {
    return (_jsxs("div", { className: "league-page", children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { children: "\uD83C\uDFC6 Liga" }), _jsx("p", { children: "Konfigurer din liga" })] }), _jsxs("div", { className: "card league-setup-card", children: [_jsx("h2", { children: "\u2699\uFE0F Liga Ops\u00E6tning" }), error && _jsx("div", { className: "error-banner", children: error }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Pulje/Serie navn" }), _jsx("input", { type: "text", placeholder: "Fx '\u00D8st - Serie 6 - B'", value: poolName, onChange: e => setPoolName(e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Dit holdnavn (bruges til at markere jeres hold)" }), _jsx("input", { type: "text", placeholder: "Fx 'Bajer F\u00F8r Bandeja'", value: teamName, onChange: e => setTeamName(e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Rankedin URL (valgfri)" }), _jsx("input", { type: "url", placeholder: "https://www.rankedin.com/...", value: rankedinUrl, onChange: e => setRankedinUrl(e.target.value) })] }), _jsxs("div", { className: "button-row", children: [_jsx("button", { className: "primary", onClick: saveSettings, disabled: saving, children: saving ? 'Gemmer...' : '💾 Gem' }), _jsx("button", { onClick: () => setShowSetup(false), children: "Annuller" })] })] })] }));
}
// Add match modal - simplified
if (showAddMatch) {
    // Get team names from standings for dropdown
    const teamOptions = leagueData?.standings.map(s => s.name) || [];
    return (_jsx("div", { className: "match-form-overlay", onClick: (e) => e.target === e.currentTarget && setShowAddMatch(false), children: _jsxs("div", { className: "match-form-card", children: [_jsx("button", { className: "close-btn", onClick: () => setShowAddMatch(false), children: "\u00D7" }), _jsx("h2", { children: "\uD83D\uDCC5 Ny kamp" }), error && _jsx("div", { className: "error-banner", children: error }), _jsxs("div", { className: "match-form-teams", children: [_jsxs("select", { className: "team-select home", value: matchForm.homeTeam, onChange: e => setMatchForm({ ...matchForm, homeTeam: e.target.value }), children: [_jsx("option", { value: "", children: "Hjemmehold" }), teamOptions.map(team => (_jsx("option", { value: team, children: team }, team)))] }), _jsx("span", { className: "vs-badge", children: "VS" }), _jsxs("select", { className: "team-select away", value: matchForm.awayTeam, onChange: e => setMatchForm({ ...matchForm, awayTeam: e.target.value }), children: [_jsx("option", { value: "", children: "Udehold" }), teamOptions.map(team => (_jsx("option", { value: team, children: team }, team)))] })] }), _jsxs("div", { className: "match-form-datetime", children: [_jsx("input", { type: "date", className: "date-input", value: matchForm.date, onChange: e => setMatchForm({ ...matchForm, date: e.target.value }) }), _jsx("input", { type: "time", className: "time-input", value: matchForm.time, onChange: e => setMatchForm({ ...matchForm, time: e.target.value }) })] }), _jsx("div", { className: "match-form-location", children: _jsx("input", { value: matchForm.location, onChange: e => setMatchForm({ ...matchForm, location: e.target.value }), placeholder: "\uD83D\uDCCD Lokation (valgfri)" }) }), _jsx("div", { className: "match-form-result", children: _jsx("input", { value: matchForm.result, onChange: e => setMatchForm({ ...matchForm, result: e.target.value }), placeholder: "Resultat (tom = kommende kamp)" }) }), _jsx("button", { className: "primary full-width", onClick: addMatch, disabled: saving || !matchForm.homeTeam || !matchForm.awayTeam, children: saving ? 'Gemmer...' : '✓ Tilføj kamp' })] }) }));
}
// Edit match modal
if (editingMatch) {
    const teamOptions = leagueData?.standings.map(s => s.name) || [];
    return (_jsx("div", { className: "match-form-overlay", onClick: (e) => e.target === e.currentTarget && setEditingMatch(null), children: _jsxs("div", { className: "match-form-card", children: [_jsx("button", { className: "close-btn", onClick: () => setEditingMatch(null), children: "\u00D7" }), _jsx("h2", { children: "\u270F\uFE0F Rediger kamp" }), error && _jsx("div", { className: "error-banner", children: error }), _jsxs("div", { className: "match-form-teams", children: [_jsxs("select", { className: "team-select home", value: editingMatch.homeTeam, onChange: e => setEditingMatch({ ...editingMatch, homeTeam: e.target.value }), children: [_jsx("option", { value: "", children: "Hjemmehold" }), teamOptions.map(team => (_jsx("option", { value: team, children: team }, team)))] }), _jsx("span", { className: "vs-badge", children: "VS" }), _jsxs("select", { className: "team-select away", value: editingMatch.awayTeam, onChange: e => setEditingMatch({ ...editingMatch, awayTeam: e.target.value }), children: [_jsx("option", { value: "", children: "Udehold" }), teamOptions.map(team => (_jsx("option", { value: team, children: team }, team)))] })] }), _jsxs("div", { className: "match-form-datetime", children: [_jsx("input", { type: "date", className: "date-input", value: editingMatch.date, onChange: e => setEditingMatch({ ...editingMatch, date: e.target.value }) }), _jsx("input", { type: "time", className: "time-input", value: editingMatch.time, onChange: e => setEditingMatch({ ...editingMatch, time: e.target.value }) })] }), _jsx("div", { className: "match-form-location", children: _jsx("input", { value: editingMatch.location, onChange: e => setEditingMatch({ ...editingMatch, location: e.target.value }), placeholder: "\uD83D\uDCCD Lokation (valgfri)" }) }), _jsx("div", { className: "match-form-result", children: _jsx("input", { value: editingMatch.result || '', onChange: e => setEditingMatch({ ...editingMatch, result: e.target.value }), placeholder: "Resultat (tom = kommende kamp)" }) }), _jsx("button", { className: "primary full-width", onClick: updateMatch, disabled: saving || !editingMatch.homeTeam || !editingMatch.awayTeam, children: saving ? 'Gemmer...' : '✓ Gem ændringer' })] }) }));
}
// No league data yet
if (!leagueData) {
    return (_jsx("div", { className: "league-page empty", children: _jsx("div", { className: "card league-setup-card", children: _jsxs("div", { className: "empty-state", children: [_jsx("span", { className: "icon", children: "\uD83D\uDCCA" }), _jsx("p", { children: "Liga er ikke konfigureret endnu" }), isFormand ? (_jsx("button", { className: "primary", onClick: () => setShowSetup(true), children: "\u2699\uFE0F Ops\u00E6t liga" })) : (_jsx("p", { className: "hint", children: "Bed en formand om at tilf\u00F8je liga-information" }))] }) }) }));
}
const upcomingMatches = leagueData.matches.filter(m => m.isUpcoming);
const playedMatches = leagueData.matches.filter(m => !m.isUpcoming);
// Render editable cell
function renderCell(team, field, value, className = '') {
    const isEditing = editingCell?.position === team.position && editingCell?.field === field;
    if (isEditing) {
        return (_jsx("td", { className: className, children: _jsx("input", { ref: inputRef, className: "inline-edit-input", value: editValue, onChange: e => setEditValue(e.target.value), onBlur: saveInlineEdit, onKeyDown: handleKeyDown }) }));
    }
    return (_jsxs("td", { className: `${className} ${isFormand ? 'editable' : ''}`, onClick: () => startEdit(team.position, field, value), children: [field === 'name' && team.isCurrentTeam && _jsx("span", { className: "team-marker", children: "\u25CF" }), value] }));
}
return (_jsxs("div", { className: "league-page", children: [_jsx("div", { className: "page-header", children: _jsxs("h1", { children: ["\uD83C\uDFC6 ", leagueData.poolName || 'Liga'] }) }), isFormand && (_jsx("button", { className: "settings-btn league-settings-btn", onClick: () => setShowSetup(true), children: "\u2699\uFE0F" })), error && _jsx("div", { className: "error-banner", children: error }), leagueData.rankedinUrl && (_jsx("a", { href: leagueData.rankedinUrl, target: "_blank", rel: "noopener noreferrer", className: "rankedin-link", children: "\uD83D\uDD17 Se p\u00E5 Rankedin" })), _jsxs("div", { className: "league-grid", children: [_jsxs("div", { className: "card standings-card", children: [_jsx("div", { className: "card-header-row", children: _jsx("h2", { children: "\uD83D\uDCCA Tabel" }) }), _jsx("div", { className: "standings-table-wrapper", children: _jsxs("table", { className: "standings-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "pos", children: "#" }), _jsx("th", { className: "team", children: "Hold" }), _jsx("th", { className: "pts", children: "P" }), _jsx("th", { className: "played", children: "S" }), _jsx("th", { className: "wins", children: "M" }), _jsx("th", { className: "sets", children: "S\u00E6t" }), isFormand && _jsx("th", { className: "actions" })] }) }), _jsxs("tbody", { children: [leagueData.standings.map(team => (_jsxs("tr", { className: team.isCurrentTeam ? 'current-team' : '', children: [_jsxs("td", { className: "pos", children: [team.position, "."] }), renderCell(team, 'name', team.name, 'team'), renderCell(team, 'points', team.points, 'pts'), renderCell(team, 'played', team.played, 'played'), renderCell(team, 'wins', team.wins, 'wins'), renderCell(team, 'sets', team.sets, 'sets'), isFormand && (_jsxs("td", { className: "actions", children: [_jsx("button", { className: `star-btn ${team.isCurrentTeam ? 'active' : ''}`, onClick: () => toggleCurrentTeam(team.position), title: "Marker som vores hold", children: "\u2605" }), _jsx("button", { className: "delete-btn-small", onClick: () => deleteStanding(team.position), children: "\uD83D\uDDD1\uFE0F" })] }))] }, team.position))), isFormand && addingTeam && (_jsxs("tr", { className: "adding-row", children: [_jsxs("td", { className: "pos", children: [(leagueData.standings.length || 0) + 1, "."] }), _jsx("td", { className: "team", children: _jsx("input", { className: "inline-edit-input", placeholder: "Holdnavn", value: newTeam.name, onChange: e => setNewTeam({ ...newTeam, name: e.target.value }), autoFocus: true }) }), _jsx("td", { className: "pts", children: _jsx("input", { className: "inline-edit-input small", placeholder: "0", value: newTeam.points, onChange: e => setNewTeam({ ...newTeam, points: e.target.value }) }) }), _jsx("td", { className: "played", children: _jsx("input", { className: "inline-edit-input small", placeholder: "0", value: newTeam.played, onChange: e => setNewTeam({ ...newTeam, played: e.target.value }) }) }), _jsx("td", { className: "wins", children: _jsx("input", { className: "inline-edit-input small", placeholder: "0-0", value: newTeam.wins, onChange: e => setNewTeam({ ...newTeam, wins: e.target.value }) }) }), _jsx("td", { className: "sets", children: _jsx("input", { className: "inline-edit-input small", placeholder: "0-0", value: newTeam.sets, onChange: e => setNewTeam({ ...newTeam, sets: e.target.value }) }) }), _jsxs("td", { className: "actions", children: [_jsx("button", { className: "save-btn", onClick: addTeamRow, disabled: !newTeam.name.trim(), children: "\u2713" }), _jsx("button", { className: "cancel-btn", onClick: () => { setAddingTeam(false); setNewTeam({ name: '', points: '', played: '', wins: '', sets: '' }); }, children: "\u2715" })] })] }))] })] }) }), isFormand && !addingTeam && (_jsx("button", { className: "add-row-btn", onClick: () => setAddingTeam(true), children: "+ Tilf\u00F8j hold" })), leagueData.lastUpdated && (_jsxs("div", { className: "last-updated", children: ["Opdateret: ", new Date(leagueData.lastUpdated).toLocaleDateString('da-DK')] }))] }), _jsxs("div", { className: "card matches-card", children: [_jsxs("div", { className: "card-header-row", children: [_jsx("h2", { children: "\uD83D\uDCC5 Kampe" }), isFormand && (_jsx("button", { className: "small-btn", onClick: () => {
                                        setMatchForm({ round: (leagueData.matches.length || 0) + 1, date: '', time: '', homeTeam: '', awayTeam: '', result: '', location: '' });
                                        setShowAddMatch(true);
                                    }, children: "+" }))] }), leagueData.matches.length === 0 ? (_jsx("div", { className: "empty-state small", children: _jsx("p", { children: "Ingen kampe" }) })) : (_jsxs("div", { className: "matches-list", children: [upcomingMatches.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { className: "matches-section-title", children: "Kommende" }), upcomingMatches.map(match => (_jsxs("div", { className: `match-item ${match.involvesCurrentTeam ? 'our-match' : ''} ${isFormand ? 'clickable' : ''}`, onClick: () => isFormand && startEditMatch(match), children: [_jsxs("div", { className: "match-header", children: [_jsxs("span", { className: "match-round", children: ["R", match.round] }), _jsxs("span", { className: "match-date", children: [match.date, " ", match.time && `${match.time}`] }), isFormand && (_jsx("button", { className: "delete-btn-small", onClick: (e) => { e.stopPropagation(); deleteMatch(match.id); }, children: "\u00D7" }))] }), _jsxs("div", { className: "match-teams", children: [_jsx("span", { className: `home-team ${match.homeTeam.toLowerCase() === teamName?.toLowerCase() ? 'our-team' : ''}`, children: match.homeTeam }), _jsx("span", { className: "vs", children: "vs" }), _jsx("span", { className: `away-team ${match.awayTeam.toLowerCase() === teamName?.toLowerCase() ? 'our-team' : ''}`, children: match.awayTeam })] }), match.location && (_jsx("div", { className: "match-location", children: match.location }))] }, match.id)))] })), playedMatches.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { className: "matches-section-title", children: "Spillede" }), playedMatches.map(match => (_jsxs("div", { className: `match-item played ${match.involvesCurrentTeam ? 'our-match' : ''} ${isFormand ? 'clickable' : ''}`, onClick: () => isFormand && startEditMatch(match), children: [_jsxs("div", { className: "match-header", children: [_jsxs("span", { className: "match-round", children: ["R", match.round] }), _jsx("span", { className: "match-date", children: match.date }), isFormand && (_jsx("button", { className: "delete-btn-small", onClick: (e) => { e.stopPropagation(); deleteMatch(match.id); }, children: "\u00D7" }))] }), _jsxs("div", { className: "match-teams", children: [_jsx("span", { className: `home-team ${match.homeTeam.toLowerCase() === teamName?.toLowerCase() ? 'our-team' : ''}`, children: match.homeTeam }), _jsx("span", { className: "match-result", children: match.result }), _jsx("span", { className: `away-team ${match.awayTeam.toLowerCase() === teamName?.toLowerCase() ? 'our-team' : ''}`, children: match.awayTeam })] })] }, match.id)))] }))] }))] })] })] }));
