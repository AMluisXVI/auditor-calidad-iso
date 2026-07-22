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

  it('should reject whitespace-only URL', async () => {
    await assert.rejects(() => cloneRepository('   '), {
      message: /required/i,
    });
  });

  it('should accept valid HTTPS git URLs (validation only)', async () => {
    const url = 'https://github.com/user/repo.git';
    // Clone will fail due to network/timeout but should NOT fail on validation
    try {
      await cloneRepository(url, { timeout: 1000 });
    } catch (error) {
      const msg = (error as Error).message;
      assert.ok(
        !msg.includes('Invalid repository URL'),
        'Should pass URL validation'
      );
    }
  });

  it('should accept valid git:// URLs (validation only)', async () => {
    const url = 'git://github.com/user/repo.git';
    try {
      await cloneRepository(url, { timeout: 1000 });
    } catch (error) {
      const msg = (error as Error).message;
      assert.ok(
        !msg.includes('Invalid repository URL'),
        'Should pass URL validation for git:// protocol'
      );
    }
  });
});
