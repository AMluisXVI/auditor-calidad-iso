import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateISOScore } from '../src/scoring/iso-scorer.js';
import type { Finding } from '@auditor/shared';

const securityFindings: Finding[] = [
  {
    id: 'f1',
    characteristic: 'Security',
    subcharacteristic: 'Integrity',
    severity: 'critical',
    file: 'a.ts',
    message: 'eval()',
    rule: 'no-eval',
  },
  {
    id: 'f2',
    characteristic: 'Security',
    subcharacteristic: 'Confidentiality',
    severity: 'major',
    file: 'b.ts',
    message: 'MD5',
    rule: 'weak-hash',
  },
];

const maintainabilityFindings: Finding[] = [
  {
    id: 'f3',
    characteristic: 'Maintainability',
    subcharacteristic: 'Analysability',
    severity: 'minor',
    file: 'c.ts',
    message: 'complex',
    rule: 'complexity',
  },
  {
    id: 'f4',
    characteristic: 'Maintainability',
    subcharacteristic: 'Reusability',
    severity: 'minor',
    file: 'd.ts',
    message: 'duplicate',
    rule: 'duplication',
  },
];

const mixedFindings: Finding[] = [...securityFindings, ...maintainabilityFindings];

describe('calculateISOScore', () => {
  it('should return all characteristics at 100% and overall 100% with no findings', () => {
    const result = calculateISOScore([]);

    assert.equal(result.overall, 100);
    assert.equal(result.characteristics['Security'], 100);
    assert.equal(result.characteristics['Maintainability'], 100);
    assert.equal(result.characteristics['Portability'], 100);
    assert.equal(result.characteristics['Functional Suitability'], 100);
    assert.equal(result.characteristics['Performance Efficiency'], 100);
    assert.equal(result.characteristics['Compatibility'], 100);
    assert.equal(result.characteristics['Usability'], 100);
    assert.equal(result.characteristics['Reliability'], 100);
  });

  it('should deduct points for a single critical finding in Security', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        characteristic: 'Security',
        subcharacteristic: 'Integrity',
        severity: 'critical',
        file: 'a.ts',
        message: 'eval()',
        rule: 'no-eval',
      },
    ];

    const result = calculateISOScore(findings);

    // Security should be 100 - 20 = 80
    assert.equal(result.characteristics['Security'], 80);
    // Other characteristics remain 100
    assert.equal(result.characteristics['Maintainability'], 100);
    // Overall is weighted average: all at 100 except Security at 80
    // overall = (0.15*100 + 0.10*100 + 0.08*100 + 0.10*100 + 0.15*100 + 0.18*80 + 0.16*100 + 0.08*100) / 1.0
    // = (15 + 10 + 8 + 10 + 15 + 14.4 + 16 + 8) / 1.0 = 96.4
    assert.equal(result.overall, 96.4);
  });

  it('should cumulate deductions for multiple findings in same characteristic', () => {
    // Security: 1 critical (-20) + 1 major (-10) = 70
    const result = calculateISOScore(securityFindings);

    assert.equal(result.characteristics['Security'], 70);
  });

  it('should score each characteristic independently for mixed findings', () => {
    const result = calculateISOScore(mixedFindings);

    // Security: -20 (critical) + -10 (major) = 70
    assert.equal(result.characteristics['Security'], 70);
    // Maintainability: -5 (minor) + -5 (minor) = 90
    assert.equal(result.characteristics['Maintainability'], 90);
    // Others remain at 100
    assert.equal(result.characteristics['Reliability'], 100);
    assert.equal(result.characteristics['Portability'], 100);
  });

  it('should floor characteristic scores at 0% with many critical findings', () => {
    const manyFindings: Finding[] = Array.from({ length: 10 }, (_, i) => ({
      id: `f${i}`,
      characteristic: 'Security',
      subcharacteristic: 'Integrity',
      severity: 'critical' as const,
      file: 'a.ts',
      message: `issue ${i}`,
      rule: 'no-eval',
    }));

    const result = calculateISOScore(manyFindings);

    // 10 critical = -200, but floor at 0
    assert.equal(result.characteristics['Security'], 0);
  });

  it('should reflect weighted average in overall — Security weighs more than Portability', () => {
    // Security at 0 (weight 0.18) vs Portability at 0 (weight 0.08)
    const securityZero: Finding[] = Array.from({ length: 6 }, (_, i) => ({
      id: `sec-${i}`,
      characteristic: 'Security',
      subcharacteristic: 'Integrity',
      severity: 'critical' as const,
      file: 'a.ts',
      message: `issue ${i}`,
      rule: 'rule',
    }));

    const portabilityZero: Finding[] = Array.from({ length: 6 }, (_, i) => ({
      id: `port-${i}`,
      characteristic: 'Portability',
      subcharacteristic: 'Adaptability',
      severity: 'critical' as const,
      file: 'a.ts',
      message: `issue ${i}`,
      rule: 'rule',
    }));

    const secResult = calculateISOScore(securityZero);
    const portResult = calculateISOScore(portabilityZero);

    // Security at 0 hurts more than Portability at 0 because weight is higher
    assert.ok(
      secResult.overall < portResult.overall,
      `Security at 0 (overall: ${secResult.overall}) should hurt more than Portability at 0 (overall: ${portResult.overall})`
    );
  });

  it('should use custom severity penalties when provided', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        characteristic: 'Security',
        subcharacteristic: 'Integrity',
        severity: 'critical',
        file: 'a.ts',
        message: 'issue',
        rule: 'rule',
      },
    ];

    const result = calculateISOScore(findings, {
      severityPenalties: { critical: 50, major: 25, minor: 10, info: 5 },
    });

    // Custom: critical = -50 → Security = 50
    assert.equal(result.characteristics['Security'], 50);
  });

  it('should use custom weights when provided', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        characteristic: 'Security',
        subcharacteristic: 'Integrity',
        severity: 'critical',
        file: 'a.ts',
        message: 'issue',
        rule: 'rule',
      },
    ];

    // Give Security all the weight
    const customWeights: Record<string, number> = {
      'Functional Suitability': 0,
      'Performance Efficiency': 0,
      'Compatibility': 0,
      'Usability': 0,
      'Reliability': 0,
      'Security': 1.0,
      'Maintainability': 0,
      'Portability': 0,
    };

    const result = calculateISOScore(findings, { weights: customWeights });

    // Security is 80 and has 100% weight → overall = 80
    assert.equal(result.overall, 80);
  });

  it('should ignore findings with unknown characteristic without crashing', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        characteristic: 'UnknownCharacteristic',
        subcharacteristic: 'Something',
        severity: 'critical',
        file: 'a.ts',
        message: 'issue',
        rule: 'rule',
      },
      {
        id: 'f2',
        characteristic: 'Security',
        subcharacteristic: 'Integrity',
        severity: 'major',
        file: 'b.ts',
        message: 'real issue',
        rule: 'rule',
      },
    ];

    const result = calculateISOScore(findings);

    // Unknown finding ignored, Security still affected
    assert.equal(result.characteristics['Security'], 90);
    // All other characteristics at 100 — unknown didn't affect anything
    assert.equal(result.characteristics['Maintainability'], 100);
  });
});
