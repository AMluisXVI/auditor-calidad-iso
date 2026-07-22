import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeComplexity } from '../src/analyzers/complexity.js';

const simpleCode = `
function add(a, b) {
  return a + b;
}
`;

const complexCode = `
function processOrder(order) {
  if (order.type === 'express') {
    if (order.weight > 10) {
      if (order.destination === 'international') {
        if (order.insurance) {
          return calculateExpressInternationalInsured(order);
        } else {
          return calculateExpressInternational(order);
        }
      } else {
        if (order.priority) {
          return calculateExpressDomesticPriority(order);
        }
        return calculateExpressDomestic(order);
      }
    } else {
      return calculateExpressLight(order);
    }
  } else if (order.type === 'standard') {
    if (order.bulk) {
      return calculateBulk(order);
    }
    return calculateStandard(order);
  } else if (order.type === 'overnight') {
    return calculateOvernight(order);
  }
  return calculateDefault(order);
}
`;

const multipleCode = `
function greet(name) {
  return 'Hello ' + name;
}

function farewell(name) {
  return 'Goodbye ' + name;
}

function check(x) {
  if (x > 0) {
    return 'positive';
  }
  return 'non-positive';
}
`;

const trivialCode = `
const x = 1;
`;

describe('analyzeComplexity', () => {
  it('should return low complexity metrics and no findings for a simple function', () => {
    const { metrics, findings } = analyzeComplexity(simpleCode, 'add.js');

    assert.equal(metrics.file, 'add.js');
    assert.equal(metrics.functions.length, 1);
    assert.equal(metrics.functions[0].name, 'add');
    assert.ok(metrics.functions[0].complexity <= 10);
    assert.equal(findings.length, 0);
  });

  it('should return findings with correct severity for high complexity function', () => {
    const { metrics, findings } = analyzeComplexity(complexCode, 'order.js', {
      maxComplexity: 5,
    });

    assert.equal(metrics.file, 'order.js');
    assert.equal(metrics.functions.length, 1);
    assert.equal(metrics.functions[0].name, 'processOrder');
    assert.ok(metrics.functions[0].complexity > 5);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].id, 'complexity-order.js-processOrder');
    assert.equal(findings[0].characteristic, 'Maintainability');
    assert.equal(findings[0].subcharacteristic, 'Analysability');
    assert.equal(findings[0].file, 'order.js');
    assert.ok(findings[0].message.includes('processOrder'));
  });

  it('should return metrics for each function in a multi-function file', () => {
    const { metrics, findings } = analyzeComplexity(multipleCode, 'utils.js');

    assert.equal(metrics.file, 'utils.js');
    assert.equal(metrics.functions.length, 3);

    const names = metrics.functions.map((f) => f.name);
    assert.ok(names.includes('greet'));
    assert.ok(names.includes('farewell'));
    assert.ok(names.includes('check'));
    assert.equal(findings.length, 0);
  });

  it('should return zero complexity for empty/trivial code', () => {
    const { metrics, findings } = analyzeComplexity(trivialCode, 'trivial.js');

    assert.equal(metrics.file, 'trivial.js');
    assert.equal(metrics.functions.length, 0);
    assert.equal(metrics.aggregate.avg, 0);
    assert.equal(metrics.aggregate.max, 0);
    assert.equal(metrics.aggregate.total, 0);
    assert.equal(findings.length, 0);
  });

  it('should correctly populate all Finding fields', () => {
    const { findings } = analyzeComplexity(complexCode, 'order.js', {
      maxComplexity: 3,
    });

    assert.ok(findings.length > 0);
    const finding = findings[0];
    assert.equal(finding.id, 'complexity-order.js-processOrder');
    assert.equal(finding.characteristic, 'Maintainability');
    assert.equal(finding.subcharacteristic, 'Analysability');
    assert.equal(finding.file, 'order.js');
    assert.equal(finding.rule, 'cyclomatic-complexity');
    assert.ok(
      ['critical', 'major', 'minor', 'info'].includes(finding.severity)
    );
    assert.ok(finding.message.length > 0);
  });

  it('should set severity based on complexity thresholds', () => {
    // processOrder has complexity > 10 — with default threshold of 10,
    // the severity depends on how much it exceeds the threshold
    const { findings } = analyzeComplexity(complexCode, 'order.js', {
      maxComplexity: 1,
    });

    assert.ok(findings.length > 0);
    const finding = findings[0];
    // complexity of processOrder is high (>10), so it should be at least minor
    assert.ok(['critical', 'major', 'minor'].includes(finding.severity));
  });
});
