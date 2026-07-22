import type {
  AnalysisResult,
  Finding,
  ComplexityMetrics,
  DuplicationResult,
  MaturityResult,
  Recommendation,
} from '@auditor/shared';
import { recommendations as recommendationTemplates } from '@auditor/shared';
import { analyzeComplexity, analyzeDuplication, analyzeSecurity, analyzeMaturity } from './analyzers/index.js';
import { calculateISOScore } from './scoring/iso-scorer.js';

export interface OrchestratorInput {
  requestId: string;
  files: Map<string, string>;
  fileList: string[];
}

const CODE_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx']);

/**
 * Core analysis orchestrator. Runs all analyzers on the provided files
 * and calculates the ISO 25010 quality score.
 *
 * This function is independent of Lambda/S3/DynamoDB for testability.
 */
export async function runAnalysis(input: OrchestratorInput): Promise<AnalysisResult> {
  const { requestId, files, fileList } = input;

  // Filter to only code files for code analysis
  const codeFiles = new Map<string, string>();
  for (const [path, content] of files) {
    if (isCodeFile(path)) {
      codeFiles.set(path, content);
    }
  }

  const allFindings: Finding[] = [];
  let aggregatedComplexity: ComplexityMetrics | undefined;
  let duplicationResult: DuplicationResult | undefined;
  let maturityResults: MaturityResult[] | undefined;

  // 1. Run complexity analysis on each code file
  const complexityMetricsList: ComplexityMetrics[] = [];
  for (const [filename, sourceCode] of codeFiles) {
    const { metrics, findings } = analyzeComplexity(sourceCode, filename);
    complexityMetricsList.push(metrics);
    allFindings.push(...findings);
  }

  // Aggregate complexity metrics
  if (complexityMetricsList.length > 0) {
    aggregatedComplexity = aggregateComplexity(complexityMetricsList);
  }

  // 2. Run duplication analysis on all code files
  const { result: dupResult, findings: dupFindings } = await analyzeDuplication(codeFiles);
  duplicationResult = dupResult;
  allFindings.push(...dupFindings);

  // 3. Run security analysis on all code files
  const { findings: secFindings } = await analyzeSecurity(codeFiles);
  allFindings.push(...secFindings);

  // 4. Run maturity analysis on the full file list
  const maturityAnalysis = analyzeMaturity(fileList);
  maturityResults = maturityAnalysis.results;
  allFindings.push(...maturityAnalysis.findings);

  // 5. Calculate ISO score from all findings
  const score = calculateISOScore(allFindings);

  // 6. Generate recommendations from findings
  const recommendations = generateRecommendations(allFindings);

  return {
    requestId,
    timestamp: new Date().toISOString(),
    status: 'completed',
    findings: allFindings,
    recommendations,
    score,
    complexity: aggregatedComplexity,
    duplication: duplicationResult,
    maturity: maturityResults,
  };
}

function isCodeFile(filePath: string): boolean {
  const ext = getExtension(filePath);
  return CODE_EXTENSIONS.has(ext);
}

function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filePath.slice(lastDot).toLowerCase();
}

function aggregateComplexity(metricsList: ComplexityMetrics[]): ComplexityMetrics {
  const allFunctions = metricsList.flatMap((m) => m.functions);
  const complexities = allFunctions.map((f) => f.complexity);
  const total = complexities.reduce((sum, c) => sum + c, 0);
  const max = complexities.length > 0 ? Math.max(...complexities) : 0;
  const avg = complexities.length > 0 ? total / complexities.length : 0;

  return {
    file: '<aggregated>',
    functions: allFunctions,
    aggregate: { avg, max, total },
  };
}

function generateRecommendations(findings: Finding[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const finding of findings) {
    const template = recommendationTemplates.find(
      (t) => t.findingType === finding.rule || t.characteristic === finding.characteristic
    );

    if (template) {
      recommendations.push({
        id: `rec-${finding.id}`,
        findingId: finding.id,
        description: template.description,
        priority: template.priority,
        effort: template.effort,
        example: template.example,
      });
    }
  }

  return recommendations;
}
