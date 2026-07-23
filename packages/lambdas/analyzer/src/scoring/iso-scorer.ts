import type { Finding, ISOScore } from '@auditor/shared';
import { ISO25010_CHARACTERISTICS, DEFAULT_CHARACTERISTIC_WEIGHTS } from '@auditor/shared';

export interface ScoringOptions {
  weights?: Record<string, number>;
  maxDeductions?: number;
  severityPenalties?: Record<string, number>;
}

const DEFAULT_SEVERITY_PENALTIES: Record<string, number> = {
  critical: 20,
  major: 10,
  minor: 5,
  info: 2,
};

/**
 * Calculates ISO 25010 quality scores from a set of findings.
 *
 * Scoring algorithm:
 * 1. Start each characteristic at 100%
 * 2. Deduct points per finding based on severity
 * 3. Floor each characteristic at 0%
 * 4. Overall = weighted average of all characteristics
 */
export function calculateISOScore(
  findings: Finding[],
  options?: ScoringOptions
): ISOScore {
  const weights = options?.weights ?? DEFAULT_CHARACTERISTIC_WEIGHTS;
  const severityPenalties = options?.severityPenalties ?? DEFAULT_SEVERITY_PENALTIES;
  const maxDeductions = options?.maxDeductions ?? 100;

  const validCharacteristics = new Set<string>(ISO25010_CHARACTERISTICS);

  // Initialize all characteristics at 100
  const scores: Record<string, number> = {};
  for (const char of ISO25010_CHARACTERISTICS) {
    scores[char] = 100;
  }

  // Accumulate deductions per characteristic
  const deductions: Record<string, number> = {};
  for (const char of ISO25010_CHARACTERISTICS) {
    deductions[char] = 0;
  }

  for (const finding of findings) {
    if (!validCharacteristics.has(finding.characteristic)) {
      console.warn(
        `[iso-scorer] Unknown characteristic "${finding.characteristic}" in finding "${finding.id}" — ignoring.`
      );
      continue;
    }

    const penalty = severityPenalties[finding.severity] ?? 0;
    deductions[finding.characteristic] += penalty;
  }

  // Apply deductions with cap and floor
  for (const char of ISO25010_CHARACTERISTICS) {
    const totalDeduction = Math.min(deductions[char], maxDeductions);
    scores[char] = Math.max(0, 100 - totalDeduction);
    scores[char] = round1(scores[char]);
  }

  // Calculate weighted average for overall score
  let weightedSum = 0;
  let totalWeight = 0;

  for (const char of ISO25010_CHARACTERISTICS) {
    const w = (weights as Record<string, number>)[char] ?? 0;
    weightedSum += scores[char] * w;
    totalWeight += w;
  }

  const overall = totalWeight > 0 ? round1(weightedSum / totalWeight) : 0;

  return {
    overall,
    characteristics: { ...scores },
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
