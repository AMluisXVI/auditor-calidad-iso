import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { cloneRepository } from './clone.js';
import { uploadDirectoryToS3 } from './s3.js';
import { cleanupTempDir } from './cleanup.js';
import { randomUUID } from 'node:crypto';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body || '{}');
  const { repositoryUrl, branch } = body;

  if (!repositoryUrl) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'repositoryUrl is required' }),
    };
  }

  const requestId = randomUUID();
  const bucket = process.env.CODE_BUCKET || 'auditor-code-temp';

  let cloneResult;
  try {
    // 1. Clone repository
    cloneResult = await cloneRepository(repositoryUrl, { branch, depth: 1 });

    // 2. Upload to S3
    const uploadResult = await uploadDirectoryToS3(cloneResult.localPath, {
      bucket,
      prefix: `repos/${requestId}/`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        status: 'uploaded',
        repository: repositoryUrl,
        branch: cloneResult.branch,
        commit: cloneResult.commitHash,
        files: uploadResult.fileCount,
        bytes: uploadResult.totalBytes,
        s3Location: { bucket, prefix: `repos/${requestId}/` },
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message, requestId }),
    };
  } finally {
    // 3. Cleanup temp directory
    if (cloneResult?.localPath) {
      await cleanupTempDir(cloneResult.localPath).catch(() => {});
    }
  }
};
