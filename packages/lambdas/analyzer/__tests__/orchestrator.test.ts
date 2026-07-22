import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAnalysis } from '../src/orchestrator.js';

const testFiles = new Map<string, string>([
  ['src/index.ts', `
    import { something } from './utils';
    const password = "admin123";
    const result = eval(input);
    export function main() { return true; }
  `],
  ['src/utils.ts', `
    export function calculate(a: number, b: number): number {
      return a + b;
    }
  `],
]);

const testFileList = ['src/index.ts', 'src/utils.ts', 'README.md', 'package.json'];

describe('runAnalysis orchestrator', () => {
  it('runs all analyzers and returns AnalysisResult with all fields populated', async () => {
    const result = await runAnalysis({
      requestId: 'test-001',
      files: testFiles,
      fileList: testFileList,
    });

    assert.equal(result.requestId, 'test-001');
    assert.equal(result.status, 'completed');
    assert.ok(result.timestamp);
    assert.ok(Array.isArray(result.findings));
    assert.ok(Array.isArray(result.recommendations));
    assert.ok(result.score);
    assert.ok(typeof result.score.overall === 'number');
    assert.ok(result.score.characteristics);
    assert.ok(result.complexity);
    assert.ok(result.duplication);
    assert.ok(result.maturity);
  });

  it('combined findings include security and complexity results', async () => {
    const result = await runAnalysis({
      requestId: 'test-002',
      files: testFiles,
      fileList: testFileList,
    });

    const securityFindings = result.findings.filter(
      (f) => f.characteristic === 'Security'
    );
    assert.ok(securityFindings.length > 0, 'Should have security findings from eval() and hardcoded password');

    // Check that eval detection is present
    const evalFinding = result.findings.find((f) => f.rule === 'no-eval');
    assert.ok(evalFinding, 'Should detect eval() usage');

    // Check hardcoded credentials detection
    const credsFinding = result.findings.find((f) => f.rule === 'hardcoded-credentials');
    assert.ok(credsFinding, 'Should detect hardcoded password');
  });

  it('ISO score is calculated from all findings', async () => {
    const result = await runAnalysis({
      requestId: 'test-003',
      files: testFiles,
      fileList: testFileList,
    });

    // With security findings, the Security characteristic should be penalized
    assert.ok(result.score.overall >= 0 && result.score.overall <= 100);
    assert.ok(
      result.score.characteristics['Security'] < 100,
      'Security score should be penalized due to findings'
    );
  });

  it('maturity results reflect the file list', async () => {
    const result = await runAnalysis({
      requestId: 'test-004',
      files: testFiles,
      fileList: testFileList,
    });

    assert.ok(Array.isArray(result.maturity));
    assert.ok(result.maturity!.length > 0, 'Should have maturity check results');

    // README.md is in fileList so the MAT-001 (Has README) check should pass
    const readmeCheck = result.maturity!.find(
      (m) => m.checkId === 'MAT-001' && m.passed
    );
    assert.ok(readmeCheck, 'README.md should pass the MAT-001 maturity check');
  });

  it('empty file map returns a valid result with high score', async () => {
    const emptyFiles = new Map<string, string>();

    const result = await runAnalysis({
      requestId: 'test-005',
      files: emptyFiles,
      fileList: [],
    });

    assert.equal(result.requestId, 'test-005');
    assert.equal(result.status, 'completed');
    assert.ok(Array.isArray(result.findings));
    assert.ok(result.score.overall >= 0);
  });

  it('only JS/TS files are analyzed for code quality (non-code files excluded)', async () => {
    const mixedFiles = new Map<string, string>([
      ['src/app.ts', `
        export function greet(name: string): string {
          return 'Hello ' + name;
        }
      `],
      ['README.md', `
        # Project
        const password = "should-not-be-detected";
        eval("this is markdown, not code");
      `],
      ['config.json', `
        { "password": "secret123" }
      `],
    ]);

    const result = await runAnalysis({
      requestId: 'test-006',
      files: mixedFiles,
      fileList: ['src/app.ts', 'README.md', 'config.json'],
    });

    // Non-code files should NOT produce security findings
    const markdownFindings = result.findings.filter((f) => f.file === 'README.md');
    assert.equal(markdownFindings.length, 0, 'Markdown files should not be analyzed for code issues');

    const jsonFindings = result.findings.filter((f) => f.file === 'config.json');
    assert.equal(jsonFindings.length, 0, 'JSON files should not be analyzed for code issues');
  });
});
