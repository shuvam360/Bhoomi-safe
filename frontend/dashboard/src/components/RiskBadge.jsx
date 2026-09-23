import React from 'react';
import { getRiskTier } from '../utils/riskTiers';

/**
 * Accessible Risk Badge Component
 * Guarantees risk is never conveyed by color alone:
 * - Geometric shape icon
 * - Text label with tier number
 * - High-contrast text & border
 */
export default function RiskBadge({ level, showSymbol = true, showTier = true, size = 'md', className = '' }) {
  const tier = getRiskTier(level);
  const Icon = tier.Icon;

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 16,
  };

  const fontSizes = {
    sm: '0.62rem',
    md: '0.68rem',
    lg: '0.78rem',
  };

  const paddings = {
    sm: '2px 6px',
    md: '3px 9px',
    lg: '4px 12px',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium uppercase tracking-wider rounded border ${className}`}
      style={{
        backgroundColor: tier.bgLight,
        color: tier.color,
        borderColor: tier.border,
        fontSize: fontSizes[size] || fontSizes.md,
        padding: paddings[size] || paddings.md,
        lineHeight: 1.2,
      }}
      title={tier.ariaLabel}
      aria-label={tier.ariaLabel}
      role="status"
    >
      <Icon size={iconSizes[size] || iconSizes.md} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span>
        {showTier && <strong style={{ marginRight: '4px', letterSpacing: '0.05em' }}>{tier.shortLabel}</strong>}
        {tier.label}
      </span>
      {showSymbol && (
        <span style={{ fontSize: '0.85em', opacity: 0.8 }} aria-hidden="true">
          {tier.symbol}
        </span>
      )}
    </span>
  );
}
