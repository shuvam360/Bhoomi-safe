import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getRiskTier } from '../utils/riskTiers';

export default function StatCard({
  title,
  value,
  label,
  icon: Icon,
  color = 'amber',
  change,
  changeType,
  subtitle,
  riskLevel,
}) {
  const tier = riskLevel ? getRiskTier(riskLevel) : null;
  const TierIcon = tier ? tier.Icon : null;

  const iconTheme = {
    amber:   { wrap: 'stat-icon-wrap', color: 'var(--accent)' },
    teal:    { wrap: 'stat-icon-wrap teal', color: 'var(--teal)' },
    danger:  { wrap: 'stat-icon-wrap danger', color: '#EF4444' },
    success: { wrap: 'stat-icon-wrap success', color: '#22C55E' },
    orange:  { wrap: 'stat-icon-wrap warning', color: '#F97316' },
  }[color] || { wrap: 'stat-icon-wrap', color: 'var(--accent)' };

  const changeClass = changeType === 'up' ? 'stat-change positive'
    : changeType === 'down' ? 'stat-change negative'
    : 'stat-change';

  const ChangeIcon = changeType === 'up' ? TrendingUp
    : changeType === 'down' ? TrendingDown
    : Minus;

  // If a risk tier is defined, use its icon if no specific Icon is provided
  const DisplayIcon = Icon || TierIcon;

  return (
    <div
      className="stat-card animate-in"
      role="region"
      aria-label={`${title || label}: ${value}${tier ? ` - ${tier.ariaLabel}` : ''}`}
    >
      <div className="stat-card-inner">
        <div>
          <div className="stat-label">{title || label}</div>
        </div>
        {DisplayIcon && (
          <div
            className={iconTheme.wrap}
            style={tier ? { backgroundColor: tier.bgLight, borderColor: tier.border } : {}}
            title={tier ? tier.ariaLabel : undefined}
          >
            <DisplayIcon size={16} color={tier ? tier.color : iconTheme.color} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="stat-value">{value}</div>

      {/* Accessible NDMA Risk Tier Indicator: Icon + Text Label */}
      {tier && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '6px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: tier.bgLight,
            border: `1px solid ${tier.border}`,
            color: tier.color,
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
          title={tier.ariaLabel}
          aria-label={tier.ariaLabel}
        >
          <TierIcon size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>{tier.fullLabel}</span>
          <span aria-hidden="true" style={{ opacity: 0.85 }}>{tier.symbol}</span>
        </div>
      )}

      {subtitle && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
          {subtitle}
        </div>
      )}

      {change && (
        <div className={changeClass} style={{ marginTop: '10px' }}>
          <ChangeIcon size={10} aria-hidden="true" />
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}
