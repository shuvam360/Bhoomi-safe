import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getRiskTier, NDMA_TIERS } from '../utils/riskTiers';
import RiskBadge from './RiskBadge';

export default function RiskMap({ districts = [], onSelectDistrict }) {
  const position = [25.8, 93.2];
  const zoom = 7;
  const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || 'cb1_3v9f_1_db37a53db18da3d4cf8ebd00';

  return (
    <div
      className="relative w-full h-[520px] border border-[#1A1A1A]/15 border-t-2 border-t-[#1A1A1A] bg-[#F9F8F6] shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
      style={{ height: '520px', minHeight: '520px', width: '100%', position: 'relative', overflow: 'hidden', borderRadius: '8px' }}
      role="region"
      aria-label="Interactive Landslide Risk Map with colorblind-accessible markers and NDMA tiers"
    >
      <MapContainer
        center={position}
        zoom={zoom}
        style={{ height: '520px', minHeight: '520px', width: '100%', background: '#EBE5DE' }}
        scrollWheelZoom={true}
      >
        {/* CARTO Basemap Tiles Authenticated with API Key */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/" target="_blank" rel="noopener noreferrer">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : ''}`}
          subdomains="abcd"
          maxZoom={19}
        />

        {districts.map((district) => {
          const tier = getRiskTier(district.risk_level ?? district.probability);
          const TierIcon = tier.Icon;

          return (
            <CircleMarker
              key={district.district}
              center={[district.latitude, district.longitude]}
              radius={tier.radius}
              pathOptions={{
                color: tier.color,
                fillColor: tier.color,
                fillOpacity: 0.85,
                weight: tier.weight,
                dashArray: tier.dashArray,
              }}
              eventHandlers={{
                click: () => onSelectDistrict && onSelectDistrict(district),
              }}
            >
              {/* Colorblind-accessible hover tooltip */}
              <Tooltip direction="top" offset={[0, -tier.radius]} opacity={0.96}>
                <div className="font-mono text-xs font-medium tracking-tight">
                  <span className="font-bold mr-1">{tier.symbol} {tier.shortLabel}</span>
                  <span>{district.district}: <strong>{(district.probability * 100).toFixed(1)}%</strong> ({tier.label})</span>
                </div>
              </Tooltip>

              {/* Accessible Popup on Click */}
              <Popup>
                <div className="p-3 space-y-3 min-w-[230px] font-sans">
                  {/* Header: District Name & Accessible Risk Badge */}
                  <div className="flex justify-between items-start gap-2 border-b border-[#1A1A1A]/15 pb-2">
                    <div>
                      <h4 className="font-serif font-semibold text-lg text-[#1A1A1A] leading-tight">
                        {district.district}
                      </h4>
                      <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-[#6C6863] mt-0.5">
                        {district.state}
                      </p>
                    </div>

                    {/* Accessible Risk Badge: Icon + Label + Symbol */}
                    <RiskBadge level={district.risk_level ?? district.probability} size="sm" />
                  </div>

                  {/* Accessible NDMA Advisory Text & Shape Explanation */}
                  <div className="text-[11px] bg-black/5 p-2 rounded border border-black/10 font-mono">
                    <div className="flex items-center gap-1.5 font-bold" style={{ color: tier.color }}>
                      <TierIcon size={13} aria-hidden="true" />
                      <span>{tier.tierName}: {tier.label} ({tier.shape})</span>
                    </div>
                    <div className="text-[#6C6863] text-[10px] mt-0.5">
                      {tier.advisory}
                    </div>
                  </div>

                  {/* Geotechnical & Precipitation Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[#6C6863] text-[10px] tracking-[0.12em] uppercase block font-mono">
                        Risk Probability
                      </span>
                      <span className="font-serif text-base font-semibold text-[#1A1A1A]">
                        {(district.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6C6863] text-[10px] tracking-[0.12em] uppercase block font-mono">
                        24h Rainfall
                      </span>
                      <span className="font-serif text-base font-semibold" style={{ color: tier.color }}>
                        {district.rainfall_24h_mm || '—'} mm
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onSelectDistrict && onSelectDistrict(district)}
                    className="w-full mt-2 py-2 px-3 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white font-medium text-[10px] tracking-[0.18em] uppercase border border-[#1A1A1A] transition-all duration-300 flex items-center justify-center gap-1.5"
                  >
                    <span>Inspect Profile</span>
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Accessible Map Legend Overlay — Color + Distinct Shape Icon + Explicit Text */}
      <div
        className="absolute bottom-6 right-6 bg-[#FFFFFF] p-4 border border-[#1A1A1A]/15 border-t-2 border-t-[#D4AF37] shadow-[0_8px_24px_rgba(0,0,0,0.08)] text-xs space-y-2 z-[1000] max-w-[260px]"
        role="region"
        aria-label="NDMA Risk Legend with distinct icons, shapes and text labels"
      >
        <div className="border-b border-[#1A1A1A]/15 pb-1">
          <div className="font-serif font-semibold text-sm text-[#1A1A1A]">
            NDMA Risk Classification
          </div>
          <p className="text-[9px] text-[#6C6863] font-mono leading-tight mt-0.5">
            Colorblind Accessible: Shape + Icon + Text Label
          </p>
        </div>

        {/* Legend Rows: Very High, High, Moderate, Low */}
        {Object.values(NDMA_TIERS).map((t) => {
          const TierIcon = t.Icon;
          return (
            <div key={t.code} className="flex items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-2">
                {/* Shape + Icon indicator */}
                <span
                  className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: t.bgLight, border: `1.5px solid ${t.border}` }}
                  title={`${t.shape}: ${t.fullLabel}`}
                >
                  <TierIcon size={11} color={t.color} aria-hidden="true" />
                </span>

                <div>
                  <span className="font-mono font-bold" style={{ color: t.color }}>
                    {t.shortLabel} {t.symbol}
                  </span>
                  <span className="text-[#1A1A1A] ml-1 font-medium">
                    {t.label}
                  </span>
                </div>
              </div>

              {/* Threshold & Shape note */}
              <span className="text-[#6C6863] font-mono text-[9px]">
                {t.code === 4 && '≥75% (Octagon)'}
                {t.code === 3 && '55-74% (Triangle)'}
                {t.code === 2 && '30-54% (Circle)'}
                {t.code === 1 && '<30% (Check)'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
