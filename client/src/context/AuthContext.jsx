import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('foodtrail_token'));
  const [loading, setLoading] = useState(true);

  // Load user profile on mount if token exists
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        // No token — show login page
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token invalid, clear it
          localStorage.removeItem('foodtrail_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error verifying token:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed.');

    localStorage.setItem('foodtrail_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password, role) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed.');

    localStorage.setItem('foodtrail_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const loginOAuth = async (provider, role = 'customer') => {
    const res = await fetch('/api/auth/oauth-mock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'OAuth login failed.');

    localStorage.setItem('foodtrail_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const switchDemoPersona = async (persona) => {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Switch failed.');

    localStorage.setItem('foodtrail_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('foodtrail_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user),
        isCustomer: user?.role === 'customer',
        isOwner: user?.role === 'restaurant_owner' || user?.role === 'admin',
        isAdmin: user?.role === 'admin',
        login,
        register,
        loginOAuth,
        switchDemoPersona,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
