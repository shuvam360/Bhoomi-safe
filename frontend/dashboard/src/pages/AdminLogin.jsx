import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Eye, EyeOff, AlertTriangle, Loader, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to intended page
  const from = location.state?.from?.pathname || '/admin';
  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter your admin API key.');
      return;
    }
    setError('');
    setLoading(true);

    const result = await login(apiKey.trim());

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
      background: 'linear-gradient(145deg, #060B14 0%, #0A1020 40%, #0D0F18 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid decoration */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '440px',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '64px', height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent), #D97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 40px rgba(245,158,11,0.3)',
          }}>
            <Shield size={30} color="#000" strokeWidth={2.5} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}>
            Bhoomi<span style={{ color: 'var(--accent)' }}>Safe</span>
          </h1>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
          }}>
            Admin Operations Console
          </div>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(148,163,184,0.1)',
          borderRadius: '16px',
          padding: '32px 28px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            marginBottom: '6px',
          }}>
            Restricted Access
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 4px',
          }}>
            Administrator Authentication
          </h2>

          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: '0 0 24px',
          }}>
            Enter your admin API key to access the Verification & Escalation dashboard.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '8px',
              }}>
                <Lock size={11} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Admin API Key
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Enter BHOOMI_API_KEY..."
                  autoFocus
                  autoComplete="off"
                  className="form-input"
                  style={{
                    width: '100%',
                    height: '46px',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-mono)',
                    paddingRight: '44px',
                    background: 'rgba(6,11,20,0.8)',
                    border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(148,163,184,0.15)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    padding: '0 44px 0 14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(245,158,11,0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(148,163,184,0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                marginBottom: '20px',
              }}>
                <AlertTriangle size={15} style={{ color: '#F87171', flexShrink: 0, marginTop: '1px' }} />
                <span style={{
                  fontSize: '0.78rem',
                  color: '#FCA5A5',
                  lineHeight: 1.4,
                }}>
                  {error}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: loading
                  ? 'rgba(245,158,11,0.5)'
                  : 'linear-gradient(135deg, var(--accent), #D97706)',
                color: '#000',
                border: 'none',
                borderRadius: '10px',
                fontFamily: 'var(--font-display)',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 20px rgba(245,158,11,0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = '0 0 36px rgba(245,158,11,0.5)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(245,158,11,0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield size={16} />
                  <span>Access Admin Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer security notice */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          padding: '14px 16px',
          background: 'rgba(6,11,20,0.5)',
          border: '1px solid rgba(148,163,184,0.06)',
          borderRadius: '10px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}>
            <Lock size={10} />
            Encrypted Session • Auto-expires in 24h
          </div>
          <p style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            margin: '6px 0 0',
            lineHeight: 1.4,
          }}>
            This console is restricted to authorized BhoomiSafe nodal officers. Unauthorized access attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
