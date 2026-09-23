import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = 'bhoomi_admin_session';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        if (session.token && session.expiresAt && Date.now() < session.expiresAt) {
          setAdminToken(session.token);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const login = async (apiKey) => {
    // Validate against backend
    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });

      if (res.ok) {
        const data = await res.json();
        const session = {
          token: data.token || apiKey,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        setAdminToken(session.token);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.detail || 'Invalid credentials.' };
      }
    } catch (e) {
      return { success: false, error: 'Cannot reach backend server. Please ensure the API is running.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAdminToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, adminToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
