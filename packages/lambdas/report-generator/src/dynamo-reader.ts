import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { AnalysisResult } from '@auditor/shared';

export interface DynamoReaderOptions {
  tableName: string;
  region?: string;
}

/**
 * Fetches an analysis result from DynamoDB by requestId.
 * Returns null if the item does not exist.
 */
export async function getAnalysisResult(
  requestId: string,
  options: DynamoReaderOptions,
): Promise<AnalysisResult | null> {
  const client = new DynamoDBClient({
    region: options.region ?? process.env.AWS_REGION ?? 'us-east-1',
  });
  const docClient = DynamoDBDocumentClient.from(client);

  const response = await docClient.send(
    new GetCommand({
      TableName: options.tableName,
      Key: { requestId },
    }),
  );

  if (!response.Item) {
    return null;
  }

  return response.Item as AnalysisResult;
}
