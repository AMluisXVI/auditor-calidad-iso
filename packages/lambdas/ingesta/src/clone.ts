import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

export interface CloneOptions {
  branch?: string;
  depth?: number;
  timeout?: number;
  maxSizeMB?: number;
}

export interface CloneResult {
  localPath: string;
  branch: string;
  commitHash: string;
}

const VALID_URL_PATTERN = /^(https?:\/\/|git:\/\/)[^\s]+$/;

const DEFAULT_DEPTH = 1;
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_SIZE_MB = 100;

function validateRepositoryUrl(url: string): void {
  if (!url || url.trim().length === 0) {
    throw new Error('Repository URL is required');
  }

  if (!VALID_URL_PATTERN.test(url.trim())) {
    throw new Error(
      `Invalid repository URL: "${url}". Must start with https://, http://, or git://`
    );
  }
}

export async function cloneRepository(
  repositoryUrl: string,
  options?: CloneOptions
): Promise<CloneResult> {
  validateRepositoryUrl(repositoryUrl);

  const depth = options?.depth ?? DEFAULT_DEPTH;
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const maxSizeMB = options?.maxSizeMB ?? DEFAULT_MAX_SIZE_MB;

  const tempDir = await mkdtemp(join(tmpdir(), 'auditor-clone-'));

  try {
    const cloneArgs = ['clone', '--depth', String(depth)];

    if (options?.branch) {
      cloneArgs.push('--branch', options.branch);
    }

    cloneArgs.push(repositoryUrl.trim(), tempDir);

    await execFileAsync('git', cloneArgs, { timeout });

    // Check repository size
    const { stdout: sizeOutput } = await execFileAsync('du', ['-s', tempDir], {
      timeout: 10_000,
    });
    const sizeKB = parseInt(sizeOutput.split('\t')[0], 10);
    const sizeMB = sizeKB / 1024;

    if (sizeMB > maxSizeMB) {
      await rm(tempDir, { recursive: true, force: true });
      throw new Error(
        `Repository exceeds maximum size: ${sizeMB.toFixed(1)}MB > ${maxSizeMB}MB`
      );
    }

    // Get current commit hash
    const { stdout: commitHash } = await execFileAsync(
      'git',
      ['rev-parse', 'HEAD'],
      { cwd: tempDir, timeout: 5_000 }
    );

    // Get current branch name
    const { stdout: branchName } = await execFileAsync(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd: tempDir, timeout: 5_000 }
    );

    return {
      localPath: tempDir,
      branch: branchName.trim() || options?.branch || 'HEAD',
      commitHash: commitHash.trim(),
    };
  } catch (error) {
    // Cleanup on failure
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});

    if (error instanceof Error) {
      if (error.message.includes('Repository exceeds maximum size')) {
        throw error;
      }
      if ('killed' in error && (error as { killed?: boolean }).killed) {
        throw new Error(`Clone timed out after ${timeout}ms`);
      }
      throw error;
    }

    throw new Error('Unknown error during clone');
  }
}
