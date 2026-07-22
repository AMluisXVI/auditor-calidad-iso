import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateReport } from '../src/generator.js';
import type { ReportInput } from '../src/generator.js';
import type { Finding, MaturityResult, ComplexityMetrics, DuplicationResult } from '@auditor/shared';

const sampleInput: ReportInput = {
  requestId: 'test-123',
  findings: [
    {
      id: 'f1',
      characteristic: 'Security',
      subcharacteristic: 'Integrity',
      severity: 'critical',
      file: 'app.ts',
      line: 10,
      message: 'eval() usage',
      rule: 'eval-usage',
    },
    {
      id: 'f2',
      characteristic: 'Maintainability',
      subcharacteristic: 'Analysability',
      severity: 'minor',
      file: 'utils.ts',
      line: 25,
      message: 'High complexity',
      rule: 'high-cyclomatic-complexity',
    },
  ],
  score: {
    overall: 85.5,
    characteristics: {
      'Functional Suitability': 100,
      'Performance Efficiency': 100,
      Compatibility: 100,
      Usability: 100,
      Reliability: 100,
      Security: 80,
      Maintainability: 95,
      Portability: 100,
    },
  },
  maturity: [
    { checkId: 'MAT-001', passed: true, evidence: 'README.md' },
    { checkId: 'MAT-002', passed: false, details: 'No LICENSE found' },
  ],
};

describe('generateReport', () => {
  it('generates a report with unique ID and timestamp', () => {
    const report = generateReport(sampleInput);

    assert.ok(report.id, 'Report should have an ID');
    assert.ok(report.id.includes('-'), 'Report ID should be a UUID');
    assert.equal(report.requestId, 'test-123');
    assert.ok(report.generatedAt, 'Report should have a timestamp');
    assert.ok(
      !isNaN(Date.parse(report.generatedAt)),
      'Timestamp should be valid ISO date',
    );
  });

  it('returns empty recommendations for empty findings', () => {
    const input: ReportInput = {
      requestId: 'empty-test',
      findings: [],
      score: {
        overall: 100,
        characteristics: {
          'Functional Suitability': 100,
          'Performance Efficiency': 100,
          Compatibility: 100,
          Usability: 100,
          Reliability: 100,
          Security: 100,
          Maintainability: 100,
          Portability: 100,
        },
      },
    };

    const report = generateReport(input);

    assert.equal(report.recommendations.length, 0);
    assert.ok(report.markdown.includes('No findings detected'));
    assert.ok(report.markdown.includes('No specific recommendations'));
  });

  it('matches findings to catalog recommendations', () => {
    const report = generateReport(sampleInput);

    assert.equal(report.recommendations.length, 2);

    const evalRec = report.recommendations.find((r) => r.findingId === 'f1');
    assert.ok(evalRec, 'Should have recommendation for eval finding');
    assert.equal(evalRec.id, 'REC-005');
    assert.equal(evalRec.priority, 'high');
    assert.equal(evalRec.effort, 'low');

    const complexityRec = report.recommendations.find((r) => r.findingId === 'f2');
    assert.ok(complexityRec, 'Should have recommendation for complexity finding');
    assert.equal(complexityRec.id, 'REC-001');
    assert.equal(complexityRec.priority, 'high');
    assert.equal(complexityRec.effort, 'medium');
  });

  it('markdown contains all required sections', () => {
    const report = generateReport(sampleInput);

    assert.ok(report.markdown.includes('# 🔍 ISO 25010 Quality Audit Report'));
    assert.ok(report.markdown.includes('## Summary'));
    assert.ok(report.markdown.includes('## Quality Scores by Characteristic'));
    assert.ok(report.markdown.includes('## Findings'));
    assert.ok(report.markdown.includes('## Recommendations'));
    assert.ok(report.markdown.includes('## Maturity Assessment'));
  });

  it('JSON output has correct structure', () => {
    const report = generateReport(sampleInput);
    const json = report.json as Record<string, unknown>;

    assert.equal(json.id, report.id);
    assert.equal(json.requestId, 'test-123');
    assert.equal(json.generatedAt, report.generatedAt);
    assert.ok(json.score);
    assert.ok(Array.isArray(json.findings));
    assert.ok(Array.isArray(json.recommendations));
    assert.ok(Array.isArray(json.maturity));
  });

  it('recommendations are linked to findings by findingId', () => {
    const report = generateReport(sampleInput);

    for (const rec of report.recommendations) {
      const matchingFinding = sampleInput.findings.find((f) => f.id === rec.findingId);
      assert.ok(
        matchingFinding,
        `Recommendation ${rec.id} should be linked to an existing finding`,
      );
    }
  });

  it('score visual bars render correctly', () => {
    const report = generateReport(sampleInput);

    // Security at 80% → 8 filled, 2 empty
    assert.ok(report.markdown.includes('████████░░'));
    // 100% → all filled
    assert.ok(report.markdown.includes('██████████'));
  });

  it('maturity results are included when provided', () => {
    const report = generateReport(sampleInput);

    assert.ok(report.markdown.includes('Maturity Assessment'));
    assert.ok(report.markdown.includes('1/2 checks passed'));
    assert.ok(report.markdown.includes('✅'));
    assert.ok(report.markdown.includes('❌'));
    assert.ok(report.markdown.includes('MAT-001'));
    assert.ok(report.markdown.includes('MAT-002'));
    assert.ok(report.markdown.includes('README.md'));
    assert.ok(report.markdown.includes('No LICENSE found'));
  });

  it('complexity metrics are summarized correctly', () => {
    const inputWithComplexity: ReportInput = {
      ...sampleInput,
      complexity: {
        file: 'main.ts',
        functions: [
          { name: 'processData', complexity: 15, loc: 80 },
          { name: 'validate', complexity: 10, loc: 45 },
          { name: 'transform', complexity: 8, loc: 30 },
          { name: 'render', complexity: 6, loc: 25 },
          { name: 'init', complexity: 5, loc: 20 },
          { name: 'helper', complexity: 2, loc: 5 },
        ],
        aggregate: { avg: 7.7, max: 15, total: 46 },
      },
    };

    const report = generateReport(inputWithComplexity);

    assert.ok(report.markdown.includes('## Complexity Summary'));
    assert.ok(report.markdown.includes('7.7'));
    assert.ok(report.markdown.includes('15'));
    assert.ok(report.markdown.includes('46'));
    // Top 5 functions should appear
    assert.ok(report.markdown.includes('processData'));
    assert.ok(report.markdown.includes('validate'));
    assert.ok(report.markdown.includes('transform'));
    assert.ok(report.markdown.includes('render'));
    assert.ok(report.markdown.includes('init'));
    // 6th function should NOT appear (only top 5)
    assert.ok(!report.markdown.includes('helper'));
  });

  it('duplication summary is included when provided', () => {
    const inputWithDuplication: ReportInput = {
      ...sampleInput,
      duplication: {
        clones: [
          {
            sourceFile: 'a.ts',
            sourceLine: 1,
            targetFile: 'b.ts',
            targetLine: 1,
            lines: 10,
            tokens: 50,
          },
        ],
        statistics: {
          totalClones: 3,
          duplicatedLines: 45,
          percentage: 12.5,
        },
      },
    };

    const report = generateReport(inputWithDuplication);

    assert.ok(report.markdown.includes('## Duplication Summary'));
    assert.ok(report.markdown.includes('3'));
    assert.ok(report.markdown.includes('45'));
    assert.ok(report.markdown.includes('12.5%'));
  });

  it('generates unique IDs for different reports', () => {
    const report1 = generateReport(sampleInput);
    const report2 = generateReport(sampleInput);

    assert.notEqual(report1.id, report2.id);
  });
});
