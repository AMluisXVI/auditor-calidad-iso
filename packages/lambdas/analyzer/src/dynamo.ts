import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { AnalysisResult } from '@auditor/shared';

export interface SaveResultOptions {
  tableName: string;
  region?: string;
}

/**
 * Saves an analysis result to DynamoDB.
 * The item is stored with requestId as the partition key.
 */
export async function saveAnalysisResult(
  result: AnalysisResult,
  options: SaveResultOptions
): Promise<void> {
  const client = new DynamoDBClient({
    ...(options.region ? { region: options.region } : {}),
  });

  const docClient = DynamoDBDocumentClient.from(client);

  await docClient.send(
    new PutCommand({
      TableName: options.tableName,
      Item: {
        requestId: result.requestId,
        timestamp: result.timestamp,
        status: result.status,
        score: result.score,
        findingsCount: result.findings.length,
        findings: result.findings,
        recommendations: result.recommendations,
        complexity: result.complexity,
        duplication: result.duplication,
        maturity: result.maturity,
      },
    })
  );
}
