import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err: any) {
      setError(err.message || 'Der skete en fejl');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🎾 Padel Bødekasse</h1>
          <p>Hold styr på bøderne — hvem skylder hvad på banen!</p>
        </div>

        <div className="login-card">
          <div className="login-tabs">
            <button 
              className={isLogin ? 'active' : ''} 
              onClick={() => setIsLogin(true)}
            >
              Log ind
            </button>
            <button 
              className={!isLogin ? 'active' : ''} 
              onClick={() => setIsLogin(false)}
            >
              Opret konto
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name">Navn</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Dit navn"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="din@email.dk"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && <div className="error">{error}</div>}

            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Vent...' : (isLogin ? 'Log ind' : 'Opret konto')}
            </button>
          </form>
        </div>

        <p className="login-footer">
          {isLogin ? 'Har du ikke en konto?' : 'Har du allerede en konto?'}{' '}
          <button className="link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Opret en her' : 'Log ind her'}
          </button>
        </p>
      </div>
    </div>
  );
}
