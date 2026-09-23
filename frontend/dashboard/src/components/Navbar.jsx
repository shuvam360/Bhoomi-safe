import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Map,
  Bell,
  FileText,
  BarChart3,
  ExternalLink,
  Shield,
  Activity,
  ChevronRight,
  Lock,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', altTo: '/map', label: 'Risk Map', icon: Map, end: true, desc: 'Live geospatial view' },
  { to: '/alerts', label: 'Active Alerts', icon: Bell, badge: 5, desc: 'SDMA dispatched' },
  { to: '/reports', label: 'Admin Desk', icon: FileText, desc: 'Verify & Escalate Reports', restricted: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, desc: 'Model performance' },
];

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState('connecting');
  const [time, setTime] = useState(new Date());
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const check = async (isRetry = false) => {
      try {
        const r = await fetch('/api/v1/health', { signal: AbortSignal.timeout(2000) });
        if (!mounted) return;
        if (r.ok) {
          setBackendStatus('online');
          return;
        }
      } catch {
        try {
          const direct = await fetch('http://127.0.0.1:8000/api/v1/health', { signal: AbortSignal.timeout(2000) });
          if (!mounted) return;
          if (direct.ok) {
            setBackendStatus('online');
            return;
          }
        } catch {
          if (!isRetry) {
            setTimeout(() => { if (mounted) check(true); }, 300);
            return;
          }
        }
      }
      if (mounted) setBackendStatus('offline');
    };
    check();
    const interval = setInterval(() => check(), 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const statusColor = { online: '#14B8A6', connecting: '#F59E0B', checking: '#F59E0B', offline: '#EF4444', error: '#F97316' };
  const statusLabel = { online: 'Online', connecting: 'Connecting...', checking: 'Connecting...', offline: 'Offline', error: 'Error' };

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: 'var(--sidebar-width)',
      background: 'linear-gradient(180deg, #0A1020 0%, #060B14 100%)',
      borderRight: '1px solid rgba(148,163,184,0.08)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50, padding: '0',
      boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
    }}>

      {/* Brand */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid rgba(148,163,184,0.08)',
      }}>
        {/* Live clock */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          color: 'var(--text-muted)', marginBottom: '16px',
          letterSpacing: '0.1em',
        }}>
          {time.toLocaleTimeString('en-IN', { hour12: false })} IST
        </div>

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent), #D97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(245,158,11,0.4)',
          }}>
            <Shield size={18} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1.15rem', color: 'var(--text-primary)',
              letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              Bhoomi<span style={{ color: 'var(--accent)' }}>Safe</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.12em', marginTop: '2px',
            }}>
              NER Early Warning
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
          color: 'var(--text-muted)', textTransform: 'uppercase',
          letterSpacing: '0.2em', padding: '0 8px', marginBottom: '10px',
        }}>
          Navigation
        </div>

        {NAV_ITEMS.map(({ to, altTo, label, icon: Icon, end, badge, desc, restricted }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={{ display: 'block', textDecoration: 'none', marginBottom: '4px' }}
          >
            {({ isActive }) => {
              const active = isActive || (altTo && location.pathname === altTo);
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '8px',
                  background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
                  border: active ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(241,245,249,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0,
                    background: active ? 'rgba(245,158,11,0.15)' : 'rgba(241,245,249,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: active ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(148,163,184,0.08)',
                  }}>
                    <Icon size={14} color={active ? 'var(--accent)' : 'var(--text-muted)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 500,
                        color: active ? 'var(--accent)' : 'var(--text-secondary)',
                        lineHeight: 1.2,
                      }}>
                        {label}
                      </span>
                      {restricted && !isAuthenticated && (
                        <span title="Restricted to Administrator" style={{
                          display: 'inline-flex', alignItems: 'center', gap: '2px',
                          fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                          padding: '1px 5px', borderRadius: '4px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#F87171',
                          letterSpacing: '0.05em',
                        }}>
                          <Lock size={9} /> LOCK
                        </span>
                      )}
                      {restricted && isAuthenticated && (
                        <span title="Administrator Session Active" style={{
                          display: 'inline-flex', alignItems: 'center', gap: '2px',
                          fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                          padding: '1px 5px', borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          color: '#34D399',
                          letterSpacing: '0.05em',
                        }}>
                          <Shield size={9} /> AUTH
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                      color: 'var(--text-muted)', marginTop: '1px',
                    }}>
                      {desc}
                    </div>
                  </div>
                  {badge && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                      background: 'rgba(239,68,68,0.15)', color: '#EF4444',
                      border: '1px solid rgba(239,68,68,0.3)', borderRadius: '100px',
                      padding: '2px 7px', flexShrink: 0,
                    }}>
                      {badge}
                    </span>
                  )}
                  {active && <ChevronRight size={12} color="var(--accent)" />}
                </div>
              );
            }}
          </NavLink>
        ))}
      </nav>

      {/* System Status */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(148,163,184,0.08)' }}>
        <div style={{
          background: 'rgba(6,11,20,0.8)', borderRadius: '8px',
          padding: '12px 14px', border: '1px solid rgba(148,163,184,0.08)',
          marginBottom: '10px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.15em', marginBottom: '10px',
          }}>
            <Activity size={10} color="var(--accent)" />
            System Status
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>API Server</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: statusColor[backendStatus],
                boxShadow: `0 0 6px ${statusColor[backendStatus]}`,
                animation: backendStatus === 'online' ? 'pulse-dot 2s ease infinite' : 'none',
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                color: statusColor[backendStatus], fontWeight: 500,
              }}>
                {statusLabel[backendStatus]}
              </span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>ML Model</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--teal)' }}>
              XGBoost v2
            </span>
          </div>
        </div>

        {/* Administrator Access / Session Controller */}
        {isAuthenticated ? (
          <div style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
              }}>
                <Shield size={11} /> Admin Active
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.72rem',
                color: 'var(--text-secondary)', marginTop: '2px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                Authorized Operator
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign out from Admin Console"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#EF4444',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
            >
              <LogOut size={11} />
              Logout
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', height: '32px',
              background: 'rgba(148,163,184,0.04)',
              border: '1px solid rgba(148,163,184,0.12)',
              color: 'var(--text-secondary)', borderRadius: '8px',
              fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
              textDecoration: 'none', marginBottom: '10px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <Lock size={12} />
            <span>Admin Login</span>
          </NavLink>
        )}

        {/* Citizen Portal */}
        <a
          href={`${import.meta.env.BASE_URL}citizen-app/index.html`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', height: '38px',
            background: 'linear-gradient(135deg, var(--accent), #D97706)',
            color: '#000', borderRadius: '8px',
            fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 600,
            cursor: 'pointer', border: 'none', textDecoration: 'none',
            boxShadow: '0 0 16px rgba(245,158,11,0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(245,158,11,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(245,158,11,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <ExternalLink size={13} />
          Citizen Portal
        </a>
      </div>
    </aside>
  );
}
