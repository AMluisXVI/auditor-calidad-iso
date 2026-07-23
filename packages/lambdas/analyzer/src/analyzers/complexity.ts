import escomplex from 'typhonjs-escomplex';
import type { ComplexityMetrics, Finding } from '@auditor/shared';

export interface ComplexityAnalyzerOptions {
  maxComplexity?: number; // default: 10
  maxFunctionLength?: number; // default: 50 lines
}

export function analyzeComplexity(
  sourceCode: string,
  filename: string,
  options?: ComplexityAnalyzerOptions
): { metrics: ComplexityMetrics; findings: Finding[] } {
  const maxComplexity = options?.maxComplexity ?? 10;
  const maxFunctionLength = options?.maxFunctionLength ?? 50;

  const report = escomplex.analyzeModule(sourceCode, {});

  const functions = report.methods.map((method) => ({
    name: method.name || '<anonymous>',
    complexity: method.cyclomatic,
    loc: method.sloc.physical,
  }));

  const complexities = functions.map((f) => f.complexity);
  const total = complexities.reduce((sum, c) => sum + c, 0);
  const max = complexities.length > 0 ? Math.max(...complexities) : 0;
  const avg = complexities.length > 0 ? total / complexities.length : 0;

  const metrics: ComplexityMetrics = {
    file: filename,
    functions,
    aggregate: { avg, max, total },
  };

  const findings: Finding[] = [];

  for (const fn of functions) {
    if (fn.complexity > maxComplexity) {
      findings.push({
        id: `complexity-${filename}-${fn.name}`,
        characteristic: 'Maintainability',
        subcharacteristic: 'Analysability',
        severity: getSeverity(fn.complexity),
        file: filename,
        message: `Function '${fn.name}' has cyclomatic complexity of ${fn.complexity} (threshold: ${maxComplexity})`,
        rule: 'cyclomatic-complexity',
      });
    }

    if (fn.loc > maxFunctionLength) {
      findings.push({
        id: `function-length-${filename}-${fn.name}`,
        characteristic: 'Maintainability',
        subcharacteristic: 'Analysability',
        severity: fn.loc > maxFunctionLength * 2 ? 'major' : 'minor',
        file: filename,
        message: `Function '${fn.name}' is ${fn.loc} lines long (threshold: ${maxFunctionLength})`,
        rule: 'function-length',
      });
    }
  }

  return { metrics, findings };
}

function getSeverity(complexity: number): Finding['severity'] {
  if (complexity > 20) return 'critical';
  if (complexity > 15) return 'major';
  return 'minor';
}
