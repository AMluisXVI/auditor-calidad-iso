import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFilesFromS3 } from './s3-reader.js';
import { runAnalysis } from './orchestrator.js';
import { saveAnalysisResult } from './dynamo.js';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { requestId, bucket, prefix } = body;

    if (!requestId || !bucket || !prefix) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: requestId, bucket, prefix' }),
      };
    }

    // 1. Read files from S3
    const { files, fileList } = await readFilesFromS3({ bucket, prefix });

    // 2. Run all analysis
    const result = await runAnalysis({ requestId, files, fileList });

    // 3. Save to DynamoDB
    const tableName = process.env.RESULTS_TABLE || 'auditor-results';
    await saveAnalysisResult(result, { tableName });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    };
  }
};
