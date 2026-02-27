import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import Sidebar from './Sidebar';
import FinesPage from './FinesPage';
import FineTypesPage from './FineTypesPage';
import TeamPage from './TeamPage';
import LeaguePage from './LeaguePage';
function AppContent() {
    const { user, loading, currentTeam } = useAuth();
    const [page, setPage] = useState('fines');
    if (loading) {
        return (_jsxs("div", { className: "loading-screen", children: [_jsx("div", { className: "loading-spinner", children: "\uD83C\uDFBE" }), _jsx("p", { children: "Indl\u00E6ser..." })] }));
    }
    if (!user) {
        return _jsx(LoginPage, {});
    }
    return (_jsxs("div", { className: "app-layout", children: [_jsx(Sidebar, {}), _jsxs("main", { className: "main-content", children: [_jsxs("nav", { className: "page-nav", children: [_jsx("button", { className: page === 'fines' ? 'active' : '', onClick: () => setPage('fines'), children: "\uD83D\uDCCB B\u00F8der" }), _jsx("button", { className: page === 'fine-types' ? 'active' : '', onClick: () => setPage('fine-types'), children: "\uD83D\uDCDC B\u00F8detyper" }), _jsx("button", { className: page === 'league' ? 'active' : '', onClick: () => setPage('league'), children: "\uD83C\uDFC6 Liga" }), _jsx("button", { className: page === 'team' ? 'active' : '', onClick: () => setPage('team'), children: "\uD83D\uDC65 Team" }), currentTeam && (_jsx("span", { className: "current-team-name", children: currentTeam.name }))] }), page === 'fines' && _jsx(FinesPage, {}), page === 'fine-types' && _jsx(FineTypesPage, {}), page === 'league' && _jsx(LeaguePage, {}), page === 'team' && _jsx(TeamPage, {}), _jsx("footer", { className: "footer", children: "Bygget med \u2764\uFE0F til padel \uD83C\uDFBE" })] })] }));
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(AppContent, {}) }));
}
