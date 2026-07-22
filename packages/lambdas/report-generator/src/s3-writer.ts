import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export interface ReportStorage {
  bucket: string;
  region?: string;
}

export interface StoredReport {
  markdownKey: string;
  jsonKey: string;
  markdownUrl: string;
  jsonUrl: string;
}

/**
 * Stores both markdown and JSON versions of a report in S3.
 */
export async function storeReport(
  reportId: string,
  markdown: string,
  json: object,
  storage: ReportStorage,
): Promise<StoredReport> {
  const client = new S3Client({ region: storage.region ?? process.env.AWS_REGION ?? 'us-east-1' });

  const markdownKey = `reports/${reportId}/report.md`;
  const jsonKey = `reports/${reportId}/report.json`;

  await client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: markdownKey,
      Body: markdown,
      ContentType: 'text/markdown',
    }),
  );

  await client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: jsonKey,
      Body: JSON.stringify(json, null, 2),
      ContentType: 'application/json',
    }),
  );

  const baseUrl = `s3://${storage.bucket}`;

  return {
    markdownKey,
    jsonKey,
    markdownUrl: `${baseUrl}/${markdownKey}`,
    jsonUrl: `${baseUrl}/${jsonKey}`,
  };
}

/**
 * Retrieves a stored report from S3 in the specified format.
 */
export async function getStoredReport(
  reportId: string,
  format: 'markdown' | 'json',
  storage: ReportStorage,
): Promise<string> {
  const client = new S3Client({ region: storage.region ?? process.env.AWS_REGION ?? 'us-east-1' });

  const key =
    format === 'markdown'
      ? `reports/${reportId}/report.md`
      : `reports/${reportId}/report.json`;

  const response = await client.send(
    new GetObjectCommand({
      Bucket: storage.bucket,
      Key: key,
    }),
  );

  const body = await response.Body?.transformToString();
  if (!body) {
    throw new Error(`Report not found: ${key}`);
  }

  return body;
}
