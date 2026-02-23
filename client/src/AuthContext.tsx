import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type User = {
  id: number;
  email: string;
  name: string;
};

type Team = {
  id: number;
  name: string;
  invite_code: string;
  role: string;
  member_count: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  teams: Team[];
  currentTeam: Team | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadTeams: () => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
  isFormand: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const isFormand = currentTeam?.role === 'formand';

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
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
      } else {
        logout();
      }
    } catch (err) {
      console.error('Load user error:', err);
      logout();
    } finally {
      setLoading(false);
    }
  }

  async function loadTeams() {
    if (!token) return;
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
          const savedTeam = teamsData.find((t: Team) => t.id === Number(savedTeamId));
          setCurrentTeam(savedTeam || teamsData[0]);
        }
      }
    } catch (err) {
      console.error('Load teams error:', err);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(email: string, password: string, name: string) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
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

  function handleSetCurrentTeam(team: Team | null) {
    setCurrentTeam(team);
    if (team) {
      localStorage.setItem('currentTeamId', String(team.id));
    }
  }

  return (
    <AuthContext.Provider value={{
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
