import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [teams, setTeams] = useState([]);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const isFormand = currentTeam?.role === 'formand';
    useEffect(() => {
        if (token) {
            loadUser();
        }
        else {
            setLoading(false);
        }
    }, [token]);
    async function loadUser() {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                await loadTeams();
            }
            else {
                logout();
            }
        }
        catch (err) {
            console.error('Load user error:', err);
            logout();
        }
        finally {
            setLoading(false);
        }
    }
    async function loadTeams() {
        if (!token)
            return;
        try {
            const res = await fetch('/api/teams/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const teamsData = await res.json();
                setTeams(teamsData);
                // Set first team as current if none selected
                if (teamsData.length > 0 && !currentTeam) {
                    const savedTeamId = localStorage.getItem('currentTeamId');
                    const savedTeam = teamsData.find((t) => t.id === Number(savedTeamId));
                    setCurrentTeam(savedTeam || teamsData[0]);
                }
            }
        }
        catch (err) {
            console.error('Load teams error:', err);
        }
    }
    async function login(email, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok)
            throw new Error(data.error);
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
    }
    async function register(email, password, name) {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        const data = await res.json();
        if (!res.ok)
            throw new Error(data.error);
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
    }
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('currentTeamId');
        setToken(null);
        setUser(null);
        setTeams([]);
        setCurrentTeam(null);
    }
    function handleSetCurrentTeam(team) {
        setCurrentTeam(team);
        if (team) {
            localStorage.setItem('currentTeamId', String(team.id));
        }
    }
    return (_jsx(AuthContext.Provider, { value: {
            user,
            token,
            teams,
            currentTeam,
            loading,
            login,
            register,
            logout,
            loadTeams,
            setCurrentTeam: handleSetCurrentTeam,
            isFormand
        }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error('useAuth must be used within AuthProvider');
    return context;
}
