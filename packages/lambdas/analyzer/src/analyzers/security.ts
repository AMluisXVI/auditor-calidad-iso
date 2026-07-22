import type { SecurityFinding } from '@auditor/shared';

export interface SecurityAnalyzerOptions {
  enabledCategories?: string[]; // OWASP categories to check, default: all
}

interface SecurityPattern {
  pattern: RegExp;
  category: string;
  rule: string;
  message: string;
  cwe: string;
  subcharacteristic: string;
  severity: SecurityFinding['severity'];
  remediation: string;
}

const SECURITY_PATTERNS: SecurityPattern[] = [
  // A03:2021 - Injection
  {
    pattern: /\beval\s*\(/,
    category: 'A03:2021',
    rule: 'no-eval',
    message: 'Use of eval() detected — allows arbitrary code execution',
    cwe: 'CWE-95',
    subcharacteristic: 'Integrity',
    severity: 'critical',
    remediation: 'Replace eval() with JSON.parse() or a safe expression parser.',
  },
  {
    pattern: /new\s+Function\s*\(/,
    category: 'A03:2021',
    rule: 'no-new-function',
    message: 'Dynamic Function constructor detected — equivalent to eval()',
    cwe: 'CWE-95',
    subcharacteristic: 'Integrity',
    severity: 'critical',
    remediation: 'Use static function definitions or safe alternatives.',
  },
  {
    pattern: /child_process/,
    category: 'A03:2021',
    rule: 'no-child-process',
    message: 'Use of child_process module — command injection risk',
    cwe: 'CWE-78',
    subcharacteristic: 'Integrity',
    severity: 'major',
    remediation: 'Validate and sanitize all inputs passed to child_process. Use execFile() with explicit arguments instead of exec().',
  },
  {
    pattern: /\bexec\s*\(/,
    category: 'A03:2021',
    rule: 'no-exec',
    message: 'Command execution detected — possible command injection',
    cwe: 'CWE-78',
    subcharacteristic: 'Integrity',
    severity: 'major',
    remediation: 'Use execFile() with an explicit argument array instead of shell-based exec().',
  },
  {
    pattern: /innerHTML\s*=/,
    category: 'A03:2021',
    rule: 'no-inner-html',
    message: 'innerHTML assignment detected — XSS risk',
    cwe: 'CWE-79',
    subcharacteristic: 'Integrity',
    severity: 'major',
    remediation: 'Use textContent for plain text or a DOM sanitization library for HTML content.',
  },
  {
    pattern: /dangerouslySetInnerHTML/,
    category: 'A03:2021',
    rule: 'dangerous-html',
    message: 'dangerouslySetInnerHTML usage — XSS risk',
    cwe: 'CWE-79',
    subcharacteristic: 'Integrity',
    severity: 'major',
    remediation: 'Sanitize HTML content with DOMPurify before rendering.',
  },
  {
    pattern: /SELECT.*\+|WHERE.*\+.*['"]/,
    category: 'A03:2021',
    rule: 'sql-concatenation',
    message: 'Possible SQL injection via string concatenation',
    cwe: 'CWE-89',
    subcharacteristic: 'Integrity',
    severity: 'critical',
    remediation: 'Use parameterized queries or prepared statements instead of string concatenation.',
  },
  // A02:2021 - Cryptographic Failures
  {
    pattern: /Math\.random\(\)/,
    category: 'A02:2021',
    rule: 'weak-random',
    message: 'Math.random() is not cryptographically secure',
    cwe: 'CWE-338',
    subcharacteristic: 'Confidentiality',
    severity: 'major',
    remediation: 'Use crypto.randomBytes() or crypto.randomUUID() for security-sensitive randomness.',
  },
  {
    pattern: /createHash\s*\(\s*['"]md5['"]/,
    category: 'A02:2021',
    rule: 'weak-hash-md5',
    message: 'MD5 hash is cryptographically broken',
    cwe: 'CWE-328',
    subcharacteristic: 'Confidentiality',
    severity: 'critical',
    remediation: 'Use SHA-256 or SHA-3 for hashing. For passwords, use bcrypt or argon2.',
  },
  {
    pattern: /createHash\s*\(\s*['"]sha1['"]/,
    category: 'A02:2021',
    rule: 'weak-hash-sha1',
    message: 'SHA1 hash is cryptographically weak',
    cwe: 'CWE-328',
    subcharacteristic: 'Confidentiality',
    severity: 'major',
    remediation: 'Use SHA-256 or SHA-3 instead of SHA1.',
  },
  {
    pattern: /http:\/\//,
    category: 'A02:2021',
    rule: 'no-http',
    message: 'Non-HTTPS URL detected — data transmitted in cleartext',
    cwe: 'CWE-319',
    subcharacteristic: 'Confidentiality',
    severity: 'minor',
    remediation: 'Use HTTPS for all network communication.',
  },
  {
    pattern: /rejectUnauthorized\s*:\s*false/,
    category: 'A02:2021',
    rule: 'ssl-disabled',
    message: 'SSL/TLS certificate verification disabled',
    cwe: 'CWE-295',
    subcharacteristic: 'Confidentiality',
    severity: 'critical',
    remediation: 'Never disable SSL certificate verification in production.',
  },
  // A07:2021 - Identification and Authentication Failures
  {
    pattern: /password\s*[:=]\s*['"][^'"]+['"]/,
    category: 'A07:2021',
    rule: 'hardcoded-credentials',
    message: 'Hardcoded credentials detected',
    cwe: 'CWE-798',
    subcharacteristic: 'Confidentiality',
    severity: 'critical',
    remediation: 'Use environment variables or a secrets manager for credentials.',
  },
  {
    pattern: /secret\s*[:=]\s*['"][^'"]+['"]/,
    category: 'A07:2021',
    rule: 'hardcoded-secret',
    message: 'Hardcoded secret detected',
    cwe: 'CWE-798',
    subcharacteristic: 'Confidentiality',
    severity: 'critical',
    remediation: 'Use environment variables or a secrets manager for secrets.',
  },
  {
    pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
    category: 'A07:2021',
    rule: 'hardcoded-api-key',
    message: 'Hardcoded API key detected',
    cwe: 'CWE-798',
    subcharacteristic: 'Confidentiality',
    severity: 'critical',
    remediation: 'Use environment variables or a secrets manager for API keys.',
  },
];

/**
 * Analyzes source files for OWASP security vulnerabilities using
 * pattern-based detection. Scans for common vulnerability patterns
 * including injection flaws, cryptographic weaknesses, and credential exposure.
 */
export async function analyzeSecurity(
  files: Map<string, string>,
  options?: SecurityAnalyzerOptions
): Promise<{ findings: SecurityFinding[] }> {
  const enabledCategories = options?.enabledCategories;
  const findings: SecurityFinding[] = [];

  const patterns = enabledCategories
    ? SECURITY_PATTERNS.filter((p) => enabledCategories.includes(p.category))
    : SECURITY_PATTERNS;

  for (const [filename, content] of files) {
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Skip comment-only lines to reduce false positives
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue;
      }

      for (const securityPattern of patterns) {
        if (securityPattern.pattern.test(line)) {
          const id = `security-${securityPattern.rule}-${filename}-${lineIndex + 1}`;

          findings.push({
            id,
            characteristic: 'Security',
            subcharacteristic: securityPattern.subcharacteristic,
            severity: securityPattern.severity,
            file: filename,
            line: lineIndex + 1,
            message: securityPattern.message,
            rule: securityPattern.rule,
            owaspCategory: securityPattern.category,
            cwe: securityPattern.cwe,
            remediation: securityPattern.remediation,
          });
        }
      }
    }
  }

  return { findings };
}
