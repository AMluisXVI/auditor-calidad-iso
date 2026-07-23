import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cloneRepository } from '../src/clone.js';

describe('cloneRepository', () => {
  it('should reject empty URL', async () => {
    await assert.rejects(() => cloneRepository(''), {
      message: /required/i,
    });
  });

  it('should reject invalid URLs without protocol', async () => {
    await assert.rejects(() => cloneRepository('not-a-valid-url'), {
      message: /invalid.*url/i,
    });
  });

  it('should reject URLs with invalid protocols', async () => {
    await assert.rejects(() => cloneRepository('ftp://example.com/repo.git'), {
      message: /invalid.*url/i,
    });
  });

  it('should reject git:// protocol (only HTTPS supported)', async () => {
    await assert.rejects(() => cloneRepository('git://github.com/user/repo.git'), {
      message: /invalid.*url/i,
    });
  });

  it('should reject whitespace-only URL', async () => {
    await assert.rejects(() => cloneRepository('   '), {
      message: /required/i,
    });
  });

  it('should reject unsupported hosting platforms', async () => {
    await assert.rejects(
      () => cloneRepository('https://bitbucket.org/user/repo.git'),
      { message: /unsupported.*host/i }
    );
  });

  // SSRF protection tests
  it('should block localhost URLs', async () => {
    await assert.rejects(
      () => cloneRepository('https://localhost/user/repo'),
      { message: /blocked.*private/i }
    );
  });

  it('should block 127.x.x.x URLs', async () => {
    await assert.rejects(
      () => cloneRepository('https://127.0.0.1/user/repo'),
      { message: /blocked.*private/i }
    );
  });

  it('should block 10.x.x.x private IPs', async () => {
    await assert.rejects(
      () => cloneRepository('https://10.0.0.1/user/repo'),
      { message: /blocked.*private/i }
    );
  });

  it('should block 192.168.x.x private IPs', async () => {
    await assert.rejects(
      () => cloneRepository('https://192.168.1.1/user/repo'),
      { message: /blocked.*private/i }
    );
  });

  it('should block AWS metadata endpoint (169.254.169.254)', async () => {
    await assert.rejects(
      () => cloneRepository('https://169.254.169.254/latest/meta-data'),
      { message: /blocked.*private/i }
    );
  });

  it('should accept valid GitHub HTTPS URLs (validation only)', async () => {
    const url = 'https://github.com/user/repo.git';
    // Download will fail due to non-existent repo but should NOT fail on validation
    try {
      await cloneRepository(url, { timeout: 3000 });
    } catch (error) {
      const msg = (error as Error).message;
      assert.ok(
        !msg.includes('Invalid repository URL'),
        'Should pass URL validation'
      );
      assert.ok(
        !msg.includes('Blocked repository URL'),
        'Should not be blocked by SSRF filter'
      );
      assert.ok(
        !msg.includes('Unsupported repository host'),
        'GitHub should be supported'
      );
    }
  });

  it('should accept valid GitLab HTTPS URLs (validation only)', async () => {
    const url = 'https://gitlab.com/user/repo.git';
    try {
      await cloneRepository(url, { timeout: 3000 });
    } catch (error) {
      const msg = (error as Error).message;
      assert.ok(
        !msg.includes('Invalid repository URL'),
        'Should pass URL validation for GitLab'
      );
      assert.ok(
        !msg.includes('Unsupported repository host'),
        'GitLab should be supported'
      );
    }
  });
});
