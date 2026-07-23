import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';

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

const VALID_URL_PATTERN = /^https?:\/\/[^\s]+$/;

const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_SIZE_MB = 100;

/** Private/internal IP ranges that must be blocked (SSRF protection) */
const BLOCKED_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^fc00:/i,
  /^fd/i,
  /^fe80:/i,
  /^::1$/,
  /^localhost$/i,
];

/** Supported hosting platforms for tarball download */
const PLATFORM_PATTERNS = [
  {
    name: 'github',
    match: /^https?:\/\/(www\.)?github\.com\/([^/]+)\/([^/]+?)(\.git)?$/,
    archiveUrl: (owner: string, repo: string, branch: string): string =>
      `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.tar.gz`,
    commitUrl: (owner: string, repo: string, branch: string): string =>
      `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
    extractSha: (json: Record<string, unknown>): string =>
      (json.sha as string) || 'unknown',
  },
  {
    name: 'gitlab',
    match: /^https?:\/\/(www\.)?gitlab\.com\/([^/]+)\/([^/]+?)(\.git)?$/,
    archiveUrl: (owner: string, repo: string, branch: string): string =>
      `https://gitlab.com/${owner}/${repo}/-/archive/${branch}/${repo}-${branch}.tar.gz`,
    commitUrl: (owner: string, repo: string, branch: string): string =>
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/branches/${encodeURIComponent(branch)}`,
    extractSha: (json: Record<string, unknown>): string => {
      const commit = json.commit as Record<string, unknown> | undefined;
      return (commit?.id as string) || 'unknown';
    },
  },
];

function validateRepositoryUrl(url: string): void {
  if (!url || url.trim().length === 0) {
    throw new Error('Repository URL is required');
  }

  const trimmed = url.trim();

  if (!VALID_URL_PATTERN.test(trimmed)) {
    throw new Error(
      `Invalid repository URL: "${url}". Must start with https:// or http://`
    );
  }

  // SSRF: Block private/internal IPs and metadata endpoints
  const hostname = new URL(trimmed).hostname;
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new Error(
        `Blocked repository URL: "${hostname}" resolves to a private/internal address`
      );
    }
  }
}

function parseRepoUrl(url: string): { owner: string; repo: string; platform: typeof PLATFORM_PATTERNS[0] } {
  const trimmed = url.trim();

  for (const platform of PLATFORM_PATTERNS) {
    const match = trimmed.match(platform.match);
    if (match) {
      return { owner: match[2], repo: match[3], platform };
    }
  }

  throw new Error(
    `Unsupported repository host. Currently supported: GitHub, GitLab. URL: "${url}"`
  );
}

async function resolveCommitSha(
  owner: string,
  repo: string,
  branch: string,
  platform: typeof PLATFORM_PATTERNS[0]
): Promise<string> {
  try {
    const commitUrl = platform.commitUrl(owner, repo, branch);
    const headers: Record<string, string> = { 'User-Agent': 'auditor-calidad-iso' };

    const res = await fetch(commitUrl, { headers, signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return 'unknown';

    const json = await res.json() as Record<string, unknown>;
    return platform.extractSha(json);
  } catch {
    // Non-critical: if we can't resolve the SHA, continue with 'unknown'
    return 'unknown';
  }
}

export async function cloneRepository(
  repositoryUrl: string,
  options?: CloneOptions
): Promise<CloneResult> {
  validateRepositoryUrl(repositoryUrl);

  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const maxSizeMB = options?.maxSizeMB ?? DEFAULT_MAX_SIZE_MB;
  const branch = options?.branch ?? 'main';

  const { owner, repo, platform } = parseRepoUrl(repositoryUrl);
  const archiveUrl = platform.archiveUrl(owner, repo, branch);

  const tempDir = await mkdtemp(join(tmpdir(), 'auditor-clone-'));
  const tarPath = join(tempDir, 'archive.tar.gz');

  try {
    // 1. Download tarball + resolve commit SHA in parallel
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    let actualBranch = branch;
    try {
      response = await fetch(archiveUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // If main fails, try master as fallback
      if (branch === 'main' && !options?.branch) {
        const fallbackUrl = platform.archiveUrl(owner, repo, 'master');
        const fallbackController = new AbortController();
        const fallbackTimer = setTimeout(() => fallbackController.abort(), timeout);

        let fallbackResponse: Response;
        try {
          fallbackResponse = await fetch(fallbackUrl, { signal: fallbackController.signal });
        } finally {
          clearTimeout(fallbackTimer);
        }

        if (!fallbackResponse.ok) {
          throw new Error(
            `Failed to download repository archive: HTTP ${fallbackResponse.status}. Tried both 'main' and 'master' branches.`
          );
        }
        response = fallbackResponse;
        actualBranch = 'master';
      } else {
        throw new Error(
          `Failed to download repository archive: HTTP ${response.status} for branch '${branch}'`
        );
      }
    }

    if (!response.body) {
      throw new Error('Empty response body from archive download');
    }

    // Resolve commit SHA (best-effort, non-blocking)
    const commitHash = await resolveCommitSha(owner, repo, actualBranch, platform);

    // Write tarball to disk
    const readable = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
    await pipeline(readable, createWriteStream(tarPath));

    // Check size before extraction
    const tarStat = await stat(tarPath);
    const sizeMB = tarStat.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      throw new Error(
        `Repository exceeds maximum size: ${sizeMB.toFixed(1)}MB > ${maxSizeMB}MB`
      );
    }

    // 2. Extract tarball
    await execFileAsync('tar', ['-xzf', tarPath, '-C', tempDir], { timeout: 30_000 });

    // tar extracts into a subdirectory like repo-branch/
    const { stdout: lsOutput } = await execFileAsync('ls', [tempDir]);
    const extractedDirName = lsOutput
      .split('\n')
      .find((name) => name !== 'archive.tar.gz' && name.length > 0);

    if (!extractedDirName) {
      throw new Error('Failed to find extracted directory');
    }

    const sourcePath = join(tempDir, extractedDirName);

    // 3. Clean up tarball to save space
    await rm(tarPath, { force: true });

    return {
      localPath: sourcePath,
      branch: actualBranch,
      commitHash,
    };
  } catch (error) {
    // Cleanup on failure
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});

    if (error instanceof Error) {
      if (error.message.includes('Repository exceeds maximum size')) {
        throw error;
      }
      if (error.name === 'AbortError') {
        throw new Error(`Download timed out after ${timeout}ms`);
      }
      throw error;
    }

    throw new Error('Unknown error during repository download');
  }
}
