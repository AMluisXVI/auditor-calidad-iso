/**
 * OWASP Top 10 (2021) Categories
 * https://owasp.org/Top10/
 */

export const OWASP_CATEGORIES = [
  'A01:2021',
  'A02:2021',
  'A03:2021',
  'A04:2021',
  'A05:2021',
  'A06:2021',
  'A07:2021',
  'A08:2021',
  'A09:2021',
  'A10:2021',
] as const;

export type OWASPCategory = (typeof OWASP_CATEGORIES)[number];

export interface OWASPCategoryInfo {
  id: OWASPCategory;
  name: string;
  description: string;
}

export const OWASP_TOP_10: readonly OWASPCategoryInfo[] = [
  {
    id: 'A01:2021',
    name: 'Broken Access Control',
    description: 'Failures in access control allow unauthorized users to act outside their intended permissions.',
  },
  {
    id: 'A02:2021',
    name: 'Cryptographic Failures',
    description: 'Failures related to cryptography that lead to exposure of sensitive data.',
  },
  {
    id: 'A03:2021',
    name: 'Injection',
    description: 'Injection flaws such as SQL, NoSQL, OS, and LDAP injection occur when untrusted data is sent as part of a command or query.',
  },
  {
    id: 'A04:2021',
    name: 'Insecure Design',
    description: 'Risks related to design and architectural flaws, calling for more use of threat modeling and secure design patterns.',
  },
  {
    id: 'A05:2021',
    name: 'Security Misconfiguration',
    description: 'Missing or incorrect security hardening across any part of the application stack.',
  },
  {
    id: 'A06:2021',
    name: 'Vulnerable and Outdated Components',
    description: 'Using components with known vulnerabilities or that are unsupported or out of date.',
  },
  {
    id: 'A07:2021',
    name: 'Identification and Authentication Failures',
    description: 'Weaknesses in authentication and session management that allow attackers to compromise credentials.',
  },
  {
    id: 'A08:2021',
    name: 'Software and Data Integrity Failures',
    description: 'Failures related to code and infrastructure that do not protect against integrity violations.',
  },
  {
    id: 'A09:2021',
    name: 'Security Logging and Monitoring Failures',
    description: 'Insufficient logging, detection, monitoring, and active response to security events.',
  },
  {
    id: 'A10:2021',
    name: 'Server-Side Request Forgery (SSRF)',
    description: 'Flaws that allow an attacker to induce the server-side application to make requests to an unintended location.',
  },
] as const;
