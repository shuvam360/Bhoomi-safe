import React from 'react';
import { X } from 'lucide-react';
import { getRiskTier } from '../utils/riskTiers';

export default function AlertBanner({ type = 'critical', riskLevel, title, message, onDismiss }) {
  // Determine normalized NDMA tier
  const tier = getRiskTier(riskLevel || type);
  const TierIcon = tier.Icon;

  // Distinct border dash style for monochrome / colorblind distinction
  const borderLeftStyles = {
    4: '4px solid #EF4444',
    3: '4px dashed #F97316',
    2: '4px dotted #EAB308',
    1: '4px solid #22C55E',
  }[tier.code] || '4px solid #EF4444';

  return (
    <div
      className="alert-banner"
      role="alert"
      aria-label={`${tier.ariaLabel}: ${title || tier.advisory}. ${message}`}
      style={{
        borderRadius: '8px',
        backgroundColor: tier.bgLight,
        borderColor: tier.border,
        borderLeft: borderLeftStyles,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        padding: '16px 20px',
        marginBottom: '24px',
      }}
    >
      {/* Accessible Distinct Shape Icon */}
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: tier.code === 4 ? '4px' : '8px',
          flexShrink: 0,
          backgroundColor: tier.bgLight,
          border: `1.5px solid ${tier.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={`${tier.shape}: ${tier.fullLabel}`}
      >
        <TierIcon size={22} color={tier.color} aria-hidden="true" />
      </div>

      {/* Content with Explicit Text Label & NDMA Tier */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          {/* Explicit Text Badge with Symbol & Tier */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.66rem',
              fontWeight: 700,
              color: tier.color,
              backgroundColor: 'rgba(0,0,0,0.25)',
              border: `1px solid ${tier.border}`,
              padding: '2px 8px',
              borderRadius: '3px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <span aria-hidden="true">{tier.symbol}</span>
            <span>{tier.tierName}: {tier.label}</span>
            <span style={{ opacity: 0.7, fontSize: '0.9em' }}>({tier.shape})</span>
          </span>

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            {tier.advisory}
          </span>
        </div>

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '0.94rem',
            color: 'var(--text-primary)',
            marginBottom: '3px',
          }}
        >
          {title || `${tier.fullLabel} Advisory Active`}
        </div>

        <p
          style={{
            fontSize: '0.80rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {message}
        </p>
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss alert advisory"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(241,245,249,0.08)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
