import type { MaturityCheck, MaturityResult, Finding } from '@auditor/shared';
import { maturityChecks as defaultChecks } from '@auditor/shared';

export interface MaturityAnalyzerOptions {
  checks?: MaturityCheck[];
  minScore?: number;
}

export interface MaturityAnalysisResult {
  results: MaturityResult[];
  score: number;
  maxScore: number;
  earnedScore: number;
  findings: Finding[];
}

export function analyzeMaturity(
  fileList: string[],
  options?: MaturityAnalyzerOptions
): MaturityAnalysisResult {
  const checks = options?.checks ?? defaultChecks;

  const results: MaturityResult[] = [];
  const findings: Finding[] = [];
  let earnedScore = 0;
  let maxScore = 0;

  for (const check of checks) {
    maxScore += check.weight;

    const matchedFile = fileList.find((file) =>
      check.filePatterns.some((pattern) => matchesGlob(file, pattern))
    );

    const passed = matchedFile !== undefined;

    results.push({
      checkId: check.id,
      passed,
      evidence: passed ? matchedFile : undefined,
      details: passed ? undefined : `No file matching: ${check.filePatterns.join(', ')}`,
    });

    if (passed) {
      earnedScore += check.weight;
    } else {
      findings.push({
        id: `maturity-${check.id}`,
        characteristic: getCharacteristic(check.category),
        subcharacteristic: 'Maturity',
        severity: getSeverity(check.weight),
        file: '',
        message: `Missing: ${check.name} - ${check.description}`,
        rule: `maturity-${check.id}`,
      });
    }
  }

  const score = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;

  return { results, score, maxScore, earnedScore, findings };
}

function getCharacteristic(category: string): string {
  switch (category) {
    case 'documentation':
      return 'Reliability';
    case 'tooling':
    case 'quality':
    case 'automation':
    case 'testing':
      return 'Maintainability';
    case 'security':
      return 'Security';
    default:
      return 'Maintainability';
  }
}

function getSeverity(weight: number): Finding['severity'] {
  if (weight >= 3) return 'major';
  if (weight >= 2) return 'minor';
  return 'info';
}

/**
 * Simple glob matching without external dependencies.
 * Supports:
 * - `*` matches any characters except `/`
 * - `**` matches any path segments (including none)
 * - Exact match otherwise
 * - Case-insensitive for root-level filenames (README, SECURITY, CHANGELOG, etc.)
 */
export function matchesGlob(filePath: string, pattern: string): boolean {
  const normalizedFile = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  const regex = globToRegex(normalizedPattern);
  return regex.test(normalizedFile);
}

function globToRegex(pattern: string): RegExp {
  let regexStr = '';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    if (char === '*') {
      if (pattern[i + 1] === '*') {
        // ** - match any path segments
        if (pattern[i + 2] === '/') {
          // **/  - match zero or more path segments followed by /
          regexStr += '(?:.+/)?';
          i += 3;
        } else {
          // ** at end - match everything
          regexStr += '.*';
          i += 2;
        }
      } else {
        // * - match anything except /
        regexStr += '[^/]*';
        i += 1;
      }
    } else if (char === '?') {
      regexStr += '[^/]';
      i += 1;
    } else if (char === '.') {
      regexStr += '\\.';
      i += 1;
    } else if (char === '/') {
      regexStr += '/';
      i += 1;
    } else {
      regexStr += char;
      i += 1;
    }
  }

  return new RegExp(`^${regexStr}$`, 'i');
}
