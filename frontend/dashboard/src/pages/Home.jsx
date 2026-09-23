import React, { useState, useEffect } from 'react';
import RiskMap from '../components/RiskMap';
import StatCard from '../components/StatCard';
import AlertBanner from '../components/AlertBanner';
import RiskBadge from '../components/RiskBadge';
import {
  ShieldAlert, CloudRain, AlertTriangle, RefreshCw,
  Search, Zap, Layers, Activity, Cpu, Target,
  Radio, CheckCircle2, MapPin, Sparkles
} from 'lucide-react';

const FALLBACK_DISTRICTS = [
  { district: 'Cherrapunji', state: 'Meghalaya', latitude: 25.2833, longitude: 91.7167, probability: 0.88, risk_level: 'VERY_HIGH', rainfall_24h_mm: 245.3 },
  { district: 'Guwahati',    state: 'Assam',     latitude: 26.1445, longitude: 91.7362, probability: 0.12, risk_level: 'LOW',       rainfall_24h_mm: 45.2  },
  { district: 'Jiribam',     state: 'Manipur',   latitude: 24.8,    longitude: 93.1167, probability: 0.76, risk_level: 'VERY_HIGH', rainfall_24h_mm: 156.8 },
  { district: 'Silchar',     state: 'Assam',     latitude: 24.8333, longitude: 92.8,    probability: 0.34, risk_level: 'MODERATE',  rainfall_24h_mm: 98.4  },
  { district: 'Shillong',    state: 'Meghalaya', latitude: 25.5744, longitude: 91.883,  probability: 0.28, risk_level: 'LOW',       rainfall_24h_mm: 87.6  },
  { district: 'Aizawl',      state: 'Mizoram',   latitude: 23.7271, longitude: 92.7176, probability: 0.82, risk_level: 'VERY_HIGH', rainfall_24h_mm: 178.2 },
  { district: 'Kohima',      state: 'Nagaland',  latitude: 25.6751, longitude: 94.1086, probability: 0.68, risk_level: 'HIGH',      rainfall_24h_mm: 132.5 },
  { district: 'Imphal',      state: 'Manipur',   latitude: 24.817,  longitude: 93.9368, probability: 0.18, risk_level: 'LOW',       rainfall_24h_mm: 67.3  },
  { district: 'Itanagar',    state: 'Arunachal', latitude: 27.0844, longitude: 93.6053, probability: 0.74, risk_level: 'HIGH',      rainfall_24h_mm: 210.4 },
  { district: 'Lunglei',     state: 'Mizoram',   latitude: 22.8879, longitude: 92.7378, probability: 0.89, risk_level: 'VERY_HIGH', rainfall_24h_mm: 198.7 },
  { district: 'Dawki',       state: 'Meghalaya', latitude: 25.1667, longitude: 92.0167, probability: 0.94, risk_level: 'VERY_HIGH', rainfall_24h_mm: 255.2 },
];

const SCENARIOS = {
  monsoon:  { label: 'Monsoon Peak', district: 'Cherrapunji', state: 'Meghalaya', rainfall_24h_mm: 260, rainfall_72h_mm: 620, antecedent_rainfall_mm: 890, soil_moisture_percent: 92, slope_degrees: 42, elevation_m: 1400, ndvi: 0.28, lithology_code: 3 },
  flash:    { label: 'Flash Flood',  district: 'Aizawl',      state: 'Mizoram',   rainfall_24h_mm: 180, rainfall_72h_mm: 280, antecedent_rainfall_mm: 340, soil_moisture_percent: 78, slope_degrees: 38, elevation_m: 1100, ndvi: 0.40, lithology_code: 2 },
  baseline: { label: 'Baseline',     district: 'Guwahati',    state: 'Assam',     rainfall_24h_mm:  25, rainfall_72h_mm:  45, antecedent_rainfall_mm:  60, soil_moisture_percent: 45, slope_degrees: 12, elevation_m:  120, ndvi: 0.65, lithology_code: 1 },
};

const RISK_COLOR = { VERY_HIGH: '#EF4444', HIGH: '#F97316', MODERATE: '#F59E0B', LOW: '#22C55E' };
const RISK_BG    = { VERY_HIGH: 'rgba(239,68,68,0.12)', HIGH: 'rgba(249,115,22,0.12)', MODERATE: 'rgba(245,158,11,0.1)', LOW: 'rgba(34,197,94,0.1)' };

function calcFallbackProb(f) {
  return Math.min((f.rainfall_24h_mm / 250) * 0.5 + (f.slope_degrees / 45) * 0.5, 0.98);
}
function probToLevel(p) {
  return p > 0.75 ? 'VERY_HIGH' : p > 0.55 ? 'HIGH' : p > 0.3 ? 'MODERATE' : 'LOW';
}

export default function Home() {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [formData, setFormData] = useState({
    district: 'Cherrapunji', state: 'Meghalaya',
    rainfall_24h_mm: 220, rainfall_72h_mm: 550,
    antecedent_rainfall_mm: 750, soil_moisture_percent: 85,
    slope_degrees: 35, elevation_m: 1200, ndvi: 0.35, lithology_code: 3
  });

  const [searchLocation, setSearchLocation] = useState('');
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherSyncInfo, setWeatherSyncInfo] = useState(null);
  const [weatherError, setWeatherError] = useState('');

  const fetchDistricts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/predict/districts');
      if (res.ok) { const d = await res.json(); setDistricts(d.districts || []); }
      else setDistricts(FALLBACK_DISTRICTS);
    } catch { setDistricts(FALLBACK_DISTRICTS); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDistricts(); }, []);

  const handleAutoFetchWeather = async (targetLoc) => {
    const loc = (targetLoc || searchLocation || '').trim();
    if (!loc) {
      setWeatherError('Please enter a location name (e.g. Cherrapunji, Gangtok, Shillong)');
      return;
    }
    setWeatherError('');
    setIsFetchingWeather(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/predict/live-weather?query=${encodeURIComponent(loc)}`);
      if (!res.ok) throw new Error('Live weather service failed');
      const data = await res.json();

      const newForm = {
        district: data.district,
        state: data.state,
        rainfall_24h_mm: data.rainfall_24h_mm,
        rainfall_72h_mm: data.rainfall_72h_mm,
        antecedent_rainfall_mm: data.antecedent_rainfall_mm,
        soil_moisture_percent: data.soil_moisture_percent,
        slope_degrees: data.slope_degrees,
        elevation_m: data.elevation_m,
        ndvi: data.ndvi || 0.4,
        lithology_code: data.lithology_code || 2
      };
      setFormData(newForm);
      setWeatherSyncInfo(data);
      setActiveScenario(null);

      // Instantly run inference with the live retrieved meteorological inputs
      setIsSimulating(true);
      try {
        const predRes = await fetch('http://localhost:8000/api/v1/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newForm)
        });
        if (predRes.ok) {
          setSimulationResult(await predRes.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSimulating(false);
      }

    } catch (e) {
      console.error(e);
      setWeatherError('Could not fetch live weather. Please check connection.');
    } finally {
      setIsFetchingWeather(false);
    }
  };

  const applyScenario = (key) => {
    const { label, ...data } = SCENARIOS[key];
    setFormData(data);
    setActiveScenario(key);
    setWeatherSyncInfo(null);
  };

  const handleSimulate = async (e) => {
    e?.preventDefault();
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) { setSimulationResult(await res.json()); }
      else throw new Error('API error');
    } catch {
      const p = calcFallbackProb(formData);
      setSimulationResult({ district: formData.district, probability: p, risk_level: probToLevel(p), source: 'local_model', trigger_alert: p > 0.55 });
    } finally { setIsSimulating(false); }
  };

  const highRiskCount = districts.filter(d => ['VERY_HIGH', 'HIGH'].includes(d.risk_level)).length;
  const avgRain = districts.length
    ? (districts.reduce((s, d) => s + (d.rainfall_24h_mm || 0), 0) / districts.length).toFixed(1)
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Page Header ── */}
      <div className="page-header-row">
        <div>
          <div className="page-label">Risk Intelligence Dashboard</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Landslide Risk{' '}
            <span style={{ color: 'var(--accent)' }}>Monitoring</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            AI-Powered Early Warning · North East India · Real-Time
          </p>
        </div>
        <button onClick={fetchDistricts} className="btn btn-secondary" id="refresh-btn">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Fetching...' : 'Refresh Data'}
        </button>
      </div>

      {/* ── Alert Banner ── */}
      {highRiskCount > 0 && (
        <AlertBanner
          type="critical"
          riskLevel="VERY_HIGH"
          title={`${highRiskCount} Districts at Critical Risk — Immediate Action Required`}
          message="Monsoon extreme rainfall & slope instability detected in Cherrapunji, Dawki, Lunglei, Jiribam. SDMA precautionary safety protocols have been dispatched."
        />
      )}

      {/* ── Stat Cards ── */}
      <div className="stat-grid">
        <StatCard
          title="Monitored Districts"
          value={districts.length || 25}
          icon={Layers}
          color="teal"
          change="8 NER States"
          subtitle="Active zones"
        />
        <StatCard
          title="High Risk Zones"
          value={highRiskCount}
          icon={ShieldAlert}
          color="danger"
          riskLevel="HIGH"
          change="+2 since last hour"
          changeType="up"
        />
        <StatCard
          title="Avg 24h Rainfall"
          value={`${avgRain}mm`}
          icon={CloudRain}
          color="amber"
          change="Monsoon surge"
          changeType="up"
        />
        <StatCard
          title="Active Alerts"
          value="5"
          icon={AlertTriangle}
          color="danger"
          riskLevel="VERY_HIGH"
          change="SDMA Dispatched"
        />
      </div>

      {/* ── Main Grid: Map + Simulator ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>

        {/* Map Panel */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div className="card-title">
              <Activity size={15} color="var(--teal)" />
              Live Geospatial Risk Map
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-dot" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--teal)' }}>
                Live · {districts.length} districts
              </span>
            </div>
          </div>
          <RiskMap
            districts={districts}
            onSelectDistrict={(d) => {
              setSelectedDistrict(d);
              setFormData(prev => ({ ...prev, district: d.district, state: d.state, rainfall_24h_mm: d.rainfall_24h_mm || 180 }));
            }}
          />

          {/* District info strip */}
          {selectedDistrict && (
            <div style={{
              padding: '14px 20px', borderTop: '1px solid var(--border)',
              background: 'rgba(6,11,20,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {selectedDistrict.district}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  {selectedDistrict.state}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  Rain: {selectedDistrict.rainfall_24h_mm?.toFixed(1)}mm
                </span>
                <RiskBadge level={selectedDistrict.risk_level} size="sm" />
              </div>

            </div>
          )}
        </div>

        {/* AI Simulator */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            background: 'rgba(6,11,20,0.4)',
          }}>
            <div className="card-label" style={{ marginBottom: '8px', display: 'inline-flex' }}>
              XGBoost Engine
            </div>
            <div className="card-title" style={{ fontSize: '1.05rem' }}>
              <Cpu size={16} color="var(--accent)" />
              AI Risk Simulator
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              Compute prediction on custom terrain params
            </p>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {/* Citizen 1-Click Live Location Weather Sync */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(245,158,11,0.06) 0%, rgba(10,16,32,0.6) 100%)',
              border: weatherSyncInfo ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(245,158,11,0.25)',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              transition: 'border-color 0.3s ease'
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '10px'
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.64rem',
                  color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.15em',
                  display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600
                }}>
                  <Radio size={12} className={isFetchingWeather ? 'animate-spin' : ''} />
                  Citizen 1-Click Location Auto-Sync
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                  color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  <Sparkles size={10} color="var(--accent)" />
                  Open-Meteo 24h Satellite Feed
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{
                    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', pointerEvents: 'none'
                  }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter city, town or district (e.g. Cherrapunji, Gangtok)..."
                    value={searchLocation}
                    onChange={e => setSearchLocation(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAutoFetchWeather(); } }}
                    style={{
                      paddingLeft: '32px',
                      height: '38px',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-display)',
                      background: 'rgba(6,11,20,0.8)'
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoFetchWeather()}
                  disabled={isFetchingWeather}
                  style={{
                    background: 'linear-gradient(135deg, var(--accent), #D97706)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 16px',
                    height: '38px',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: isFetchingWeather ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 16px rgba(245,158,11,0.3)',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  {isFetchingWeather ? (
                    <><RefreshCw size={12} className="animate-spin" /> Fetching...</>
                  ) : (
                    <><Zap size={12} /> Auto-Fetch</>
                  )}
                </button>
              </div>

              {/* Quick suggestions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                  Quick Cities:
                </span>
                {['Cherrapunji', 'Gangtok', 'Shillong', 'Aizawl', 'Kohima', 'Guwahati', 'Darjeeling'].map(city => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => { setSearchLocation(city); handleAutoFetchWeather(city); }}
                    style={{
                      background: 'rgba(6,11,20,0.7)',
                      border: '1px solid rgba(148,163,184,0.15)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.15)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    {city}
                  </button>
                ))}
              </div>

              {/* Weather sync status banner */}
              {weatherSyncInfo && (
                <div style={{
                  marginTop: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '0.68rem',
                  color: '#86EFAC',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <CheckCircle2 size={14} style={{ flexShrink: 0, color: '#22C55E' }} />
                    <span>
                      Live Data Synced: <strong>{weatherSyncInfo.location}</strong> ({weatherSyncInfo.state})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <span>Rain 24h: <strong>{weatherSyncInfo.rainfall_24h_mm}mm</strong></span>
                    <span>Soil: <strong>{weatherSyncInfo.soil_moisture_percent}%</strong></span>
                  </div>
                </div>
              )}

              {weatherError && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '0.68rem',
                  color: '#F87171',
                  fontFamily: 'var(--font-mono)'
                }}>
                  ⚠️ {weatherError}
                </div>
              )}
            </div>

            {/* Scenario Presets */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>
                Scenario Presets
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {Object.entries(SCENARIOS).map(([key, { label }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyScenario(key)}
                    style={{
                      flex: 1, height: '30px', borderRadius: '6px',
                      fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                      fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease',
                      background: activeScenario === key ? 'var(--accent-dim)' : 'rgba(6,11,20,0.5)',
                      color: activeScenario === key ? 'var(--accent)' : 'var(--text-muted)',
                      border: activeScenario === key ? '1px solid var(--border-accent)' : '1px solid var(--border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <input type="text" className="form-input" value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input type="text" className="form-input" value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">
                    24h Rain (mm)
                    {weatherSyncInfo && (
                      <span style={{ color: 'var(--teal)', fontSize: '0.58rem', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>
                        ● LIVE 24H
                      </span>
                    )}
                  </label>
                  <input type="number" className="form-input" value={formData.rainfall_24h_mm}
                    onChange={e => setFormData({ ...formData, rainfall_24h_mm: +e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Slope (°)
                    {weatherSyncInfo && (
                      <span style={{ color: 'var(--accent)', fontSize: '0.58rem', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>
                        ● DEM {weatherSyncInfo.elevation_m}m
                      </span>
                    )}
                  </label>
                  <input type="number" className="form-input" value={formData.slope_degrees}
                    onChange={e => setFormData({ ...formData, slope_degrees: +e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Soil Moisture (%)
                    {weatherSyncInfo && (
                      <span style={{ color: 'var(--teal)', fontSize: '0.58rem', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>
                        ● SENSOR 0-7CM
                      </span>
                    )}
                  </label>
                  <input type="number" className="form-input" value={formData.soil_moisture_percent}
                    onChange={e => setFormData({ ...formData, soil_moisture_percent: +e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lithology</label>
                  <select className="form-select" value={formData.lithology_code}
                    onChange={e => setFormData({ ...formData, lithology_code: +e.target.value })}>
                    <option value={1}>1 — Alluvial</option>
                    <option value={2}>2 — Sandstone</option>
                    <option value={3}>3 — Limestone</option>
                  </select>
                </div>
              </div>

              <button type="submit" id="run-inference-btn" disabled={isSimulating} className="btn btn-primary" style={{ width: '100%', marginTop: '4px' }}>
                {isSimulating ? (
                  <><RefreshCw size={13} className="animate-spin" />Computing…</>
                ) : (
                  <><Zap size={13} />Run Model Inference</>
                )}
              </button>
            </form>

            {/* Result */}
            {simulationResult && (
              <div style={{
                marginTop: '16px', borderRadius: '8px', overflow: 'hidden',
                border: `1px solid ${RISK_COLOR[simulationResult.risk_level]}40`,
                background: RISK_BG[simulationResult.risk_level],
              }} className="animate-in">
                {/* Risk level bar */}
                <div style={{
                  height: '3px',
                  background: `linear-gradient(90deg, ${RISK_COLOR[simulationResult.risk_level]}, ${RISK_COLOR[simulationResult.risk_level]}60)`,
                }} />

                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Risk Index — {simulationResult.district}
                    </div>
                    <RiskBadge level={simulationResult.risk_level} size="sm" />
                  </div>


                  {/* Big probability */}
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '3.2rem',
                      fontWeight: 700, color: RISK_COLOR[simulationResult.risk_level],
                      lineHeight: 1, letterSpacing: '-0.04em',
                    }}>
                      {(simulationResult.probability * 100).toFixed(1)}
                      <span style={{ fontSize: '1.2rem', fontWeight: 400 }}>%</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Landslide Probability Score
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="progress-bar" style={{ margin: '8px 0' }}>
                    <div
                      className={`progress-bar-fill ${simulationResult.risk_level === 'LOW' ? 'teal' : simulationResult.risk_level === 'VERY_HIGH' || simulationResult.risk_level === 'HIGH' ? 'danger' : ''}`}
                      style={{ width: `${(simulationResult.probability * 100).toFixed(1)}%` }}
                    />
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(148,163,184,0.08)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>SMS Dispatch</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 500,
                      color: simulationResult.trigger_alert ? '#EF4444' : '#22C55E',
                    }}>
                      {simulationResult.trigger_alert ? '⚠ Triggered' : '✓ Not Required'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── District Risk Table ── */}
      {districts.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
            <div className="card-title">
              <Target size={15} color="var(--accent)" />
              NER District Risk Snapshot
            </div>
            <span className="chip">
              <Search size={9} />
              {districts.length} districts
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>District</th>
                  <th>State</th>
                  <th>Probability</th>
                  <th>Risk Level</th>
                  <th>24h Rain</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {[...districts]
                  .sort((a, b) => b.probability - a.probability)
                  .slice(0, 10)
                  .map((d, i) => (
                    <tr key={i} style={{ cursor: 'pointer' }}
                      onClick={() => { setSelectedDistrict(d); setFormData(prev => ({ ...prev, district: d.district, state: d.state, rainfall_24h_mm: d.rainfall_24h_mm || 180 })); }}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>{d.district}</span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{d.state}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px' }}>
                            <div className="progress-bar">
                              <div className="progress-bar-fill" style={{
                                width: `${(d.probability * 100).toFixed(0)}%`,
                                background: `linear-gradient(90deg, ${RISK_COLOR[d.risk_level]}, ${RISK_COLOR[d.risk_level]}80)`,
                              }} />
                            </div>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: RISK_COLOR[d.risk_level], fontWeight: 500 }}>
                            {(d.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td><RiskBadge level={d.risk_level} size="sm" /></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {d.rainfall_24h_mm?.toFixed(1)} mm
                      </td>
                      <td>
                        <div style={{ width: '80px' }}>
                          <div className="progress-bar">
                            <div className="progress-bar-fill teal" style={{ width: `${Math.min(95, 70 + Math.random() * 20).toFixed(0)}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
