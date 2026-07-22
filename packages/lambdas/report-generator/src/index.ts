import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateReport } from './generator.js';
import { storeReport, getStoredReport } from './s3-writer.js';
import { getAnalysisResult } from './dynamo-reader.js';
import type { ReportInput } from './generator.js';

/**
 * POST /report/generate — Generates a report from analysis results.
 * Body: { requestId: string }
 */
export const generateHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const { requestId } = JSON.parse(event.body || '{}');
    if (!requestId) {
      return response(400, { error: 'requestId is required' });
    }

    const tableName = process.env.RESULTS_TABLE || 'auditor-results';
    const bucket = process.env.REPORTS_BUCKET || 'auditor-reports';

    // 1. Fetch analysis result from DynamoDB
    const analysisResult = await getAnalysisResult(requestId, { tableName });
    if (!analysisResult) {
      return response(404, { error: `Analysis not found for requestId: ${requestId}` });
    }

    // 2. Generate report
    const reportInput: ReportInput = {
      requestId,
      findings: analysisResult.findings,
      score: analysisResult.score,
      complexity: analysisResult.complexity,
      duplication: analysisResult.duplication,
      maturity: analysisResult.maturity,
    };
    const report = generateReport(reportInput);

    // 3. Store in S3
    const stored = await storeReport(report.id, report.markdown, report.json, { bucket });

    return response(200, {
      reportId: report.id,
      requestId,
      generatedAt: report.generatedAt,
      storage: stored,
      summary: {
        overall: analysisResult.score.overall,
        findingsCount: analysisResult.findings.length,
        recommendationsCount: report.recommendations.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return response(500, { error: message });
  }
};

/**
 * GET /report/{id} — Retrieves a stored report.
 * Path params: id (reportId)
 * Query params: format=markdown|json (default: json)
 */
export const getReportHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const reportId = event.pathParameters?.id;
    if (!reportId) {
      return response(400, { error: 'Report ID is required' });
    }

    const format = (event.queryStringParameters?.format || 'json') as 'markdown' | 'json';
    const bucket = process.env.REPORTS_BUCKET || 'auditor-reports';

    const content = await getStoredReport(reportId, format, { bucket });

    if (format === 'markdown') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/markdown' },
        body: content,
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: content,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('NoSuchKey') || message.includes('not found')) {
      return response(404, { error: 'Report not found' });
    }
    return response(500, { error: message });
  }
};

// Keep the original handler as default export for backward compatibility
export const handler = generateHandler;

function response(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export { generateReport } from './generator.js';
export type { ReportInput, GeneratedReport } from './generator.js';
