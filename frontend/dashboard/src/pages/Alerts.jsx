import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, ShieldAlert, Filter, Send } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { getApiUrl } from '../utils/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [newAlert, setNewAlert] = useState({
    district: '',
    state: 'Meghalaya',
    risk_level: 'HIGH',
    message: ''
  });

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/alerts'));
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      } else {
        useFallbackAlerts();
      }
    } catch (err) {
      useFallbackAlerts();
    } finally {
      setLoading(false);
    }
  };

  const useFallbackAlerts = () => {
    setAlerts([
      { id: '1', district: 'Cherrapunji', state: 'Meghalaya', risk_level: 'VERY_HIGH', message: 'Extreme rainfall (248mm/24h). Debris flow risk. Evacuate low-lying areas.', is_active: true, created_at: '2026-08-27T08:30:00Z' },
      { id: '2', district: 'Lunglei', state: 'Mizoram', risk_level: 'HIGH', message: 'Sustained heavy rainfall (198mm/24h). Road closures expected on NH-54.', is_active: true, created_at: '2026-08-27T07:15:00Z' },
      { id: '3', district: 'Tamenglong', state: 'Manipur', risk_level: 'HIGH', message: 'Saturated soil conditions. Monitor NH-37 for slope failures.', is_active: true, created_at: '2026-08-27T06:45:00Z' },
      { id: '4', district: 'Nongpoh', state: 'Meghalaya', risk_level: 'VERY_HIGH', message: 'Gneiss-granite terrain with steep slopes. Rockfall alert issued.', is_active: true, created_at: '2026-08-27T05:20:00Z' },
      { id: '5', district: 'Dawki', state: 'Meghalaya', risk_level: 'VERY_HIGH', message: 'Highest recorded 24h rainfall. All citizens advised to move to higher ground.', is_active: true, created_at: '2026-08-27T04:10:00Z' },
    ]);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleDeactivate = async (id) => {
    try {
      await fetch(getApiUrl(`/api/v1/alerts/${id}/deactivate`), {
        method: 'PATCH',
        headers: {
          'X-API-Key': 'bhoomi-admin-key-2026'
        }
      });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: false } : a));
    } catch (e) {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: false } : a));
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(getApiUrl('/api/v1/alerts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'bhoomi-admin-key-2026'
        },
        body: JSON.stringify(newAlert)
      });
      if (res.ok) {
        const created = await res.json();
        setAlerts(prev => [created, ...prev]);
        setShowModal(false);
        setNewAlert({ district: '', state: 'Meghalaya', risk_level: 'HIGH', message: '' });
      }
    } catch (err) {
      const mockCreated = {
        id: String(Date.now()),
        ...newAlert,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setAlerts(prev => [mockCreated, ...prev]);
      setShowModal(false);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterState && a.state !== filterState) return false;
    if (filterLevel && a.risk_level !== filterLevel) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="page-header flex-1">
          <h1>Active Early Warning <em className="italic text-[#D4AF37]">Advisories</em></h1>
          <p>Official Disaster Management Dispatches & Public Advisories across NER</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>Dispatch Emergency Alert</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#1A1A1A]/15 border-t-2 border-t-[#D4AF37] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-[#6C6863]">
          <Filter size={16} />
          <span>Filter Advisories:</span>
        </div>
        <select 
          value={filterState} 
          onChange={e => setFilterState(e.target.value)}
          className="form-select max-w-[200px] text-xs py-1"
        >
          <option value="">All NER States</option>
          <option value="Meghalaya">Meghalaya</option>
          <option value="Manipur">Manipur</option>
          <option value="Mizoram">Mizoram</option>
          <option value="Assam">Assam</option>
          <option value="Nagaland">Nagaland</option>
          <option value="Arunachal Pradesh">Arunachal Pradesh</option>
        </select>

        <select 
          value={filterLevel} 
          onChange={e => setFilterLevel(e.target.value)}
          className="form-select max-w-[200px] text-xs py-1"
        >
          <option value="">All Risk Levels</option>
          <option value="VERY_HIGH">Very High</option>
          <option value="HIGH">High</option>
          <option value="MODERATE">Moderate</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden p-0 bg-white">
        {loading ? (
          <div className="p-16 text-center text-xs font-medium uppercase tracking-[0.25em] text-[#6C6863]">
            Loading warning advisories...
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>District / State</th>
                <th>Classification</th>
                <th>Warning Advisory</th>
                <th>Status</th>
                <th>Issued At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map(alert => (
                <tr key={alert.id} className={!alert.is_active ? 'opacity-50' : ''}>
                  <td>
                    <div className="font-serif text-lg text-[#1A1A1A] leading-tight">{alert.district}</div>
                    <div className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#6C6863] mt-0.5">{alert.state}</div>
                  </td>
                  <td>
                    <RiskBadge level={alert.risk_level} size="sm" />
                  </td>

                  <td className="max-w-md text-xs text-[#1A1A1A] leading-relaxed">
                    {alert.message}
                  </td>
                  <td>
                    {alert.is_active ? (
                      <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37] px-2 py-0.5 bg-[#FFFDF5]">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#6C6863] border border-[#1A1A1A]/20 px-2 py-0.5">
                        RESOLVED
                      </span>
                    )}
                  </td>
                  <td className="text-xs text-[#6C6863]">
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    {alert.is_active && (
                      <button
                        onClick={() => handleDeactivate(alert.id)}
                        className="btn btn-ghost text-xs py-1 px-3"
                      >
                        <CheckCircle size={14} className="text-[#1A1A1A]" />
                        <span>Resolve</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full space-y-6 bg-white border border-[#1A1A1A]/15 border-t-2 border-t-[#D4AF37] shadow-[0_16px_48px_rgba(0,0,0,0.15)]">
            <div className="border-b border-[#1A1A1A]/15 pb-4">
              <div className="text-[10px] font-medium tracking-[0.25em] uppercase text-[#D4AF37]">Dispatch Advisory</div>
              <h3 className="font-serif text-2xl text-[#1A1A1A] flex items-center gap-2 mt-1">
                Dispatch Emergency Alert
              </h3>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div className="form-group">
                <label className="form-label">District Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={newAlert.district}
                  onChange={e => setNewAlert({...newAlert, district: e.target.value})}
                  placeholder="e.g. Cherrapunji"
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <select
                  className="form-select"
                  value={newAlert.state}
                  onChange={e => setNewAlert({...newAlert, state: e.target.value})}
                >
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Assam">Assam</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Risk Level</label>
                <select
                  className="form-select"
                  value={newAlert.risk_level}
                  onChange={e => setNewAlert({...newAlert, risk_level: e.target.value})}
                >
                  <option value="VERY_HIGH">VERY HIGH (Critical Advisory)</option>
                  <option value="HIGH">HIGH (Standard Advisory)</option>
                  <option value="MODERATE">MODERATE (Precautionary)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Advisory Message</label>
                <textarea
                  required
                  rows={3}
                  className="form-input"
                  value={newAlert.message}
                  onChange={e => setNewAlert({...newAlert, message: e.target.value})}
                  placeholder="Enter detailed safety advisory for citizens..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-[#1A1A1A]/15">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Send size={14} />
                  <span>Broadcast Advisory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
