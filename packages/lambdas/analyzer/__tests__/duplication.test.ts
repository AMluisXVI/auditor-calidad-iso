import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDuplication } from '../src/analyzers/duplication.js';

const fileA = `
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
    if (item.discount) {
      total -= item.discount;
    }
  }
  return total;
}
`;

const fileB = `
function computeSum(products) {
  let total = 0;
  for (const item of products) {
    total += item.price * item.quantity;
    if (item.discount) {
      total -= item.discount;
    }
  }
  return total;
}
`;

const uniqueFile = `
function uniqueLogic() {
  return Math.random() * Date.now();
}
`;

describe('analyzeDuplication', () => {
  it('should detect clones between two files with identical blocks', async () => {
    const files = new Map<string, string>();
    files.set('fileA.ts', fileA);
    files.set('fileB.ts', fileB);

    const { result } = await analyzeDuplication(files, {
      minLines: 5,
      minTokens: 10,
    });

    assert.ok(result.clones.length > 0, 'Should detect at least one clone');
    assert.ok(result.statistics.totalClones > 0);

    const clone = result.clones[0];
    assert.equal(clone.sourceFile, 'fileA.ts');
    assert.equal(clone.targetFile, 'fileB.ts');
    assert.ok(clone.lines >= 5);
    assert.ok(clone.tokens > 0);
  });

  it('should return empty results when files have no duplication', async () => {
    const files = new Map<string, string>();
    files.set('unique.ts', uniqueFile);
    files.set('fileA.ts', fileA);

    const { result } = await analyzeDuplication(files, {
      minLines: 5,
      minTokens: 10,
    });

    // These two files are completely different, so no clones
    const crossFileClones = result.clones.filter(
      (c) =>
        (c.sourceFile === 'unique.ts' && c.targetFile === 'fileA.ts') ||
        (c.sourceFile === 'fileA.ts' && c.targetFile === 'unique.ts')
    );
    assert.equal(crossFileClones.length, 0);
  });

  it('should report correct statistics', async () => {
    const files = new Map<string, string>();
    files.set('fileA.ts', fileA);
    files.set('fileB.ts', fileB);

    const { result } = await analyzeDuplication(files, {
      minLines: 5,
      minTokens: 10,
    });

    assert.equal(result.statistics.totalClones, result.clones.length);
    assert.ok(result.statistics.duplicatedLines >= 0);
    assert.ok(result.statistics.percentage >= 0);
    assert.ok(result.statistics.percentage <= 100);
  });

  it('should generate findings when threshold is exceeded', async () => {
    const files = new Map<string, string>();
    files.set('fileA.ts', fileA);
    files.set('fileB.ts', fileB);

    // Use a very low threshold to ensure findings are generated
    const { result, findings } = await analyzeDuplication(files, {
      minLines: 5,
      minTokens: 10,
      threshold: 0,
    });

    assert.ok(result.clones.length > 0, 'Should have clones to generate findings from');
    assert.ok(findings.length > 0, 'Should generate findings when threshold is exceeded');

    const finding = findings[0];
    assert.equal(finding.characteristic, 'Maintainability');
    assert.equal(finding.subcharacteristic, 'Reusability');
    assert.equal(finding.rule, 'code-duplication');
    assert.ok(finding.id.startsWith('duplication-'));
    assert.ok(['critical', 'major', 'minor', 'info'].includes(finding.severity));
    assert.ok(finding.message.length > 0);
  });

  it('should NOT generate findings when duplication is below threshold', async () => {
    const files = new Map<string, string>();
    files.set('fileA.ts', fileA);
    files.set('fileB.ts', fileB);

    // Use a very high threshold so no findings are generated
    const { findings } = await analyzeDuplication(files, {
      minLines: 5,
      minTokens: 10,
      threshold: 100,
    });

    assert.equal(findings.length, 0);
  });

  it('should use default options when none are provided', async () => {
    const files = new Map<string, string>();
    files.set('fileA.ts', fileA);
    files.set('fileB.ts', fileB);

    // Should not throw with default options
    const { result } = await analyzeDuplication(files);

    assert.ok(result.statistics !== undefined);
    assert.ok(Array.isArray(result.clones));
  });
});
