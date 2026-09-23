import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, API_BASE_URL } from '../utils/api';
import { 
  CheckCircle2, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  Clock, 
  Send, 
  XCircle, 
  History, 
  Eye, 
  Image as ImageIcon, 
  Film, 
  Building, 
  FileText,
  Copy,
  Check,
  X,
  RefreshCw,
  Search,
  Shield,
  Radio
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';

const STATUS_CONFIG = {
  ALL: { label: 'All Reports', color: 'var(--text-secondary)', bg: 'rgba(148, 163, 184, 0.1)', border: 'var(--border)' },
  PENDING_REVIEW: { label: 'Pending Review', color: 'var(--accent)', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)', icon: Clock },
  AWAITING_GOVT_APPROVAL: { label: 'Awaiting Approval', color: '#C084FC', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)', icon: AlertTriangle },
  VERIFIED: { label: 'Field Verified', color: '#34D399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', icon: ShieldCheck },
  SUBMITTED_TO_GOVT: { label: 'Govt Dispatched (API)', color: '#60A5FA', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)', icon: Send },
  READY_FOR_MANUAL_SUBMISSION: { label: 'Manual Escalation Ready', color: '#2DD4BF', bg: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.35)', icon: ExternalLink },
  REJECTED: { label: 'Rejected', color: '#F87171', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', icon: XCircle },
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [verifyModalReport, setVerifyModalReport] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  const [packageModalReport, setPackageModalReport] = useState(null);
  const [copiedPackage, setCopiedPackage] = useState(false);
  
  const [historyModalReport, setHistoryModalReport] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [previewMedia, setPreviewMedia] = useState(null);

  const { adminToken } = useAuth();
  const API_KEY = adminToken || 'bhoomi-admin-key-2026';

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/reports'));
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      } else {
        setReports([]);
      }
    } catch (err) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const submitVerification = async (decision) => {
    if (!verifyModalReport) return;
    setActionLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/v1/reports/${verifyModalReport.id}/verify`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          status: decision,
          admin_note: adminNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReports(prev => prev.map(r => r.id === verifyModalReport.id ? data.report : r));
        setVerifyModalReport(null);
        setAdminNote('');
      } else {
        alert('Failed to update report status.');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating report status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveEscalation = async (report) => {
    if (!window.confirm(`Authorize government dispatch transmission for ${report.district}, ${report.state}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/v1/reports/${report.id}/approve-govt-submission`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          approved: true,
          admin_note: 'Approved for government transmission by nodal officer.',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReports(prev => prev.map(r => r.id === report.id ? data.report : r));
      } else {
        alert('Failed to authorize government submission.');
      }
    } catch (e) {
      console.error(e);
      alert('Error authorizing government submission.');
    } finally {
      setActionLoading(false);
    }
  };

  const openHistoryModal = async (report) => {
    setHistoryModalReport(report);
    setHistoryLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/v1/reports/${report.id}/history`));
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data.history || report.history || []);
      } else {
        setHistoryData(report.history || []);
      }
    } catch (e) {
      setHistoryData(report.history || []);
    } finally {
      setHistoryLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPackage(true);
    setTimeout(() => setCopiedPackage(false), 2000);
  };

  const getMediaFullUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return getApiUrl(path);
  };

  // Filter logic
  const filteredReports = reports.filter(r => {
    const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery ||
      r.district.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.incident_type && r.incident_type.toLowerCase().includes(q)) ||
      (r.reporter_name && r.reporter_name.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const statusCounts = reports.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* ─── Top Editorial Header ──────────────────────────── */}
      <div className="page-header-row">
        <div className="page-header">
          <div className="page-label">OPERATIONS DESK</div>
          <h1>
            Citizen Incident <span className="accent">Verification</span> & Escalation
          </h1>
          <p>
            Official disaster management verification console. Validate crowdsourced reports, review photographic evidence, and authorize official state SDMA/NDMA dispatches.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={fetchReports} 
            className="btn btn-secondary"
            title="Reload reports from server"
          >
            <RefreshCw size={14} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* ─── Filter & Search Control Panel ─────────────────── */}
      <div className="card" style={{ marginBottom: '28px', padding: '16px 20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px' 
        }}>
          {/* Status Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = key === 'ALL' ? reports.length : (statusCounts[key] || 0);
              const isSelected = selectedStatus === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedStatus(key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '100px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--accent)' : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? '#000' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    boxShadow: isSelected ? '0 0 16px var(--accent-glow)' : 'none',
                  }}
                >
                  <span>{cfg.label}</span>
                  <span style={{
                    padding: '1px 7px',
                    borderRadius: '100px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: isSelected ? 'rgba(0, 0, 0, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                    color: isSelected ? '#000' : 'var(--text-primary)',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search 
              size={14} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '34px', height: '38px', fontSize: '0.8rem' }}
              placeholder="Filter district, state, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ─── Reports Grid / Empty State ─────────────────────── */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Retrieving field reports from central database...
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="card" style={{ 
          textAlign: 'center', 
          padding: '72px 24px', 
          background: 'var(--bg-glass)',
          border: '1px dashed var(--border-strong)',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--accent)'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Incident Queue Clean
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            There are currently no reports matching the selected filter. Real-time crowdsourced dispatches submitted via the BhoomiSafe Mobile Portal will appear here automatically.
          </p>
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', height: '36px' }}
          >
            <Radio size={14} style={{ color: 'var(--teal)' }} />
            <span>Monitor Live Sensor Grid</span>
          </a>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(540px, 1fr))', 
          gap: '24px' 
        }}>
          {filteredReports.map(report => {
            const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.PENDING_REVIEW;
            const StatusIcon = statusCfg.icon || Clock;
            const mediaList = report.media_urls && report.media_urls.length > 0
              ? report.media_urls
              : (report.photo_url ? [report.photo_url] : []);

            return (
              <div 
                key={report.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '24px',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Top Row: Location, Risk Badge, Status Badge */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    gap: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <MapPin size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <h3 style={{ 
                          fontFamily: 'var(--font-display)', 
                          fontSize: '1.2rem', 
                          fontWeight: 700, 
                          color: 'var(--text-primary)',
                          margin: 0,
                        }}>
                          {report.district}, <span style={{ color: 'var(--text-secondary)' }}>{report.state}</span>
                        </h3>
                        {report.incident_type && (
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.62rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'var(--teal-dim)',
                            color: 'var(--teal)',
                            border: '1px solid rgba(20, 184, 166, 0.3)',
                          }}>
                            {report.incident_type}
                          </span>
                        )}
                      </div>

                      {report.latitude && report.longitude && (
                        <div style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontSize: '0.7rem', 
                          color: 'var(--text-muted)', 
                          marginTop: '4px' 
                        }}>
                          GPS: {report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <RiskBadge level={report.severity} size="sm" />
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.62rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        background: statusCfg.bg,
                        color: statusCfg.color,
                        border: `1px solid ${statusCfg.border}`,
                      }}>
                        <StatusIcon size={11} />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Reporter Contact Info */}
                  <div style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '0.72rem', 
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '12px',
                  }}>
                    <Phone size={12} style={{ color: 'var(--accent)' }} />
                    <span>Reported by: <strong style={{ color: 'var(--text-primary)' }}>{report.reporter_name || 'Anonymous Citizen'}</strong></span>
                    {report.reporter_phone && (
                      <span style={{ color: 'var(--text-muted)' }}>({report.reporter_phone})</span>
                    )}
                  </div>

                  {/* Incident Description Block */}
                  <div style={{
                    background: 'rgba(6, 11, 20, 0.7)',
                    border: '1px solid var(--border)',
                    borderLeft: '3px solid var(--accent)',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginTop: '14px',
                  }}>
                    <p style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-primary)', 
                      lineHeight: 1.55,
                      fontStyle: 'italic',
                      margin: 0,
                    }}>
                      "{report.description}"
                    </p>
                  </div>

                  {/* Attached Media Evidence (Photos / Video) */}
                  {(mediaList.length > 0 || report.video_url) && (
                    <div style={{
                      marginTop: '14px',
                      background: 'rgba(6, 11, 20, 0.5)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <ImageIcon size={12} style={{ color: 'var(--accent)' }} />
                          Verified Media Evidence ({mediaList.length + (report.video_url && !mediaList.includes(report.video_url) ? 1 : 0)})
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Click to inspect
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        {mediaList.map((url, idx) => (
                          <div 
                            key={idx}
                            onClick={() => setPreviewMedia({ url: getMediaFullUrl(url), type: 'image' })}
                            style={{
                              width: '72px',
                              height: '72px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              background: '#000',
                              position: 'relative',
                              transition: 'all 0.2s ease',
                            }}
                            title="View high-resolution photo"
                          >
                            <img 
                              src={getMediaFullUrl(url)} 
                              alt={`Incident photo ${idx + 1}`} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text-muted)">PHOTO</div>';
                              }}
                            />
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: 'rgba(0,0,0,0.4)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: 0, transition: 'opacity 0.2s ease',
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                            >
                              <Eye size={16} color="#fff" />
                            </div>
                          </div>
                        ))}

                        {report.video_url && (
                          <div
                            onClick={() => setPreviewMedia({ url: getMediaFullUrl(report.video_url), type: 'video' })}
                            style={{
                              width: '84px',
                              height: '72px',
                              borderRadius: '6px',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
                              background: 'var(--bg-elevated)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            title="Play incident video evidence"
                          >
                            <Film size={20} style={{ color: '#38BDF8' }} />
                            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: '#38BDF8', marginTop: '4px' }}>
                              MP4 Video
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Government Portal & Escalation Box */}
                  {report.government_portal && (
                    <div style={{
                      marginTop: '14px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <Building size={14} style={{ color: 'var(--accent)' }} />
                          Jurisdiction: <strong style={{ color: 'var(--text-primary)' }}>{report.government_portal.portal_name}</strong>
                        </span>

                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.62rem',
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: report.government_portal.has_api 
                            ? '1px solid rgba(16, 185, 129, 0.4)' 
                            : '1px solid rgba(245, 158, 11, 0.4)',
                          background: report.government_portal.has_api 
                            ? 'rgba(16, 185, 129, 0.15)' 
                            : 'rgba(245, 158, 11, 0.15)',
                          color: report.government_portal.has_api ? '#34D399' : 'var(--accent)',
                        }}>
                          {report.government_portal.has_api ? '● API Integration Active' : '○ Manual Filing Portal'}
                        </span>
                      </div>

                      {/* State Specific Dispatch Details */}
                      {report.status === 'SUBMITTED_TO_GOVT' && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          marginTop: '8px',
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            color: '#93C5FD',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}>
                            <ShieldCheck size={14} style={{ color: '#60A5FA' }} />
                            Dispatch Confirmation: <strong style={{ color: '#fff' }}>{report.govt_submission_id}</strong>
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#60A5FA' }}>
                            Transmission Verified
                          </span>
                        </div>
                      )}

                      {report.status === 'READY_FOR_MANUAL_SUBMISSION' && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(20, 184, 166, 0.1)',
                          border: '1px solid rgba(20, 184, 166, 0.3)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          marginTop: '8px',
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            color: '#5EEAD4',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}>
                            <FileText size={14} style={{ color: '#2DD4BF' }} />
                            Pre-filled Briefing Package Formatted
                          </span>
                          <button
                            onClick={() => setPackageModalReport(report)}
                            className="btn btn-secondary"
                            style={{ height: '28px', padding: '0 12px', fontSize: '0.7rem' }}
                          >
                            <ExternalLink size={12} />
                            <span>Open Package</span>
                          </button>
                        </div>
                      )}

                      {report.status === 'AWAITING_GOVT_APPROVAL' && (
                        <div style={{
                          background: 'rgba(168, 85, 247, 0.1)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          marginTop: '8px',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            color: '#D8B4FE',
                            marginBottom: '8px',
                          }}>
                            <AlertTriangle size={14} style={{ color: '#FBBF24', flexShrink: 0 }} />
                            <span>Authorized human approval required prior to external authority transmission.</span>
                          </div>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApproveEscalation(report)}
                            className="btn btn-primary"
                            style={{ height: '32px', fontSize: '0.75rem', width: '100%' }}
                          >
                            <Send size={13} />
                            <span>Authorize Government Transmission</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Note if verified */}
                  {report.admin_note && (
                    <div style={{
                      marginTop: '10px',
                      background: 'rgba(6, 11, 20, 0.6)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                    }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Admin Field Note: </span>
                      {report.admin_note}
                    </div>
                  )}
                </div>

                {/* Card Footer: Timestamp & Action Buttons */}
                <div style={{
                  paddingTop: '16px',
                  marginTop: '16px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {new Date(report.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <button
                      onClick={() => openHistoryModal(report)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        color: 'var(--teal)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      <History size={12} />
                      Audit Trail ({report.history ? report.history.length : 1})
                    </button>
                  </div>

                  {/* Action buttons for pending reports */}
                  {report.status === 'PENDING_REVIEW' && (
                    <button
                      onClick={() => {
                        setVerifyModalReport(report);
                        setAdminNote('');
                      }}
                      className="btn btn-primary"
                      style={{ height: '32px', padding: '0 14px', fontSize: '0.75rem' }}
                    >
                      <ShieldCheck size={14} />
                      <span>Verify / Review Incident</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modal 1: Admin Verification Modal ──────────────── */}
      {verifyModalReport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '28px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div className="card-label" style={{ marginBottom: '6px' }}>ADMIN VERIFICATION GATE</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
                  Review Incident #{verifyModalReport.id.slice(0, 8)}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {verifyModalReport.district}, {verifyModalReport.state} • Severity: {verifyModalReport.severity}
                </p>
              </div>
              <button 
                onClick={() => setVerifyModalReport(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'rgba(6, 11, 20, 0.7)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '0.82rem',
              color: 'var(--text-primary)',
              fontStyle: 'italic',
              marginBottom: '16px',
            }}>
              "{verifyModalReport.description}"
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">
                Official Verification Note (Recorded in immutable audit trail):
              </label>
              <textarea
                rows={3}
                className="form-input"
                style={{ resize: 'vertical' }}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="e.g. Field confirmed with district police division and road inspector."
              />
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginBottom: '20px',
            }}>
              <strong style={{ color: 'var(--accent)' }}>Escalation Protocol:</strong> Marking this incident as <strong>VERIFIED</strong> stages it for human escalation approval. No external government dispatch will occur automatically.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                disabled={actionLoading}
                onClick={() => submitVerification('REJECTED')}
                className="btn btn-danger"
                style={{ height: '36px', fontSize: '0.78rem' }}
              >
                <XCircle size={14} />
                <span>Reject Report</span>
              </button>
              <button
                disabled={actionLoading}
                onClick={() => submitVerification('VERIFIED')}
                className="btn btn-primary"
                style={{ height: '36px', fontSize: '0.78rem' }}
              >
                <ShieldCheck size={14} />
                <span>Verify & Stage for Escalation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Pre-filled Manual Package Modal ───────── */}
      {packageModalReport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', padding: '28px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div className="card-label" style={{ marginBottom: '6px' }}>MANUAL GOVERNMENT DISPATCH</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
                  Pre-filled Government Escalation Briefing
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Target: {packageModalReport.government_portal?.portal_name}
                </p>
              </div>
              <button 
                onClick={() => setPackageModalReport(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'rgba(6, 11, 20, 0.7)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '12px 14px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Emergency Desk Hotlines: </span>
                <span>{packageModalReport.submission_package?.contact_phone || '1070 / 112'}</span>
              </div>
              <a
                href={packageModalReport.government_portal?.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--teal)', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Launch Portal</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label">Pre-formatted Incident Briefing:</label>
                <button
                  onClick={() => copyToClipboard(
                    packageModalReport.submission_package?.formatted_package ||
                    `[BHOOMISAFE VERIFIED EMERGENCY DISPATCH]\n` +
                    `Incident Type: ${packageModalReport.incident_type}\n` +
                    `Location: ${packageModalReport.district}, ${packageModalReport.state}\n` +
                    `Severity: ${packageModalReport.severity}\n` +
                    `Summary: ${packageModalReport.description}\n` +
                    `Verified by: BhoomiSafe Operations Admin`
                  )}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--teal)',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedPackage ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedPackage ? 'Copied to Clipboard!' : 'Copy Briefing'}</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={8}
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', lineHeight: 1.4 }}
                value={
                  packageModalReport.submission_package?.formatted_package ||
                  `[BHOOMISAFE VERIFIED EMERGENCY DISPATCH]\n` +
                  `Incident Type: ${packageModalReport.incident_type}\n` +
                  `Location: ${packageModalReport.district}, ${packageModalReport.state}\n` +
                  `Severity: ${packageModalReport.severity}\n` +
                  `Summary: ${packageModalReport.description}\n` +
                  `Verified by: BhoomiSafe Operations Admin`
                }
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Status: READY_FOR_MANUAL_SUBMISSION
              </span>
              <a
                href={packageModalReport.government_portal?.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ height: '36px', fontSize: '0.78rem' }}
              >
                <ExternalLink size={14} />
                <span>Open {packageModalReport.government_portal?.jurisdiction || 'State'} SDMA Portal</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 3: Chronological Audit Trail Modal ───────── */}
      {historyModalReport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '24px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div>
                <div className="card-label" style={{ marginBottom: '6px' }}>CHRONOLOGICAL PROVENANCE</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
                  Report Lifecycle Audit Trail
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  ID: #{historyModalReport.id} • {historyModalReport.district}, {historyModalReport.state}
                </p>
              </div>
              <button 
                onClick={() => setHistoryModalReport(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '20px 4px 20px 0', flex: 1 }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  Loading chronological logs...
                </div>
              ) : historyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  No historical records logged yet.
                </div>
              ) : (
                historyData.map((item, idx) => (
                  <div 
                    key={idx} 
                    style={{
                      position: 'relative',
                      paddingLeft: '24px',
                      paddingBottom: '20px',
                      borderLeft: idx === historyData.length - 1 ? 'none' : '1px solid var(--border-strong)',
                    }}
                  >
                    {/* Node Dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-5px',
                      top: '2px',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      boxShadow: '0 0 8px var(--accent-glow)',
                    }} />

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.action}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          Actor: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{item.actor}</strong>
                        </span>
                        {item.to_status && (
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.62rem',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: 'var(--bg-elevated)',
                            color: 'var(--teal)',
                            border: '1px solid rgba(20, 184, 166, 0.3)',
                          }}>
                            {item.from_status ? `${item.from_status} → ` : ''}{item.to_status}
                          </span>
                        )}
                      </div>

                      {item.note && (
                        <div style={{
                          background: 'rgba(6, 11, 20, 0.6)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '8px 10px',
                          fontSize: '0.75rem',
                          color: 'var(--text-primary)',
                          fontStyle: 'italic',
                        }}>
                          "{item.note}"
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button 
                onClick={() => setHistoryModalReport(null)}
                className="btn btn-secondary"
                style={{ height: '34px', fontSize: '0.75rem' }}
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 4: Media Fullscreen Preview Modal ─────────── */}
      {previewMedia && (
        <div 
          onClick={() => setPreviewMedia(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 120,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card"
            style={{ maxWidth: '800px', width: '100%', padding: '20px', background: 'var(--bg-surface)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className="card-label">MEDIA INSPECTION VIEWER ({previewMedia.type.toUpperCase()})</div>
              <button 
                onClick={() => setPreviewMedia(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxHeight: '68vh',
              minHeight: '280px',
            }}>
              {previewMedia.type === 'video' ? (
                <video 
                  src={previewMedia.url} 
                  controls 
                  autoPlay 
                  style={{ maxHeight: '65vh', width: '100%', borderRadius: '6px' }}
                />
              ) : (
                <img 
                  src={previewMedia.url} 
                  alt="Field Evidence full view" 
                  style={{ maxHeight: '65vh', maxWidth: '100%', objectFit: 'contain' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {previewMedia.url}
              </span>
              <a
                href={previewMedia.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--teal)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Open Raw Asset</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
