/**
 * BhoomiSafe — NDMA Risk Tier Definitions & Accessibility Helpers
 * 
 * WCAG 2.1 Compliant (Criterion 1.4.1 - Use of Color):
 * Ensures NDMA risk color tiers (Green/Yellow/Orange/Red) are NEVER
 * conveyed by color alone. Each tier is strictly paired with:
 * 1. A distinct geometric icon (CheckCircle vs AlertCircle vs AlertTriangle vs AlertOctagon)
 * 2. An explicit textual label ("Tier 1: Low", "Tier 2: Moderate", "Tier 3: High", "Tier 4: Very High")
 * 3. A text/shape symbol ("✓", "ℹ", "▲", "🛑")
 * 4. Distinct stroke/dash patterns and ARIA descriptions for assistive technologies.
 */

import { AlertOctagon, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

export const NDMA_TIERS = {
  VERY_HIGH: {
    code: 4,
    tierName: 'Tier 4',
    shortLabel: 'T4',
    label: 'Very High',
    fullLabel: 'Tier 4: Very High',
    advisory: 'Critical Evacuation Warning',
    color: '#EF4444',
    bgLight: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.5)',
    symbol: '🛑',
    shape: 'Octagon',
    Icon: AlertOctagon,
    dashArray: 'none',
    weight: 2.5,
    radius: 14,
    ariaLabel: 'NDMA Tier 4: Very High Risk (Critical Evacuation Warning)',
  },
  HIGH: {
    code: 3,
    tierName: 'Tier 3',
    shortLabel: 'T3',
    label: 'High',
    fullLabel: 'Tier 3: High',
    advisory: 'High Risk Warning Advisory',
    color: '#F97316',
    bgLight: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.5)',
    symbol: '▲',
    shape: 'Triangle',
    Icon: AlertTriangle,
    dashArray: '5, 3',
    weight: 2.0,
    radius: 11,
    ariaLabel: 'NDMA Tier 3: High Risk (Warning Advisory)',
  },
  MODERATE: {
    code: 2,
    tierName: 'Tier 2',
    shortLabel: 'T2',
    label: 'Moderate',
    fullLabel: 'Tier 2: Moderate',
    advisory: 'Advisory Watch & Monitor',
    color: '#EAB308',
    bgLight: 'rgba(234, 179, 8, 0.15)',
    border: 'rgba(234, 179, 8, 0.5)',
    symbol: 'ℹ',
    shape: 'Circle-Info',
    Icon: AlertCircle,
    dashArray: '3, 3',
    weight: 1.8,
    radius: 9,
    ariaLabel: 'NDMA Tier 2: Moderate Risk (Advisory Watch)',
  },
  LOW: {
    code: 1,
    tierName: 'Tier 1',
    shortLabel: 'T1',
    label: 'Low',
    fullLabel: 'Tier 1: Low',
    advisory: 'Normal / Routine Monitoring',
    color: '#22C55E',
    bgLight: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.5)',
    symbol: '✓',
    shape: 'Check-Circle',
    Icon: CheckCircle2,
    dashArray: '1, 3',
    weight: 1.5,
    radius: 7,
    ariaLabel: 'NDMA Tier 1: Low Risk (Normal Conditions)',
  },
};

/**
 * Resolve any risk indicator string or numeric probability/code into a normalized NDMA tier object.
 */
export function getRiskTier(levelOrProbOrCode) {
  if (typeof levelOrProbOrCode === 'number') {
    // If it's a risk code 1-4
    if (levelOrProbOrCode === 4) return NDMA_TIERS.VERY_HIGH;
    if (levelOrProbOrCode === 3) return NDMA_TIERS.HIGH;
    if (levelOrProbOrCode === 2) return NDMA_TIERS.MODERATE;
    if (levelOrProbOrCode === 1) return NDMA_TIERS.LOW;

    // Otherwise treat as probability [0.0, 1.0]
    if (levelOrProbOrCode >= 0.75) return NDMA_TIERS.VERY_HIGH;
    if (levelOrProbOrCode >= 0.55) return NDMA_TIERS.HIGH;
    if (levelOrProbOrCode >= 0.30) return NDMA_TIERS.MODERATE;
    return NDMA_TIERS.LOW;
  }

  if (typeof levelOrProbOrCode === 'string') {
    const norm = levelOrProbOrCode.trim().toUpperCase().replace(/[\s-]/g, '_');
    if (norm === 'VERY_HIGH' || norm === 'CRITICAL' || norm === 'RED') {
      return NDMA_TIERS.VERY_HIGH;
    }
    if (norm === 'HIGH' || norm === 'ORANGE') {
      return NDMA_TIERS.HIGH;
    }
    if (norm === 'MODERATE' || norm === 'MEDIUM' || norm === 'YELLOW' || norm === 'WARNING') {
      return NDMA_TIERS.MODERATE;
    }
    if (norm === 'LOW' || norm === 'GREEN' || norm === 'SAFE') {
      return NDMA_TIERS.LOW;
    }
  }

  return NDMA_TIERS.LOW;
}
