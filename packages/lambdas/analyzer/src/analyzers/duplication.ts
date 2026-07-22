import { createHash } from 'node:crypto';
import type { CloneInstance, DuplicationResult, Finding } from '@auditor/shared';

export interface DuplicationAnalyzerOptions {
  minLines?: number; // minimum lines for a clone (default: 5)
  minTokens?: number; // minimum tokens for a clone (default: 50)
  threshold?: number; // max allowed duplication % (default: 10)
}

interface BlockHash {
  hash: string;
  file: string;
  startLine: number;
  lineCount: number;
  tokenCount: number;
}

/**
 * Analyzes code duplication across a set of files using a line-based
 * sliding window approach with content hashing.
 *
 * Uses a SimpleCloneDetector algorithm:
 * 1. For each file, extract blocks of N consecutive non-empty lines (sliding window)
 * 2. Hash each normalized block
 * 3. Find matching hashes across different files (or different positions in same file)
 * 4. Report matches as clones
 */
export async function analyzeDuplication(
  files: Map<string, string>,
  options?: DuplicationAnalyzerOptions
): Promise<{ result: DuplicationResult; findings: Finding[] }> {
  const minLines = options?.minLines ?? 5;
  const minTokens = options?.minTokens ?? 50;
  const threshold = options?.threshold ?? 10;

  const blockHashes = buildBlockHashes(files, minLines, minTokens);
  const clones = detectClones(blockHashes);
  const statistics = calculateStatistics(clones, files);

  const findings = generateFindings(clones, statistics, threshold);

  return {
    result: { clones, statistics },
    findings,
  };
}

function normalizeLines(source: string): string[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isCommentOrEmpty(line));
}

function isCommentOrEmpty(line: string): boolean {
  return (
    line === '' ||
    line.startsWith('//') ||
    line.startsWith('/*') ||
    line.startsWith('*') ||
    line === '*/'
  );
}

function countTokens(block: string[]): number {
  return block.join(' ').split(/\s+/).length;
}

function hashBlock(block: string[]): string {
  const content = block.join('\n');
  return createHash('sha256').update(content).digest('hex');
}

function buildBlockHashes(
  files: Map<string, string>,
  minLines: number,
  minTokens: number
): BlockHash[] {
  const hashes: BlockHash[] = [];

  for (const [filename, source] of files) {
    const lines = normalizeLines(source);

    if (lines.length < minLines) continue;

    for (let i = 0; i <= lines.length - minLines; i++) {
      const block = lines.slice(i, i + minLines);
      const tokenCount = countTokens(block);

      if (tokenCount < minTokens) continue;

      hashes.push({
        hash: hashBlock(block),
        file: filename,
        startLine: mapToOriginalLine(source, block[0], i),
        lineCount: minLines,
        tokenCount,
      });
    }
  }

  return hashes;
}

/**
 * Maps a normalized line index back to the approximate original line number.
 * Searches for the nth occurrence of a non-empty, non-comment line.
 */
function mapToOriginalLine(
  source: string,
  _firstLine: string,
  normalizedIndex: number
): number {
  const rawLines = source.split('\n');
  let count = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (trimmed.length > 0 && !isCommentOrEmpty(trimmed)) {
      if (count === normalizedIndex) {
        return i + 1; // 1-based line number
      }
      count++;
    }
  }

  return normalizedIndex + 1;
}

function detectClones(blockHashes: BlockHash[]): CloneInstance[] {
  const hashMap = new Map<string, BlockHash[]>();

  for (const entry of blockHashes) {
    const existing = hashMap.get(entry.hash);
    if (existing) {
      existing.push(entry);
    } else {
      hashMap.set(entry.hash, [entry]);
    }
  }

  const clones: CloneInstance[] = [];
  const seen = new Set<string>();

  for (const [, entries] of hashMap) {
    if (entries.length < 2) continue;

    // Generate pairs avoiding duplicates
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];

        // Skip if both are in the same file at the same position
        if (a.file === b.file && a.startLine === b.startLine) continue;

        const key = `${a.file}:${a.startLine}-${b.file}:${b.startLine}`;
        const reverseKey = `${b.file}:${b.startLine}-${a.file}:${a.startLine}`;

        if (seen.has(key) || seen.has(reverseKey)) continue;
        seen.add(key);

        clones.push({
          sourceFile: a.file,
          sourceLine: a.startLine,
          targetFile: b.file,
          targetLine: b.startLine,
          lines: a.lineCount,
          tokens: a.tokenCount,
        });
      }
    }
  }

  return clones;
}

function calculateStatistics(
  clones: CloneInstance[],
  files: Map<string, string>
): DuplicationResult['statistics'] {
  const totalClones = clones.length;
  const duplicatedLines = clones.reduce((sum, clone) => sum + clone.lines, 0);

  let totalLines = 0;
  for (const source of files.values()) {
    totalLines += source.split('\n').length;
  }

  const percentage = totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0;

  return {
    totalClones,
    duplicatedLines,
    percentage: Math.round(percentage * 100) / 100,
  };
}

function generateFindings(
  clones: CloneInstance[],
  statistics: DuplicationResult['statistics'],
  threshold: number
): Finding[] {
  const findings: Finding[] = [];

  if (statistics.percentage > threshold) {
    for (const clone of clones) {
      findings.push({
        id: `duplication-${clone.sourceFile}-${clone.targetFile}-${clone.sourceLine}`,
        characteristic: 'Maintainability',
        subcharacteristic: 'Reusability',
        severity: getCloneSeverity(clone.lines),
        file: clone.sourceFile,
        line: clone.sourceLine,
        message: `Duplicated code block (${clone.lines} lines, ${clone.tokens} tokens) found in ${clone.targetFile} at line ${clone.targetLine}`,
        rule: 'code-duplication',
      });
    }
  }

  return findings;
}

function getCloneSeverity(lines: number): Finding['severity'] {
  if (lines > 50) return 'major';
  if (lines > 20) return 'minor';
  return 'info';
}
