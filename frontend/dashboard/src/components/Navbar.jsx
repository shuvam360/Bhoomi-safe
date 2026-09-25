import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';
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
  X,
  Radio,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', altTo: '/map', label: 'Risk Map', icon: Map, end: true, desc: 'Live geospatial view' },
  { to: '/alerts', label: 'Active Alerts', icon: Bell, badge: 5, desc: 'SDMA dispatched' },
  { to: '/reports', label: 'Admin Desk', icon: FileText, desc: 'Verify & Escalate Reports', restricted: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, desc: 'Model performance' },
];

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState('connecting');
  const [time, setTime] = useState(new Date());
  const location = useLocation();

  // Close slide drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Health check polling
  useEffect(() => {
    let mounted = true;
    const check = async (isRetry = false) => {
      try {
        const r = await fetch(getApiUrl('/api/v1/health'), { signal: AbortSignal.timeout(8000) });
        if (!mounted) return;
        if (r.ok) {
          setBackendStatus('online');
          return;
        }
      } catch {
        try {
          const direct = await fetch(getApiUrl('/health'), { signal: AbortSignal.timeout(8000) });
          if (!mounted) return;
          if (direct.ok) {
            setBackendStatus('online');
            return;
          }
        } catch {
          if (!isRetry) {
            setTimeout(() => { if (mounted) check(true); }, 500);
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

  // Live IST Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const statusColor = { online: '#14B8A6', connecting: '#F59E0B', checking: '#F59E0B', offline: '#EF4444', error: '#F97316' };
  const statusLabel = { online: 'Online', connecting: 'Connecting...', checking: 'Connecting...', offline: 'Offline', error: 'Error' };

  // Current active page label
  const currentNav = NAV_ITEMS.find(item => 
    item.to === location.pathname || (item.altTo && location.pathname === item.altTo)
  );

  return (
    <>
      {/* ═════════════════════════════════════════════════════════════
          1. TOP FIXED HEADER WITH 3-LINE SLIDE BAR BUTTON
         ═════════════════════════════════════════════════════════════ */}
      <header className="top-header-bar">
        {/* Left: 3-line Toggle Button + Brand Logo */}
        <div className="header-left-group">
          {/* Three-Line Hamburger Button */}
          <button
            type="button"
            className="hamburger-toggle-btn"
            onClick={() => setIsOpen(prev => !prev)}
            aria-label={isOpen ? "Close navigation menu" : "Open navigation slide bar"}
            aria-expanded={isOpen}
            title="Toggle Navigation Menu"
          >
            <div className="hamburger-icon-lines">
              <span className={`hamburger-line line-1 ${isOpen ? 'active' : ''}`} />
              <span className={`hamburger-line line-2 ${isOpen ? 'active' : ''}`} />
              <span className={`hamburger-line line-3 ${isOpen ? 'active' : ''}`} />
            </div>
            <span className="hamburger-btn-text">Menu</span>
          </button>

          {/* Brand Logo & Title */}
          <Link to="/" className="header-brand" onClick={() => setIsOpen(false)}>
            <div className="header-brand-logo">
              <Shield size={17} color="#000" strokeWidth={2.6} />
            </div>
            <div className="header-brand-text">
              <span className="header-brand-name">
                Bhoomi<span style={{ color: 'var(--accent)' }}>Safe</span>
              </span>
              <span className="header-brand-badge">NER</span>
            </div>
          </Link>
        </div>

        {/* Center: Current active page badge (desktop / tablet) */}
        <div className="header-center-info">
          {currentNav && (
            <div className="header-active-pill">
              <span className="active-dot" />
              <span className="active-label">{currentNav.label}</span>
              <span className="active-sub">{currentNav.desc}</span>
            </div>
          )}
        </div>

        {/* Right: Live Status + Clock + Citizen Portal */}
        <div className="header-right-group">
          {/* Live Clock */}
          <div className="header-clock-box">
            <span className="clock-time">{time.toLocaleTimeString('en-IN', { hour12: false })}</span>
            <span className="clock-zone">IST</span>
          </div>

          {/* Backend Status Pill */}
          <div className="header-status-pill" title={`API Backend is ${statusLabel[backendStatus]}`}>
            <span
              className="status-indicator-dot"
              style={{
                background: statusColor[backendStatus],
                boxShadow: `0 0 8px ${statusColor[backendStatus]}`,
              }}
            />
            <span className="status-indicator-text" style={{ color: statusColor[backendStatus] }}>
              {backendStatus === 'online' ? 'API Online' : statusLabel[backendStatus]}
            </span>
          </div>

          {/* Citizen Portal Shortcut */}
          <a
            href={`${import.meta.env.BASE_URL}citizen-app/index.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="header-citizen-btn"
            title="Open Citizen Reporting Portal (PWA)"
          >
            <ExternalLink size={13} />
            <span className="citizen-btn-label">Citizen App</span>
          </a>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════
          2. BACKDROP OVERLAY
         ═════════════════════════════════════════════════════════════ */}
      <div
        className={`nav-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      {/* ═════════════════════════════════════════════════════════════
          3. SLIDING NAVIGATION BAR DRAWER (DESKTOP & MOBILE)
         ═════════════════════════════════════════════════════════════ */}
      <aside
        className={`nav-slide-drawer ${isOpen ? 'open' : ''}`}
        aria-label="Main Navigation Menu"
      >
        {/* Drawer Header with Close Button */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              color: 'var(--text-muted)', letterSpacing: '0.1em',
            }}>
              {time.toLocaleTimeString('en-IN', { hour12: false })} IST · GRID MON
            </div>
            {/* Close 'X' Button */}
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close navigation sliding drawer"
              title="Close Menu (Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* Full Logo row in drawer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--accent), #D97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(245,158,11,0.4)',
              flexShrink: 0,
            }}>
              <Shield size={19} color="#000" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '1.2rem', color: 'var(--text-primary)',
                letterSpacing: '-0.02em', lineHeight: 1.1,
              }}>
                Bhoomi<span style={{ color: 'var(--accent)' }}>Safe</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.12em', marginTop: '2px',
              }}>
                NER Landslide Early Warning
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="drawer-nav">
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
            color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.2em', padding: '0 8px', marginBottom: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Navigation</span>
            <span style={{ fontSize: '0.55rem', color: 'var(--accent)' }}>Slide Menu</span>
          </div>

          {NAV_ITEMS.map(({ to, altTo, label, icon: Icon, end, badge, desc, restricted }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setIsOpen(false)}
              style={{ display: 'block', textDecoration: 'none', marginBottom: '6px' }}
            >
              {({ isActive }) => {
                const active = isActive || (altTo && location.pathname === altTo);
                return (
                  <div
                    className={`drawer-nav-item ${active ? 'active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '11px 14px', borderRadius: '10px',
                      background: active ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.02)',
                      border: active ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(148,163,184,0.06)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                      background: active ? 'rgba(245,158,11,0.2)' : 'rgba(148,163,184,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: active ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(148,163,184,0.08)',
                    }}>
                      <Icon size={16} color={active ? 'var(--accent)' : 'var(--text-muted)'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 600,
                          color: active ? 'var(--accent)' : 'var(--text-primary)',
                          lineHeight: 1.2,
                        }}>
                          {label}
                        </span>
                        {restricted && !isAuthenticated && (
                          <span title="Restricted to Administrator" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '2px',
                            fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                            padding: '1px 5px', borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.28)',
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
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.28)',
                            color: '#34D399',
                            letterSpacing: '0.05em',
                          }}>
                            <Shield size={9} /> AUTH
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                        color: 'var(--text-muted)', marginTop: '2px',
                      }}>
                        {desc}
                      </div>
                    </div>
                    {badge && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                        background: 'rgba(239,68,68,0.18)', color: '#EF4444',
                        border: '1px solid rgba(239,68,68,0.35)', borderRadius: '100px',
                        padding: '2px 8px', flexShrink: 0, fontWeight: 600,
                      }}>
                        {badge}
                      </span>
                    )}
                    {active && <ChevronRight size={14} color="var(--accent)" />}
                  </div>
                );
              }}
            </NavLink>
          ))}
        </nav>

        {/* Drawer Bottom Controls & Status */}
        <div className="drawer-footer">
          {/* Status Box */}
          <div style={{
            background: 'rgba(6,11,20,0.85)', borderRadius: '10px',
            padding: '12px 14px', border: '1px solid rgba(148,163,184,0.1)',
            marginBottom: '12px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.15em', marginBottom: '10px',
            }}>
              <Activity size={11} color="var(--accent)" />
              System Status
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>Render API</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: statusColor[backendStatus],
                  boxShadow: `0 0 6px ${statusColor[backendStatus]}`,
                  animation: backendStatus === 'online' ? 'pulse-dot 2s ease infinite' : 'none',
                }} />
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                  color: statusColor[backendStatus], fontWeight: 500,
                }}>
                  {statusLabel[backendStatus]}
                </span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>ML Engine</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--teal)', fontWeight: 500 }}>
                XGBoost Ensemble v2
              </span>
            </div>
          </div>

          {/* Admin Login / Logout Controller */}
          {isAuthenticated ? (
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: '10px',
              padding: '10px 12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                  color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
                }}>
                  <Shield size={12} /> Admin Active
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.74rem',
                  color: 'var(--text-secondary)', marginTop: '2px',
                }}>
                  Nodal Risk Operator
                </div>
              </div>
              <button
                onClick={() => { logout(); setIsOpen(false); }}
                title="Sign out from Admin Console"
                style={{
                  background: 'rgba(239,68,68,0.14)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#EF4444',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <LogOut size={12} />
                Logout
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', height: '36px',
                background: 'rgba(148,163,184,0.06)',
                border: '1px solid rgba(148,163,184,0.15)',
                color: 'var(--text-secondary)', borderRadius: '8px',
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                textDecoration: 'none', marginBottom: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <Lock size={13} />
              <span>Admin Desk Login</span>
            </NavLink>
          )}

          {/* Citizen Portal Action Link */}
          <a
            href={`${import.meta.env.BASE_URL}citizen-app/index.html`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', height: '40px',
              background: 'linear-gradient(135deg, var(--accent), #D97706)',
              color: '#000', borderRadius: '8px',
              fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer', border: 'none', textDecoration: 'none',
              boxShadow: '0 0 16px rgba(245,158,11,0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <ExternalLink size={14} />
            Citizen Emergency Portal
          </a>
        </div>
      </aside>
    </>
  );
}
