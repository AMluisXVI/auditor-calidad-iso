import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMaturity, matchesGlob } from '../src/analyzers/maturity.js';
import type { MaturityCheck } from '@auditor/shared';

const fullRepo = [
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  '.github/workflows/ci.yml',
  '__tests__/app.test.ts',
  'SECURITY.md',
  '.env.example',
  'CHANGELOG.md',
  'eslint.config.js',
  'Dockerfile',
  'pnpm-lock.yaml',
  'tsconfig.json',
];

const minimalRepo = [
  'src/index.ts',
  'package.json',
];

const partialRepo = [
  'README.md',
  'LICENSE',
  'src/index.ts',
  'tsconfig.json',
  'pnpm-lock.yaml',
];

describe('analyzeMaturity', () => {
  it('should return 100% score for a repository with all maturity signals', () => {
    const result = analyzeMaturity(fullRepo);

    assert.equal(result.score, 100);
    assert.equal(result.earnedScore, result.maxScore);
    assert.equal(result.findings.length, 0);
    assert.ok(result.results.every((r) => r.passed));
  });

  it('should return 0% score for an empty repository', () => {
    const result = analyzeMaturity([]);

    assert.equal(result.score, 0);
    assert.equal(result.earnedScore, 0);
    assert.ok(result.maxScore > 0);
    assert.ok(result.results.every((r) => !r.passed));
    assert.equal(result.findings.length, result.results.length);
  });

  it('should return correct score for a partial repository', () => {
    const result = analyzeMaturity(partialRepo);

    // README (3) + LICENSE (2) + tsconfig (2) + lockfile (2) = 9 out of 24 total
    assert.ok(result.score > 0);
    assert.ok(result.score < 100);
    assert.equal(result.earnedScore, 9);
    assert.equal(result.maxScore, 24);
    assert.equal(result.score, Math.round((9 / 24) * 100));
  });

  it('should calculate weight-based scoring correctly', () => {
    const customChecks: MaturityCheck[] = [
      { id: 'C1', name: 'Heavy', description: 'High weight', weight: 3, category: 'documentation', filePatterns: ['README.md'] },
      { id: 'C2', name: 'Light', description: 'Low weight', weight: 1, category: 'documentation', filePatterns: ['CONTRIBUTING.md'] },
    ];

    // Only the heavy one passes
    const result = analyzeMaturity(['README.md'], { checks: customChecks });
    assert.equal(result.maxScore, 4);
    assert.equal(result.earnedScore, 3);
    assert.equal(result.score, 75); // 3/4 = 75%
  });

  it('should generate findings with correct severity based on check weight', () => {
    const customChecks: MaturityCheck[] = [
      { id: 'W3', name: 'Weight 3', description: 'Major', weight: 3, category: 'documentation', filePatterns: ['MISSING1'] },
      { id: 'W2', name: 'Weight 2', description: 'Minor', weight: 2, category: 'tooling', filePatterns: ['MISSING2'] },
      { id: 'W1', name: 'Weight 1', description: 'Info', weight: 1, category: 'documentation', filePatterns: ['MISSING3'] },
    ];

    const result = analyzeMaturity([], { checks: customChecks });

    const findingW3 = result.findings.find((f) => f.rule === 'maturity-W3');
    const findingW2 = result.findings.find((f) => f.rule === 'maturity-W2');
    const findingW1 = result.findings.find((f) => f.rule === 'maturity-W1');

    assert.equal(findingW3?.severity, 'major');
    assert.equal(findingW2?.severity, 'minor');
    assert.equal(findingW1?.severity, 'info');
  });

  it('should accept custom checks via options', () => {
    const customChecks: MaturityCheck[] = [
      { id: 'CUSTOM-1', name: 'Custom Check', description: 'A custom check', weight: 2, category: 'quality', filePatterns: ['custom.config.js'] },
    ];

    const result = analyzeMaturity(['custom.config.js'], { checks: customChecks });

    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].checkId, 'CUSTOM-1');
    assert.equal(result.results[0].passed, true);
    assert.equal(result.score, 100);
  });

  it('should map category to correct characteristic in findings', () => {
    const checks: MaturityCheck[] = [
      { id: 'DOC', name: 'Doc', description: 'Docs', weight: 1, category: 'documentation', filePatterns: ['MISSING'] },
      { id: 'TOOL', name: 'Tool', description: 'Tooling', weight: 1, category: 'tooling', filePatterns: ['MISSING'] },
      { id: 'SEC', name: 'Sec', description: 'Security', weight: 1, category: 'security', filePatterns: ['MISSING'] },
    ];

    const result = analyzeMaturity([], { checks });

    const docFinding = result.findings.find((f) => f.rule === 'maturity-DOC');
    const toolFinding = result.findings.find((f) => f.rule === 'maturity-TOOL');
    const secFinding = result.findings.find((f) => f.rule === 'maturity-SEC');

    assert.equal(docFinding?.characteristic, 'Reliability');
    assert.equal(toolFinding?.characteristic, 'Maintainability');
    assert.equal(secFinding?.characteristic, 'Security');
  });

  it('should include evidence (matched file path) when check passes', () => {
    const result = analyzeMaturity(['README.md']);

    const readmeResult = result.results.find((r) => r.checkId === 'MAT-001');
    assert.ok(readmeResult);
    assert.equal(readmeResult.passed, true);
    assert.equal(readmeResult.evidence, 'README.md');
  });

  it('should return 0% for minimal repo with no maturity signals', () => {
    const result = analyzeMaturity(minimalRepo);

    assert.equal(result.score, 0);
    assert.equal(result.earnedScore, 0);
  });
});

describe('matchesGlob', () => {
  it('should match exact filenames', () => {
    assert.ok(matchesGlob('README.md', 'README.md'));
    assert.ok(matchesGlob('LICENSE', 'LICENSE'));
  });

  it('should match case-insensitively', () => {
    assert.ok(matchesGlob('readme.md', 'README.md'));
    assert.ok(matchesGlob('README.MD', 'readme.md'));
    assert.ok(matchesGlob('Changelog.md', 'CHANGELOG.md'));
  });

  it('should match * pattern (any chars except /)', () => {
    assert.ok(matchesGlob('.github/workflows/ci.yml', '.github/workflows/*.yml'));
    assert.ok(matchesGlob('.github/workflows/deploy.yaml', '.github/workflows/*.yaml'));
    assert.ok(!matchesGlob('.github/workflows/nested/ci.yml', '.github/workflows/*.yml'));
  });

  it('should match ** pattern (any path segments)', () => {
    assert.ok(matchesGlob('__tests__/app.test.ts', '__tests__/**'));
    assert.ok(matchesGlob('__tests__/nested/deep/file.ts', '__tests__/**'));
    assert.ok(matchesGlob('src/components/Button.test.ts', '**/*.test.ts'));
    assert.ok(matchesGlob('app.test.ts', '**/*.test.ts'));
  });

  it('should not match unrelated paths', () => {
    assert.ok(!matchesGlob('src/index.ts', 'README.md'));
    assert.ok(!matchesGlob('package.json', '.github/workflows/*.yml'));
  });

  it('should match tsconfig patterns', () => {
    assert.ok(matchesGlob('tsconfig.json', 'tsconfig.json'));
    assert.ok(matchesGlob('tsconfig.build.json', 'tsconfig.*.json'));
  });

  it('should handle eslintrc wildcard pattern', () => {
    assert.ok(matchesGlob('.eslintrc.js', '.eslintrc*'));
    assert.ok(matchesGlob('.eslintrc.json', '.eslintrc*'));
    assert.ok(matchesGlob('eslint.config.js', 'eslint.config.js'));
  });
});
