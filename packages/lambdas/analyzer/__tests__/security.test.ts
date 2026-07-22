import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSecurity } from '../src/analyzers/security.js';

const vulnerableCode = `
import crypto from 'crypto';

const password = "admin123";
const result = eval(userInput);
const hash = crypto.createHash('md5').update(data).digest('hex');
const random = Math.random().toString();
const query = "SELECT * FROM users WHERE id = " + userId;
element.innerHTML = userContent;
`;

const safeCode = `
import crypto from 'node:crypto';

const password = process.env.DB_PASSWORD;
const result = JSON.parse(validatedInput);
const hash = crypto.createHash('sha256').update(data).digest('hex');
const random = crypto.randomBytes(32).toString('hex');
const query = db.query("SELECT * FROM users WHERE id = ?", [userId]);
element.textContent = userContent;
`;

describe('analyzeSecurity', () => {
  it('should detect eval() usage and map to A03:2021 (Injection)', async () => {
    const files = new Map<string, string>();
    files.set('app.ts', `const result = eval(userInput);`);

    const { findings } = await analyzeSecurity(files);

    const evalFinding = findings.find((f) => f.rule === 'no-eval');
    assert.ok(evalFinding, 'Should detect eval() usage');
    assert.equal(evalFinding.owaspCategory, 'A03:2021');
    assert.equal(evalFinding.cwe, 'CWE-95');
    assert.equal(evalFinding.characteristic, 'Security');
  });

  it('should detect hardcoded credentials and map to A07:2021', async () => {
    const files = new Map<string, string>();
    files.set('config.ts', `const password = "admin123";`);

    const { findings } = await analyzeSecurity(files);

    const credFinding = findings.find((f) => f.rule === 'hardcoded-credentials');
    assert.ok(credFinding, 'Should detect hardcoded password');
    assert.equal(credFinding.owaspCategory, 'A07:2021');
    assert.equal(credFinding.cwe, 'CWE-798');
  });

  it('should detect weak crypto (MD5, Math.random) and map to A02:2021', async () => {
    const files = new Map<string, string>();
    files.set('crypto.ts', `
const hash = crypto.createHash('md5').update(data).digest('hex');
const random = Math.random().toString();
`);

    const { findings } = await analyzeSecurity(files);

    const md5Finding = findings.find((f) => f.rule === 'weak-hash-md5');
    assert.ok(md5Finding, 'Should detect MD5 usage');
    assert.equal(md5Finding.owaspCategory, 'A02:2021');
    assert.equal(md5Finding.cwe, 'CWE-328');

    const randomFinding = findings.find((f) => f.rule === 'weak-random');
    assert.ok(randomFinding, 'Should detect Math.random()');
    assert.equal(randomFinding.owaspCategory, 'A02:2021');
    assert.equal(randomFinding.cwe, 'CWE-338');
  });

  it('should detect SQL injection pattern and map to A03:2021', async () => {
    const files = new Map<string, string>();
    files.set('db.ts', `const query = "SELECT * FROM users WHERE id = " + userId;`);

    const { findings } = await analyzeSecurity(files);

    const sqlFinding = findings.find((f) => f.rule === 'sql-concatenation');
    assert.ok(sqlFinding, 'Should detect SQL concatenation');
    assert.equal(sqlFinding.owaspCategory, 'A03:2021');
    assert.equal(sqlFinding.cwe, 'CWE-89');
  });

  it('should produce no findings for safe code', async () => {
    const files = new Map<string, string>();
    files.set('safe.ts', safeCode);

    const { findings } = await analyzeSecurity(files);

    assert.equal(findings.length, 0, `Expected no findings but got: ${JSON.stringify(findings.map((f) => f.rule))}`);
  });

  it('should include all required fields in each finding', async () => {
    const files = new Map<string, string>();
    files.set('app.ts', vulnerableCode);

    const { findings } = await analyzeSecurity(files);

    assert.ok(findings.length > 0, 'Should have findings for vulnerable code');

    for (const finding of findings) {
      assert.ok(finding.id, 'Finding must have id');
      assert.equal(finding.characteristic, 'Security');
      assert.ok(finding.subcharacteristic, 'Finding must have subcharacteristic');
      assert.ok(['critical', 'major', 'minor', 'info'].includes(finding.severity), `Invalid severity: ${finding.severity}`);
      assert.equal(finding.file, 'app.ts');
      assert.ok(finding.line && finding.line > 0, 'Finding must have a positive line number');
      assert.ok(finding.message, 'Finding must have message');
      assert.ok(finding.rule, 'Finding must have rule');
      assert.ok(finding.owaspCategory, 'Finding must have owaspCategory');
      assert.ok(finding.cwe, 'Finding must have cwe');
      assert.ok(finding.remediation, 'Finding must have remediation');
    }
  });

  it('should filter by enabled categories', async () => {
    const files = new Map<string, string>();
    files.set('app.ts', vulnerableCode);

    // Only check for Injection (A03:2021)
    const { findings } = await analyzeSecurity(files, {
      enabledCategories: ['A03:2021'],
    });

    for (const finding of findings) {
      assert.equal(finding.owaspCategory, 'A03:2021', `Expected only A03:2021 but got ${finding.owaspCategory}`);
    }

    assert.ok(findings.length > 0, 'Should still find injection issues');
  });

  it('should detect innerHTML assignment as XSS risk', async () => {
    const files = new Map<string, string>();
    files.set('ui.ts', `element.innerHTML = userContent;`);

    const { findings } = await analyzeSecurity(files);

    const xssFinding = findings.find((f) => f.rule === 'no-inner-html');
    assert.ok(xssFinding, 'Should detect innerHTML assignment');
    assert.equal(xssFinding.owaspCategory, 'A03:2021');
    assert.equal(xssFinding.cwe, 'CWE-79');
  });

  it('should skip findings in comment lines', async () => {
    const files = new Map<string, string>();
    files.set('commented.ts', `
// const password = "admin123";
/* eval(userInput); */
* Math.random()
const safe = true;
`);

    const { findings } = await analyzeSecurity(files);

    assert.equal(findings.length, 0, 'Should not report findings in comments');
  });

  it('should detect multiple vulnerabilities across multiple files', async () => {
    const files = new Map<string, string>();
    files.set('auth.ts', `const password = "secret123";`);
    files.set('crypto.ts', `const hash = crypto.createHash('md5').update(data).digest('hex');`);
    files.set('query.ts', `const q = "SELECT * FROM t WHERE x = " + input;`);

    const { findings } = await analyzeSecurity(files);

    const affectedFiles = new Set(findings.map((f) => f.file));
    assert.ok(affectedFiles.has('auth.ts'), 'Should find issues in auth.ts');
    assert.ok(affectedFiles.has('crypto.ts'), 'Should find issues in crypto.ts');
    assert.ok(affectedFiles.has('query.ts'), 'Should find issues in query.ts');
  });
});
