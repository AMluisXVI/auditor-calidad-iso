import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

export interface S3UploadOptions {
  bucket: string;
  prefix: string;
  region?: string;
}

export interface S3UploadResult {
  bucket: string;
  prefix: string;
  fileCount: number;
  totalBytes: number;
}

const SKIP_DIRECTORIES = new Set(['.git', 'node_modules']);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
  '.mp3', '.mp4', '.avi', '.mov', '.wav',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.woff', '.woff2', '.ttf', '.eot',
  '.pyc', '.class', '.o', '.obj',
]);

function isBinaryFile(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

async function walkDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (SKIP_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await walkDirectory(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && !isBinaryFile(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function uploadDirectoryToS3(
  localPath: string,
  options: S3UploadOptions
): Promise<S3UploadResult> {
  const client = new S3Client({ region: options.region ?? 'us-east-1' });

  const files = await walkDirectory(localPath);

  let fileCount = 0;
  let totalBytes = 0;

  for (const filePath of files) {
    const content = await readFile(filePath);
    const relativePath = relative(localPath, filePath);
    const key = `${options.prefix}${relativePath}`;

    const command = new PutObjectCommand({
      Bucket: options.bucket,
      Key: key,
      Body: content,
    });

    await client.send(command);

    fileCount++;
    totalBytes += content.byteLength;
  }

  return {
    bucket: options.bucket,
    prefix: options.prefix,
    fileCount,
    totalBytes,
  };
}
